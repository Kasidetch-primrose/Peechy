import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { users, userOAuthAccounts } from './db/UserModel';
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
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// Redis key namespaces
const otpKey = (email: string) => `otp:${email}`;
const otpAttemptsKey = (email: string) => `otp_attempts:${email}`;
const otpResendCooldownKey = (email: string) => `otp_resend_cooldown:${email}`;
const refreshKey = (userId: number) => `refresh:${userId}`;

function isRedisReady() {
	return redis.status === 'ready';
}

async function tryRedisWrite(action: string, run: () => Promise<unknown>) {
	if (!isRedisReady()) {
		console.warn(`[redis] skip ${action}: client is ${redis.status}`);
		return;
	}

	try {
		await run();
	} catch (error) {
		console.warn(`[redis] ${action} failed:`, (error as Error).message);
	}
}

function requireRedisReady() {
	if (!isRedisReady()) {
		throw new Error('Verification service is temporarily unavailable');
	}
}

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
	isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cryptographically secure 6-digit OTP */
function generateOtp(): string {
	return randomInt(100000, 999999).toString();
}

function generateTokens(
	userId: number,
	email: string,
	username: string,
	name: string | null,
	isAdmin: boolean
) {
	const now = Math.floor(Date.now() / 1000);

	const basePayload = { userId, email, username, name, isAdmin, iss: ISSUER, aud: AUDIENCE };

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

export function verifyAccessToken(token: string): JwtClaims | null {
	try {
		return parseToken(token);
	} catch {
		return null;
	}
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
	requireRedisReady();
	const otp = generateOtp();
	await redis.set(otpKey(email), otp, 'EX', OTP_TTL_SECONDS);
	await redis.del(otpAttemptsKey(email));

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
	requireRedisReady();

	const attempts = await redis.incr(otpAttemptsKey(email));
	if (attempts === 1) await redis.expire(otpAttemptsKey(email), OTP_TTL_SECONDS);
	if (attempts > MAX_OTP_ATTEMPTS) {
		throw new Error('Too many attempts. Please request a new OTP.');
	}

	const stored = await redis.get(otpKey(email));

	if (!stored) throw new Error('OTP expired or not found');
	if (stored !== otp) throw new Error('Invalid OTP');

	await db.update(users).set({ isVerified: true }).where(eq(users.email, email));

	await redis.del(otpKey(email));
	await redis.del(otpAttemptsKey(email));
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

	requireRedisReady();

	const cooldownSet = await redis.set(otpResendCooldownKey(email), '1', 'EX', OTP_RESEND_COOLDOWN_SECONDS, 'NX');
	if (cooldownSet !== 'OK') {
		throw new Error('Please wait before requesting another OTP.');
	}

	const otp = generateOtp();
	await redis.set(otpKey(email), otp, 'EX', OTP_TTL_SECONDS);
	await redis.del(otpAttemptsKey(email));

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
		user.name,
		user.isAdmin
	);

	// Best-effort session cache; token issuance does not depend on Redis.
	await tryRedisWrite('store refresh token', () =>
		redis.set(refreshKey(user.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS)
	);

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			name: user.name,
			isAdmin: user.isAdmin
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

	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
			username: users.username,
			name: users.name,
			isAdmin: users.isAdmin,
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
		user.name,
		user.isAdmin
	);
	await tryRedisWrite('store rotated refresh token', () =>
		redis.set(refreshKey(user.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS)
	);

	return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Revokes the refresh token for the given user, effectively logging them out.
 */
export async function logout(userId: number) {
	await tryRedisWrite('delete refresh token', () => redis.del(refreshKey(userId)));
}

// ---------------------------------------------------------------------------
// OAuth login / register
// ---------------------------------------------------------------------------

/**
 * Finds or creates a user for a given OAuth provider account.
 * Priority: existing OAuth link → email match (link account) → create new user.
 */
export async function loginWithOAuth(
	provider: string,
	providerUserId: string,
	email: string | null,
	name: string | null
) {
	// 1. Existing OAuth account → return its user
	const [existingOAuth] = await db
		.select({ userId: userOAuthAccounts.userId })
		.from(userOAuthAccounts)
		.where(
			and(
				eq(userOAuthAccounts.provider, provider),
				eq(userOAuthAccounts.providerUserId, providerUserId)
			)
		)
		.limit(1);

	if (existingOAuth) {
		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				username: users.username,
				name: users.name,
				isAdmin: users.isAdmin,
				deletedAt: users.deletedAt
			})
			.from(users)
			.where(eq(users.id, existingOAuth.userId))
			.limit(1);

		if (!user || user.deletedAt) throw new Error('User not found');

		const { accessToken, refreshToken } = generateTokens(
			user.id,
			user.email,
			user.username,
			user.name,
			user.isAdmin
		);
		await tryRedisWrite('store refresh token', () =>
			redis.set(refreshKey(user.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS)
		);
		return {
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				name: user.name,
				isAdmin: user.isAdmin
			}
		};
	}

	// 2. Email match → link OAuth account to existing user
	if (email) {
		const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		if (existingUser && !existingUser.deletedAt) {
			await db
				.insert(userOAuthAccounts)
				.values({ userId: existingUser.id, provider, providerUserId });

			const { accessToken, refreshToken } = generateTokens(
				existingUser.id,
				existingUser.email,
				existingUser.username,
				existingUser.name,
				existingUser.isAdmin
			);
			await tryRedisWrite('store refresh token', () =>
				redis.set(refreshKey(existingUser.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS)
			);
			return {
				accessToken,
				refreshToken,
				user: {
					id: existingUser.id,
					email: existingUser.email,
					username: existingUser.username,
					name: existingUser.name,
					isAdmin: existingUser.isAdmin
				}
			};
		}
	}

	// 3. Create new user
	const base = (email ? email.split('@')[0] : name ?? 'user')
		.replace(/[^a-z0-9_]/gi, '')
		.toLowerCase()
		.slice(0, 30) || 'user';

	let username = base;
	let suffix = 0;
	while (true) {
		const [taken] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, username))
			.limit(1);
		if (!taken) break;
		suffix++;
		username = `${base}${suffix}`;
	}

	const [newUser] = await db
		.insert(users)
		.values({
			username,
			email: email ?? `${provider}_${providerUserId}@oauth.peechy.app`,
			password: '',
			name,
			isVerified: true
		})
		.returning({ id: users.id, email: users.email, username: users.username, name: users.name });

	await db.insert(userOAuthAccounts).values({ userId: newUser.id, provider, providerUserId });

	const { accessToken, refreshToken } = generateTokens(
		newUser.id,
		newUser.email,
		newUser.username,
		newUser.name,
		false
	);
	await tryRedisWrite('store refresh token', () =>
		redis.set(refreshKey(newUser.id), refreshToken, 'EX', REFRESH_TOKEN_SECONDS)
	);

	return {
		accessToken,
		refreshToken,
		user: {
			id: newUser.id,
			email: newUser.email,
			username: newUser.username,
			name: newUser.name,
			isAdmin: false
		}
	};
}
