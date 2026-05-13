import { json } from '@sveltejs/kit';
import { resendOtp } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { email } = await request.json();

	if (!email) {
		return json({ status: 'error', message: 'email is required' }, { status: 400 });
	}

	try {
		await resendOtp(email);
		return json({ status: 'success', message: 'OTP resent to your email.' });
	} catch (e) {
		return json({ status: 'error', message: (e as Error).message }, { status: 400 });
	}
};
