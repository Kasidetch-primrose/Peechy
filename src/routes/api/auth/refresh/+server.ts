import { json } from '@sveltejs/kit';
import { refreshAccessToken } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { refreshToken } = await request.json();

	if (!refreshToken) {
		return json({ status: 'error', message: 'refreshToken is required' }, { status: 400 });
	}

	try {
		const result = await refreshAccessToken(refreshToken);
		return json({ status: 'success', ...result });
	} catch (e) {
		const message = (e as Error).message;
		const status =
			message === 'Invalid or expired refresh token' ||
			message === 'User not found' ||
			message === 'Refresh token revoked'
				? 401
				: 500;

		return json({ status: 'error', message }, { status });
	}
};
