import { json } from '@sveltejs/kit';
import { logout } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { userId } = await request.json();

	if (!userId) {
		return json({ status: 'error', message: 'userId is required' }, { status: 400 });
	}

	try {
		await logout(userId);
		return json({ status: 'success' });
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 500 });
	}
};
