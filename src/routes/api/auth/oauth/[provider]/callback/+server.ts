import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	validateState,
	exchangeGoogleCode,
	fetchGoogleUser,
	exchangeFacebookCode,
	fetchFacebookUser,
	exchangeTiktokCode,
	fetchTiktokUser,
	createTicket
} from '$lib/server/oauth';
import { loginWithOAuth } from '$lib/server/auth-service';

export const GET: RequestHandler = async ({ params, url }) => {
	const { provider } = params;
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code || !state || url.searchParams.get('error')) {
		throw redirect(302, '/auth/login?error=oauth_cancelled');
	}

	const { valid, codeVerifier } = await validateState(state, provider);
	if (!valid) {
		throw redirect(302, '/auth/login?error=oauth_invalid_state');
	}

	const redirectUri = `${url.origin}/api/auth/oauth/${provider}/callback`;

	try {
		let providerUserId: string;
		let email: string | null = null;
		let name: string | null = null;

		if (provider === 'google') {
			const tokens = await exchangeGoogleCode(code, redirectUri);
			const userInfo = await fetchGoogleUser(tokens.access_token);
			providerUserId = userInfo.id;
			email = userInfo.email;
			name = userInfo.name;
		} else if (provider === 'facebook') {
			const tokens = await exchangeFacebookCode(code, redirectUri);
			const userInfo = await fetchFacebookUser(tokens.access_token);
			providerUserId = userInfo.id;
			email = userInfo.email ?? null;
			name = userInfo.name;
		} else if (provider === 'tiktok') {
			if (!codeVerifier) throw redirect(302, '/auth/login?error=oauth_invalid_state');
			const tokens = await exchangeTiktokCode(code, redirectUri, codeVerifier);
			const userInfo = await fetchTiktokUser(tokens.access_token);
			providerUserId = userInfo.open_id;
			email = null; // TikTok's Login Kit does not expose email
			name = userInfo.display_name ?? null;
		} else {
			throw redirect(302, '/auth/login?error=unknown_provider');
		}

		const result = await loginWithOAuth(provider, providerUserId!, email, name);
		const ticket = await createTicket(result);

		throw redirect(302, `/auth/oauth-callback?ticket=${ticket}`);
	} catch (e) {
		// Re-throw SvelteKit redirects
		if (e && typeof (e as { status?: number }).status === 'number') throw e;
		console.error('[oauth] callback error:', e);
		throw redirect(302, '/auth/login?error=oauth_failed');
	}
};
