import { goto } from '$app/navigation';
import AuthService from '$lib/data/services/auth';
import { get, writable } from 'svelte/store';

interface IRegisterStore {
	username: string;
	email: string;
	password: string;
	name: string;
	error: string;
	loading: boolean;
}

const initial: IRegisterStore = {
	username: '',
	email: '',
	password: '',
	name: '',
	error: '',
	loading: false
};

export const registerStore = writable<IRegisterStore>(initial);

export const handleRegister = async (e: Event) => {
	e.preventDefault();
	const { username, email, password, name } = get(registerStore);

	registerStore.update((s) => ({ ...s, error: '', loading: true }));

	const result = await AuthService.register(username, email, password, name);

	registerStore.update((s) => ({ ...s, loading: false }));

	if (result.status === 'success') {
		goto(`/demo/auth/otp?email=${encodeURIComponent(email)}`);
	} else {
		registerStore.update((s) => ({ ...s, error: result.message ?? 'Registration failed' }));
	}
};
