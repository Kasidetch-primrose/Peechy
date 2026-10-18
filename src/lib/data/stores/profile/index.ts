import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import { authUserStore, patchAuthUser } from '$lib/data/stores/authUser';
import AuthService from '$lib/data/services/auth';
import GameService from '$lib/data/services/game';
import UserService from '$lib/data/services/user';
import type { IGame } from '$lib/data/interface/game';
import type { IAvatarCrop, IAvatarResponse, IPublicUser } from '$lib/data/interface/user';

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

// ── Profile owner (public info + avatar) ──────────────────────────────────────
export const profileUserStore = writable<{ loading: boolean; user: IPublicUser | null }>({
	loading: true,
	user: null
});

export async function loadProfileUser(userId: number) {
	profileUserStore.set({ loading: true, user: null });
	try {
		const res = await UserService.getOne(userId);
		const user = res.status === 'success' ? res.doc : null;
		profileUserStore.set({ loading: false, user });
		if (user && get(authUserStore).user?.id === user.id) {
			patchAuthUser({
				name: user.name,
				username: user.username,
				avatarUrl: user.avatarUrl,
				avatarCrop: user.avatarCrop
			});
		}
	} catch {
		profileUserStore.set({ loading: false, user: null });
	}
}

/** Applies an avatar API result to the profile + logged-in user; returns an error message ('' on success). */
function applyAvatarResult(res: IAvatarResponse): string {
	if (res.status !== 'success') return res.error ?? 'บันทึกรูปไม่สำเร็จ';
	const patch = { avatarUrl: res.avatarUrl ?? null, avatarCrop: res.avatarCrop ?? null };
	profileUserStore.update((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
	patchAuthUser(patch);
	return '';
}

async function withLogin(fn: () => Promise<IAvatarResponse>): Promise<string> {
	if (!get(authUserStore).accessToken) return 'กรุณาเข้าสู่ระบบอีกครั้ง';
	try {
		const res = await fn();
		if (res.error === 'Unauthorized') return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง';
		return applyAvatarResult(res);
	} catch {
		return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ';
	}
}

export const uploadAvatar = (file: Blob, crop: IAvatarCrop) =>
	withLogin(() => UserService.uploadAvatar(file, crop));

export const updateAvatarCrop = (crop: IAvatarCrop) =>
	withLogin(() => UserService.updateAvatarCrop(crop));

export const removeAvatar = () => withLogin(() => UserService.removeAvatar());

/** Saves the owner's name / username; returns an error message ('' on success). */
export async function updateProfile(data: { name: string | null; username: string }) {
	if (!get(authUserStore).accessToken) return 'กรุณาเข้าสู่ระบบอีกครั้ง';
	try {
		const res = await UserService.updateProfile(data);
		if (res.error === 'Unauthorized') return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง';
		if (res.status !== 'success' || !res.doc) return res.error ?? 'บันทึกไม่สำเร็จ';
		const { name, username } = res.doc;
		profileUserStore.update((s) => (s.user ? { ...s, user: { ...s.user, name, username } } : s));
		patchAuthUser({ name, username });
		return '';
	} catch {
		return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ';
	}
}

export function setActiveTab(tab: ProfileTab) {
	profileStore.update((s) => ({ ...s, activeTab: tab }));
}

export async function logout() {
	const { user, accessToken, refreshToken } = get(authUserStore);
	if (user) {
		await AuthService.logout(accessToken, refreshToken);
	}
	authUserStore.set({ accessToken: '', refreshToken: '', user: null });
	goto('/auth/login');
}
