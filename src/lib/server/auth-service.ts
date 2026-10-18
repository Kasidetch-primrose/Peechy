import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
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
/** One key per login session (sid), so logging in on another device doesn't end this one. */
const refreshKey = (userId: number, sid: string) => `refresh:${userId}:${sid}`;
/** The token that was just rotated out — still accepted briefly so two tabs refreshing at once both succeed. */
const refreshPrevKey = (userId: number, sid: string) => `refresh_prev:${userId}:${sid}`;
/** Pre-sid single-session key; only cleaned up on logout now. */
const legacyRefreshKey = (userId: number) => `refresh:${userId}`;
const REFRESH_GRACE_SECONDS = 30;

/**
 * KEYS: refresh, refresh_prev. ARGV: presented token, new token, refresh TTL, grace TTL.
 * Presented == current, or nothing stored (the login-time write was lost) → store the new token,
 * keep the presented one as prev → {'rotated'}.
 * Presented == prev (inside the grace window) → no rotation, hand back the current token → {'grace', current}.
 * Anything else (logged out, or an older rotated-out token) → {'revoked'}.
 */
const ROTATE_REFRESH_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if cur == ARGV[1] or not cur then
	redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
	redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[4])
	return {'rotated'}
end
if cur and redis.call('GET', KEYS[2]) == ARGV[1] then
	return {'grace', cur}
end
return {'revoked'}
`;

/**
 * KEYS: refresh, refresh_prev. ARGV: presented token ('' = any), TTL.
 * Revokes only if the token is still live. Leaves a 'revoked' marker so a logged-out session
 * differs from one whose token was never stored.
 */
const REVOKE_REFRESH_SCRIPT = `
if ARGV[1] == '' or redis.call('GET', KEYS[1]) == ARGV[1] or redis.call('GET', KEYS[2]) == ARGV[1] then
	redis.call('SET', KEYS[1], 'revoked', 'EX', ARGV[2])
	redis.call('DEL', KEYS[2])
	return 1
