import { json } from '@sveltejs/kit';
import { verifyOtp } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { email, otp } = await request.json();

	if (!email || !otp) {
		return json({ status: 'error', message: 'email and otp are required' }, { status: 400 });
	}

	try {
		await verifyOtp(email, otp);
		return json({ status: 'success', message: 'Email verified successfully.' });
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 400 });
	}
};
