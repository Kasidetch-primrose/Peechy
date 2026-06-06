import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateState, storeState, googleAuthUrl, facebookAuthUrl } from '$lib/server/oauth';

export const GET: RequestHandler = async ({ params, url }) => {
	const { provider } = params;

	if (provider !== 'google' && provider !== 'facebook') {
		return new Response('Unknown provider', { status: 400 });
	}

	const state = generateState();
	await storeState(state, provider);

	const redirectUri = `${url.origin}/api/auth/oauth/${provider}/callback`;
	const authUrl =
		provider === 'google' ? googleAuthUrl(redirectUri, state) : facebookAuthUrl(redirectUri, state);

	throw redirect(302, authUrl);
};
