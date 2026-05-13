import { json } from '@sveltejs/kit';
import { register } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { username, email, password, name } = await request.json();

	if (!username || !email || !password) {
		return json(
			{ status: 'error', message: 'username, email, and password are required' },
			{ status: 400 }
		);
	}

	try {
		await register(username, email, password, name);
		return json(
			{ status: 'success', message: 'Registration successful. OTP sent to your email.' },
			{ status: 201 }
		);
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 400 });
	}
};
