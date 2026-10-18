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

// Another tab logged in/out or rotated the tokens — adopt them so this tab doesn't keep a stale pair.
if (browser) {
	window.addEventListener('storage', (e) => {
		if (e.key !== STORAGE_KEY) return;
		try {
			authUserStore.set(e.newValue ? JSON.parse(e.newValue) : initial);
		} catch {
			authUserStore.set(initial);
		}
	});
}

// ── Token refresh ─────────────────────────────────────────────────────────────
/** Renew this many seconds before the access token actually expires. */
const EXPIRY_SKEW_SECONDS = 60;

function isExpired(token: string): boolean {
	try {
		const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
		return typeof payload.exp !== 'number' || payload.exp - EXPIRY_SKEW_SECONDS < Date.now() / 1000;
	} catch {
		return true;
	}
}

let refreshing: Promise<string | null> | null = null;

/**
 * Trades the refresh token for a new pair and stores it. Concurrent callers share one request.
 * Returns the new access token, or null. A rejected refresh token ends the session (logged out).
 */
export function refreshSession(): Promise<string | null> {
	refreshing ??= (async () => {
		const { refreshToken } = get(authUserStore);
		if (!refreshToken) return null;
		try {
			const res = await fetch('/api/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken })
			});
			if (res.status === 401) {
				authUserStore.update((s) => (s.refreshToken === refreshToken ? initial : s));
				return null;
			}
			const data = await res.json();
			if (!res.ok || !data.accessToken) return null;
			authUserStore.update((s) =>
				s.refreshToken === refreshToken
					? { ...s, accessToken: data.accessToken, refreshToken: data.refreshToken ?? s.refreshToken }
					: s
			);
			return data.accessToken as string;
		} catch {
			return null; // offline — keep the session, the caller gets its original error
		}
	})().finally(() => {
		refreshing = null;
	});
	return refreshing;
}

/**
 * fetch() that sends the logged-in user's Bearer token. Renews an expired access token
 * before sending and, on a 401, renews once and retries.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
	let token = get(authUserStore).accessToken;
	if (token && isExpired(token)) token = (await refreshSession()) ?? get(authUserStore).accessToken;

	const send = (t: string) => {
		const headers = new Headers(init.headers);
		if (t) headers.set('Authorization', `Bearer ${t}`);
		return fetch(input, { ...init, headers });
	};

	const res = await send(token);
	if (res.status !== 401 || !token) return res;
	const renewed = await refreshSession();
	return renewed ? send(renewed) : res;
}

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
			patchAuthUser({
				name: doc.name,
				username: doc.username,
				avatarUrl: doc.avatarUrl,
				avatarCrop: doc.avatarCrop
			});
		}
	} catch {
		// offline / server down — keep the cached user
	}
}
