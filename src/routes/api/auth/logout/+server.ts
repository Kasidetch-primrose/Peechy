import { json } from '@sveltejs/kit';
import { logout, verifyAccessToken } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');
	const claims = authHeader?.startsWith('Bearer ') ? verifyAccessToken(authHeader.slice(7)) : null;

	if (!claims) {
		return json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
	}

	try {
		await logout(claims.userId);
		return json({ status: 'success' });
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 500 });
	}
};
