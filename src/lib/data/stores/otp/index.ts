import { goto } from '$app/navigation';
import AuthService from '$lib/data/services/auth';
import { get, writable } from 'svelte/store';

interface IOtpStore {
	otp: string;
	error: string;
	loading: boolean;
	resendLoading: boolean;
	resendMessage: string;
}

const initial: IOtpStore = {
	otp: '',
	error: '',
	loading: false,
	resendLoading: false,
	resendMessage: ''
};

export const otpStore = writable<IOtpStore>(initial);

export const handleVerifyOtp = async (e: Event, email: string) => {
	e.preventDefault();
	const { otp } = get(otpStore);

	otpStore.update((s) => ({ ...s, error: '', loading: true }));

	const result = await AuthService.verifyOtp(email, otp);

	otpStore.update((s) => ({ ...s, loading: false }));

	if (result.status === 'success') {
		goto('/demo/auth/login');
	} else {
		otpStore.update((s) => ({ ...s, error: result.message ?? 'Invalid OTP' }));
	}
};

export const handleResendOtp = async (email: string) => {
	otpStore.update((s) => ({ ...s, resendLoading: true, resendMessage: '' }));

	const result = await AuthService.resendOtp(email);

	otpStore.update((s) => ({
		...s,
		resendLoading: false,
		resendMessage:
			result.status === 'success'
				? 'OTP resent! Check your inbox.'
				: (result.message ?? 'Failed to resend')
	}));
};
