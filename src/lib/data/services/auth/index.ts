import type {
	IBaseResponse,
	ILoginResponse,
	IRefreshResponse
} from '$lib/data/interface/auth';

export default class AuthService {
	static async register(
		username: string,
		email: string,
		password: string,
		name?: string
	): Promise<IBaseResponse> {
		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, email, password, name })
		});
		return res.json();
	}

	static async verifyOtp(email: string, otp: string): Promise<IBaseResponse> {
		const res = await fetch('/api/auth/verify-otp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, otp })
		});
		return res.json();
	}

	static async resendOtp(email: string): Promise<IBaseResponse> {
		const res = await fetch('/api/auth/resend-otp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		return res.json();
	}

	static async login(email: string, password: string): Promise<ILoginResponse> {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
		return res.json();
	}

	static async refresh(refreshToken: string): Promise<IRefreshResponse> {
		const res = await fetch('/api/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken })
		});
		return res.json();
	}

	static async logout(userId: number, accessToken: string): Promise<void> {
		await fetch('/api/auth/logout', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ userId })
		});
	}
}
