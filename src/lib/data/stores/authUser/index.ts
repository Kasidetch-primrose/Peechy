import type { IAuthUser } from '$lib/data/interface/auth';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'peechy_auth';

const browser = typeof window !== 'undefined';

interface IAuthUserStore {
	accessToken: string;
	refreshToken: string;
	user: IAuthUser | null;
}

const initial: IAuthUserStore = { accessToken: '', refreshToken: '', user: null };

function loadFromStorage(): IAuthUserStore {
	if (!browser) return initial;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : initial;
	} catch {
		return initial;
	}
}

export const authUserStore = writable<IAuthUserStore>(loadFromStorage());

authUserStore.subscribe((state) => {
	if (!browser) return;
	if (state.user) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} else {
		localStorage.removeItem(STORAGE_KEY);
	}
});
