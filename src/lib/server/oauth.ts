import { randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { redis } from './utils/redis';

const STATE_TTL = 5 * 60; // 5 minutes
const TICKET_TTL = 60; // 1 minute

const stateKey = (state: string) => `oauth:state:${state}`;
const ticketKey = (ticket: string) => `oauth:ticket:${ticket}`;

export function generateState(): string {
	return randomBytes(32).toString('hex');
}

export async function storeState(state: string, provider: string) {
	await redis.set(stateKey(state), provider, 'EX', STATE_TTL);
}

export async function validateState(state: string, provider: string): Promise<boolean> {
	const stored = await redis.get(stateKey(state));
	if (!stored || stored !== provider) return false;
	await redis.del(stateKey(state));
	return true;
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
		client_id: env.GOOGLE_CLIENT_ID,
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
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
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
		client_id: env.FACEBOOK_CLIENT_ID,
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
		client_id: env.FACEBOOK_CLIENT_ID,
		client_secret: env.FACEBOOK_CLIENT_SECRET,
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
