import { randomBytes, createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { redis } from './utils/redis';

const STATE_TTL = 5 * 60; // 5 minutes
const TICKET_TTL = 60; // 1 minute

const stateKey = (state: string) => `oauth:state:${state}`;
const ticketKey = (ticket: string) => `oauth:ticket:${ticket}`;

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

export function generateState(): string {
	return randomBytes(32).toString('hex');
}

/** PKCE code_verifier (TikTok requires PKCE on its authorize flow). */
export function generateCodeVerifier(): string {
	return randomBytes(32).toString('base64url');
}

export function toCodeChallenge(codeVerifier: string): string {
	return createHash('sha256').update(codeVerifier).digest('base64url');
}

export async function storeState(state: string, provider: string, codeVerifier?: string) {
	await redis.set(stateKey(state), JSON.stringify({ provider, codeVerifier }), 'EX', STATE_TTL);
}

export async function validateState(
	state: string,
	provider: string
): Promise<{ valid: boolean; codeVerifier?: string }> {
	const stored = await redis.get(stateKey(state));
	if (!stored) return { valid: false };

	let parsed: { provider: string; codeVerifier?: string };
	try {
		parsed = JSON.parse(stored);
	} catch {
		return { valid: false };
	}

	if (parsed.provider !== provider) return { valid: false };
	await redis.del(stateKey(state));
	return { valid: true, codeVerifier: parsed.codeVerifier };
}

export async function createTicket(data: object): Promise<string> {
	const ticket = randomBytes(32).toString('hex');
	await redis.set(ticketKey(ticket), JSON.stringify(data), 'EX', TICKET_TTL);
	return ticket;
}

export async function consumeTicket(ticket: string): Promise<object | null> {
	const data = await redis.get(ticketKey(ticket));
	if (!data) return null;
	await redis.del(ticketKey(ticket));
	return JSON.parse(data);
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export function googleAuthUrl(redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: requireEnv('GOOGLE_CLIENT_ID'),
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'online'
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: requireEnv('GOOGLE_CLIENT_ID'),
			client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});
	if (!res.ok) throw new Error('Failed to exchange Google code');
	return res.json() as Promise<{ access_token: string }>;
}

export async function fetchGoogleUser(accessToken: string) {
	const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error('Failed to fetch Google user info');
	return res.json() as Promise<{ id: string; email: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Facebook
// ---------------------------------------------------------------------------

export function facebookAuthUrl(redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: requireEnv('FACEBOOK_CLIENT_ID'),
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'email,public_profile',
		state
	});
	return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

export async function exchangeFacebookCode(code: string, redirectUri: string) {
	const params = new URLSearchParams({
		code,
		client_id: requireEnv('FACEBOOK_CLIENT_ID'),
		client_secret: requireEnv('FACEBOOK_CLIENT_SECRET'),
		redirect_uri: redirectUri
	});
	const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
	if (!res.ok) throw new Error('Failed to exchange Facebook code');
	return res.json() as Promise<{ access_token: string }>;
}

export async function fetchFacebookUser(accessToken: string) {
	const res = await fetch(
		`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
	);
	if (!res.ok) throw new Error('Failed to fetch Facebook user info');
	return res.json() as Promise<{ id: string; name: string; email?: string }>;
}

// ---------------------------------------------------------------------------
// TikTok
// ---------------------------------------------------------------------------

export function tiktokAuthUrl(redirectUri: string, state: string, codeChallenge: string): string {
	const params = new URLSearchParams({
		client_key: requireEnv('TIKTOK_CLIENT_KEY'),
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'user.info.basic',
		state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256'
	});
	return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export async function exchangeTiktokCode(code: string, redirectUri: string, codeVerifier: string) {
	const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Cache-Control': 'no-cache'
		},
		body: new URLSearchParams({
			client_key: requireEnv('TIKTOK_CLIENT_KEY'),
			client_secret: requireEnv('TIKTOK_CLIENT_SECRET'),
			code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri,
			code_verifier: codeVerifier
		})
	});
	if (!res.ok) throw new Error('Failed to exchange TikTok code');
	const data = (await res.json()) as { access_token?: string; open_id?: string; error?: string };
	if (!data.access_token) throw new Error(`TikTok token exchange failed: ${data.error ?? 'unknown error'}`);
	return data as { access_token: string; open_id: string };
}

export async function fetchTiktokUser(accessToken: string) {
	const params = new URLSearchParams({ fields: 'open_id,union_id,avatar_url,display_name' });
	const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?${params}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error('Failed to fetch TikTok user info');
	const body = (await res.json()) as {
		data?: { user?: { open_id: string; union_id?: string; display_name?: string; avatar_url?: string } };
		error?: { code: string; message: string };
	};
	if (!body.data?.user) throw new Error(`Failed to fetch TikTok user info: ${body.error?.message ?? 'unknown error'}`);
	return body.data.user;
}
