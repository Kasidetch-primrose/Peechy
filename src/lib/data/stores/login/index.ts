import { goto } from '$app/navigation';
import AuthService from '$lib/data/services/auth';
import { get, writable } from 'svelte/store';
import { authUserStore } from '$lib/data/stores/authUser';

interface ILoginStore {
	email: string;
	password: string;
	error: string;
	loading: boolean;
}

const initial: ILoginStore = {
	email: '',
	password: '',
	error: '',
	loading: false
};

export const loginStore = writable<ILoginStore>(initial);

export const handleLogin = async (e: Event) => {
	e.preventDefault();
	const { email, password } = get(loginStore);

	loginStore.update((s) => ({ ...s, error: '', loading: true }));

	const result = await AuthService.login(email, password);

	loginStore.update((s) => ({ ...s, loading: false }));

	if (result.status === 'success') {
		authUserStore.set({
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
			user: result.user
		});
		goto('/demo/auth/dashboard');
	} else {
		loginStore.update((s) => ({ ...s, error: result.message ?? 'Login failed' }));
	}
};
