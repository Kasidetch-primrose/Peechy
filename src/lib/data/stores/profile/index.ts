import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import { authUserStore } from '$lib/data/stores/authUser';
import AuthService from '$lib/data/services/auth';
import GameService from '$lib/data/services/game';
import type { IGame } from '$lib/data/interface/game';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProfileState {
	loading: boolean;
	games: IGame[];
}

// ── Store ─────────────────────────────────────────────────────────────────────
const initial: ProfileState = {
	loading: true,
	games: []
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
export async function loadGames(userId: number) {
	profileStore.update((s) => ({ ...s, loading: true }));
	try {
		const res = await GameService.paginate({ creatorId: userId }, 1, 50);
		if (res.status === 'success') {
			profileStore.update((s) => ({ ...s, games: res.docs }));
		}
	} finally {
		profileStore.update((s) => ({ ...s, loading: false }));
	}
}

export async function logout() {
	const { user, accessToken } = get(authUserStore);
	if (user) {
		await AuthService.logout(user.id, accessToken);
	}
	authUserStore.set({ accessToken: '', refreshToken: '', user: null });
	goto('/auth/login');
}
