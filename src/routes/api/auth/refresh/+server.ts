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
		return json({ status: 'error', message: (e as Error).message }, { status: 401 });
	}
};
