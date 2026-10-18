import type { IAuthUser } from '$lib/data/interface/auth';
import { get, writable } from 'svelte/store';

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

/** Merges fresh public profile fields (e.g. avatar) into the stored user; sessions saved before a change may be stale. */
export function patchAuthUser(patch: Partial<IAuthUser>) {
	authUserStore.update((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
}

export async function syncAuthUserProfile() {
	const user = get(authUserStore).user;
	if (!user) return;
	try {
		const res = await fetch(`/api/users/${user.id}`);
		if (!res.ok) return;
		const { doc } = await res.json();
		if (doc && get(authUserStore).user?.id === doc.id) {
			patchAuthUser({ name: doc.name, avatarUrl: doc.avatarUrl, avatarCrop: doc.avatarCrop });
		}
	} catch {
		// offline / server down — keep the cached user
	}
}
