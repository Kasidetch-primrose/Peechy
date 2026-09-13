import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	generateState,
	generateCodeVerifier,
	toCodeChallenge,
	storeState,
	googleAuthUrl,
	facebookAuthUrl,
	tiktokAuthUrl
} from '$lib/server/oauth';

const PROVIDERS = ['google', 'facebook', 'tiktok'] as const;

export const GET: RequestHandler = async ({ params, url }) => {
	const { provider } = params;

	if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) {
		return new Response('Unknown provider', { status: 400 });
	}

	const state = generateState();
	const redirectUri = `${url.origin}/api/auth/oauth/${provider}/callback`;

	let authUrl: string;
	if (provider === 'google') {
		await storeState(state, provider);
		authUrl = googleAuthUrl(redirectUri, state);
	} else if (provider === 'facebook') {
		await storeState(state, provider);
		authUrl = facebookAuthUrl(redirectUri, state);
	} else {
		// TikTok requires PKCE
		const codeVerifier = generateCodeVerifier();
		await storeState(state, provider, codeVerifier);
		authUrl = tiktokAuthUrl(redirectUri, state, toCodeChallenge(codeVerifier));
	}

	throw redirect(302, authUrl);
};
