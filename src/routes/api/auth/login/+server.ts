import { json } from '@sveltejs/kit';
import { login } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ status: 'error', message: 'email and password are required' }, { status: 400 });
	}

	try {
		const result = await login(email, password);
		return json({ status: 'success', ...result });
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 401 });
	}
};