end
return 0
`;

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

/** Records a new login session's refresh token. */
async function storeRefreshToken(userId: number, sid: string, refreshToken: string) {
	// Not gated on 'ready': right after a cold start the client is still connecting and the
	// offline queue sends this once connected. A lost write is tolerated by the rotate script.
	try {
		await redis.set(refreshKey(userId, sid), refreshToken, 'EX', REFRESH_TOKEN_SECONDS);
	} catch (error) {
		console.warn('[redis] store refresh token failed:', (error as Error).message);
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
	/** Which token this is. Tokens issued before this claim existed have none. */
	typ?: 'access' | 'refresh';
	/** Login session id, shared by a session's access and refresh tokens. Absent on older tokens. */
	sid?: string;
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
	isAdmin: boolean,
	sid: string = randomUUID()
) {
	const basePayload = { userId, email, username, name, isAdmin, sid, iss: ISSUER, aud: AUDIENCE };

	const accessToken = jwt.sign(
		{ ...basePayload, typ: 'access', sub: `${AUDIENCE}:${userId}` },
		SECRET_KEY,
		{ expiresIn: ACCESS_TOKEN_SECONDS }
	);

	const refreshToken = jwt.sign(
		{ ...basePayload, typ: 'refresh', sub: `${AUDIENCE}:${userId}` },
		SECRET_KEY,
		{ expiresIn: REFRESH_TOKEN_SECONDS, jwtid: randomUUID() } // unique even when rotated twice in one second
	);

	return { accessToken, refreshToken, sid };
}

function parseToken(token: string): JwtClaims {
	return jwt.verify(token, SECRET_KEY, {
		issuer: ISSUER,
		audience: AUDIENCE
	}) as unknown as JwtClaims;
}

export function verifyAccessToken(token: string): JwtClaims | null {
	try {
		const claims = parseToken(token);
		// A 90-day refresh token must not work as a Bearer access token.
		return claims.typ === 'refresh' ? null : claims;
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

	const { accessToken, refreshToken, sid } = generateTokens(
		user.id,
		user.email,
		user.username,
		user.name,
		user.isAdmin
	);

	await storeRefreshToken(user.id, sid, refreshToken);

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			name: user.name,
			isAdmin: user.isAdmin,
			avatarUrl: user.avatarUrl,
			avatarCrop: user.avatarCrop
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
	if (payload.typ === 'access') throw new Error('Invalid or expired refresh token');

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

	// Token from before per-session ids: nothing in Redis to check it against. Move it onto a new
	// session so it becomes revocable; these stop existing once the last one expires.
	if (!payload.sid) {
		const fresh = generateTokens(user.id, user.email, user.username, user.name, user.isAdmin);
		await storeRefreshToken(user.id, fresh.sid, fresh.refreshToken);
		return { accessToken: fresh.accessToken, refreshToken: fresh.refreshToken };
	}

	const { accessToken, refreshToken, sid } = generateTokens(
		user.id,
		user.email,
		user.username,
		user.name,
		user.isAdmin,
		payload.sid
	);

	let result: [string, string?];
	try {
		result = (await redis.eval(
			ROTATE_REFRESH_SCRIPT,
			2,
			refreshKey(user.id, payload.sid),
			refreshPrevKey(user.id, payload.sid),
			token,
			refreshToken,
			REFRESH_TOKEN_SECONDS,
			REFRESH_GRACE_SECONDS
		)) as [string, string?];
	} catch (error) {
		// Redis unreachable: can't check or rotate. Keep the presented refresh token (it stays the
		// stored one) and only renew the access token.
		console.warn('[redis] refresh token check failed:', (error as Error).message);
		return { accessToken, refreshToken: token };
	}

	if (result[0] === 'rotated') return { accessToken, refreshToken };
	// Another tab rotated this token a moment ago — join its session instead of logging this one out.
	if (result[0] === 'grace' && result[1]) return { accessToken, refreshToken: result[1] };
	throw new Error('Refresh token revoked');
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

function revokeSession(userId: number, sid: string, token = '') {
	return tryRedisWrite('revoke refresh token', () =>
		redis.eval(
			REVOKE_REFRESH_SCRIPT,
			2,
			refreshKey(userId, sid),
			refreshPrevKey(userId, sid),
			token,
			REFRESH_TOKEN_SECONDS
		)
	);
}

/**
 * Ends the login session the given access token belongs to (other devices stay logged in).
 */
export async function logout(claims: JwtClaims) {
	if (claims.sid) await revokeSession(claims.userId, claims.sid);
	else await tryRedisWrite('delete refresh token', () => redis.del(legacyRefreshKey(claims.userId)));
}

/**
 * Logs out using the refresh token itself, so a session whose access token has expired can still revoke it.
 * Only revokes when the token is the session's live one. Returns false when the token is not a validly signed refresh token.
 */
export async function logoutWithRefreshToken(token: string): Promise<boolean> {
	let payload: JwtClaims;
	try {
		payload = parseToken(token);
	} catch {
		return false;
	}
	if (payload.typ === 'access') return false;

	if (payload.sid) await revokeSession(payload.userId, payload.sid, token);
	return true;
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
				avatarUrl: users.avatarUrl,
				avatarCrop: users.avatarCrop,
				deletedAt: users.deletedAt
			})
			.from(users)
			.where(eq(users.id, existingOAuth.userId))
			.limit(1);

		if (!user || user.deletedAt) throw new Error('User not found');

		const { accessToken, refreshToken, sid } = generateTokens(
			user.id,
			user.email,
			user.username,
			user.name,
			user.isAdmin
		);
		await storeRefreshToken(user.id, sid, refreshToken);
		return {
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				name: user.name,
				isAdmin: user.isAdmin,
				avatarUrl: user.avatarUrl,
				avatarCrop: user.avatarCrop
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

			const { accessToken, refreshToken, sid } = generateTokens(
				existingUser.id,
				existingUser.email,
				existingUser.username,
				existingUser.name,
				existingUser.isAdmin
			);
			await storeRefreshToken(existingUser.id, sid, refreshToken);
			return {
				accessToken,
				refreshToken,
				user: {
					id: existingUser.id,
					email: existingUser.email,
					username: existingUser.username,
					name: existingUser.name,
					isAdmin: existingUser.isAdmin,
					avatarUrl: existingUser.avatarUrl,
					avatarCrop: existingUser.avatarCrop
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

	const { accessToken, refreshToken, sid } = generateTokens(
		newUser.id,
		newUser.email,
		newUser.username,
		newUser.name,
		false
	);
	await storeRefreshToken(newUser.id, sid, refreshToken);

	return {
		accessToken,
		refreshToken,
		user: {
			id: newUser.id,
			email: newUser.email,
			username: newUser.username,
			name: newUser.name,
			isAdmin: false,
			avatarUrl: null,
			avatarCrop: null
		}
	};
}
