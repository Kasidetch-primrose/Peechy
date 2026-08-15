import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import { authUserStore } from '$lib/data/stores/authUser';
import AuthService from '$lib/data/services/auth';
import GameService from '$lib/data/services/game';
import type { IGame } from '$lib/data/interface/game';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ProfileTab = 'created' | 'liked';

interface ProfileState {
	loading: boolean;
	games: IGame[];
	likedLoading: boolean;
	likedGames: IGame[];
	activeTab: ProfileTab;
}

// ── Store ─────────────────────────────────────────────────────────────────────
const initial: ProfileState = {
	loading: true,
	games: [],
	likedLoading: true,
	likedGames: [],
	activeTab: 'created'
};

export const profileStore = writable<ProfileState>({ ...initial });

export const profileInitialsStore = derived(authUserStore, ($auth) => {
	const user = $auth.user;
	if (!user) return '';
	return (user.name ?? user.username)
		.split(' ')
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
});

export const profileStatsStore = derived(profileStore, ($profile) => ({
	totalLikes: $profile.games.reduce((sum, g) => sum + (g.likes ?? 0), 0),
	totalPlays: $profile.games.reduce((sum, g) => sum + (g.playCount ?? 0), 0)
}));

export function resetProfileStore() {
	profileStore.set({ ...initial });
}

// ── Actions ───────────────────────────────────────────────────────────────────
export async function loadGames(userId: number, viewerUserId?: number) {
	profileStore.update((s) => ({ ...s, loading: true }));
	try {
		const res = await GameService.paginate({ creatorId: userId, viewerUserId }, 1, 50);
		if (res.status === 'success') {
			profileStore.update((s) => ({ ...s, games: res.docs }));
		}
	} finally {
		profileStore.update((s) => ({ ...s, loading: false }));
	}
}

export async function loadLikedGames(userId: number, viewerUserId?: number) {
	profileStore.update((s) => ({ ...s, likedLoading: true }));
	try {
		const res = await GameService.paginate({ likedByUserId: userId, viewerUserId }, 1, 50);
		if (res.status === 'success') {
			profileStore.update((s) => ({ ...s, likedGames: res.docs }));
		}
	} finally {
		profileStore.update((s) => ({ ...s, likedLoading: false }));
	}
}

export function setActiveTab(tab: ProfileTab) {
	profileStore.update((s) => ({ ...s, activeTab: tab }));
}

export async function logout() {
	const { user, accessToken } = get(authUserStore);
	if (user) {
		await AuthService.logout(user.id, accessToken);
	}
	authUserStore.set({ accessToken: '', refreshToken: '', user: null });
	goto('/auth/login');
}
