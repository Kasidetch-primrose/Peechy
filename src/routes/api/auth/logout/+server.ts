import { json } from '@sveltejs/kit';
import { logout, logoutWithRefreshToken, verifyAccessToken } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

/**
 * Revokes the session's refresh token. Accepts the refresh token in the body (works even after the
 * 24h access token has expired) and/or a Bearer access token.
 */
export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');
	const claims = authHeader?.startsWith('Bearer ') ? verifyAccessToken(authHeader.slice(7)) : null;
	const body = await request.json().catch(() => ({}));
	const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';

	try {
		const revokedByRefresh = refreshToken ? await logoutWithRefreshToken(refreshToken) : false;
		if (claims) await logout(claims);

		if (!claims && !revokedByRefresh) {
			return json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
		}
		return json({ status: 'success' });
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 500 });
	}
};
