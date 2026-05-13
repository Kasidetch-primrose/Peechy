import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { users } from './db/UserModel';
import { redis } from './utils/redis';
import { mailer } from './utils/mailer';

// ---------------------------------------------------------------------------
// Config guard — reuse the single app secret (no extra env vars needed)
// ---------------------------------------------------------------------------

if (!env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');

const SECRET_KEY = env.BETTER_AUTH_SECRET;
const ISSUER = 'https://peechy.app';
const AUDIENCE = 'peechy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const ACCESS_TOKEN_SECONDS = 24 * 60 * 60; // 24 hours (matches Go)
const REFRESH_TOKEN_SECONDS = 90 * 24 * 60 * 60; // 90 days (matches Go)

// Redis key namespaces
const otpKey = (email: string) => `otp:${email}`;
const refreshKey = (userId: number) => `refresh:${userId}`;

// ---------------------------------------------------------------------------
// Claims shape (mirrors Go's Claims struct)
// ---------------------------------------------------------------------------

export interface JwtClaims {
	// Registered claims
	iss: string; // issuer
	aud: string; // audience
	sub: string; // "peechy:<userId>"
	iat: number;
	exp: number;
	// Custom claims
	userId: number;
	email: string;
	username: string;
	name: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cryptographically secure 6-digit OTP */
function generateOtp(): string {
	return randomInt(100000, 999999).toString();
}

function generateTokens(userId: number, email: string, username: string, name: string | null) {
	const now = Math.floor(Date.now() / 1000);

	const basePayload = { userId, email, username, name, iss: ISSUER, aud: AUDIENCE };

	const accessToken = jwt.sign({ ...basePayload, sub: `${AUDIENCE}:${userId}` }, SECRET_KEY, {
		expiresIn: ACCESS_TOKEN_SECONDS
	});

	const refreshToken = jwt.sign({ ...basePayload, sub: `${AUDIENCE}:${userId}` }, SECRET_KEY, {
		expiresIn: REFRESH_TOKEN_SECONDS
	});

	return { accessToken, refreshToken };
}

function parseToken(token: string): JwtClaims {
	return jwt.verify(token, SECRET_KEY, {
		issuer: ISSUER,
		audience: AUDIENCE
	}) as unknown as JwtClaims;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

/**
 * Creates a new unverified user, stores an OTP in Redis,
 * and sends a verification email.
 */
export async function register(username: string, email: string, password: string, name?: string) {
	// Check for existing email / username
	const [existingEmail] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existingEmail) throw new Error('Email already in use');

	const [existingUsername] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username))
		.limit(1);

	if (existingUsername) throw new Error('Username already taken');

	const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

	const [user] = await db
		.insert(users)
		.values({ username, email, password: hashedPassword, name, isVerified: false })
		.returning({ id: users.id, email: users.email, username: users.username });

	// Generate & store OTP
	const otp = generateOtp();
	await redis.set(otpKey(email), otp, 'EX', OTP_TTL_SECONDS);

	// Send verification email
	await mailer.sendMail({
		from: env.SMTP_FROM,
		to: email,
		subject: 'Your Peechy verification code',
		text: `Your OTP is: ${otp}\n\nIt expires in 10 minutes.`,
		html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`
	});

	return user;
}

// ---------------------------------------------------------------------------
// Verify OTP
// ---------------------------------------------------------------------------

/**
 * Validates the OTP for the given email.
 * On success, marks the user as verified and deletes the OTP.
 */
export async function verifyOtp(email: string, otp: string) {
	const stored = await redis.get(otpKey(email));

	if (!stored) throw new Error('OTP expired or not found');
	if (stored !== otp) throw new Error('Invalid OTP');

	await db.update(users).set({ isVerified: true }).where(eq(users.email, email));

	await redis.del(otpKey(email));
}

// ---------------------------------------------------------------------------
// Resend OTP
// ---------------------------------------------------------------------------

/**
 * Regenerates and re-sends the OTP for an unverified user.
 */
export async function resendOtp(email: string) {
	const [user] = await db
		.select({ id: users.id, isVerified: users.isVerified })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user) throw new Error('User not found');
	if (user.isVerified) throw new Error('Email is already verified');

	const otp = generateOtp();
	await redis.set(otpKey(email), otp, 'EX', OTP_TTL_SECONDS);

	await mailer.sendMail({
		from: env.SMTP_FROM,
		to: email,
		subject: 'Your Peechy verification code',
		text: `Your OTP is: ${otp}\n\nIt expires in 10 minutes.`,
		html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`
	});
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Authenticates a user by email + password.
 * Returns an access token, a refresh token, and basic user info.
 */
export async function login(email: string, password: string) {
	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

	// Use the same error message for both "not found" and "wrong password"
	// to avoid user enumeration.
	if (!user || user.deletedAt) throw new Error('Invalid credentials');

	if (!user.isVerified) throw new Error('Email not verified. Please check your inbox for the OTP.');

	const passwordMatch = await bcrypt.compare(password, user.password);
	if (!passwordMatch) throw new Error('Invalid credentials');

	const { accessToken, refreshToken } = generateTokens(
		user.id,
		user.email,
		user.username,
		user.name
	);

	// Store refresh token in Redis (one active session per user)
	await redis.set(refreshKey(user.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS);

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			name: user.name
		}
	};
}

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

/**
 * Validates a refresh token, rotates it, and returns a new token pair.
 * Uses the same SECRET_KEY as access tokens (mirrors Go's single-secret approach).
 */
export async function refreshAccessToken(token: string) {
	let payload: JwtClaims;

	try {
		payload = parseToken(token);
	} catch {
		throw new Error('Invalid or expired refresh token');
	}

	// Verify the token matches what we stored (rotation / revocation check)
	const stored = await redis.get(refreshKey(payload.userId));
	if (stored !== token) throw new Error('Refresh token revoked');

	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
			username: users.username,
			name: users.name,
			deletedAt: users.deletedAt
		})
		.from(users)
		.where(eq(users.id, payload.userId))
		.limit(1);

	if (!user || user.deletedAt) throw new Error('User not found');

	// Rotate: invalidate old token, issue fresh pair
	const { accessToken, refreshToken } = generateTokens(
		user.id,
		user.email,
		user.username,
		user.name
	);
	await redis.set(refreshKey(user.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS);

	return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Revokes the refresh token for the given user, effectively logging them out.
 */
export async function logout(userId: number) {
	await redis.del(refreshKey(userId));
}
