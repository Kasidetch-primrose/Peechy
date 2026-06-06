import { derived, writable } from 'svelte/store';
import { authUserStore } from '$lib/data/stores/authUser';
import GameService from '$lib/data/services/game';
import ImageService from '$lib/data/services/image';
import type { IGame, IGameImage } from '$lib/data/interface/game';

// ── Constants ─────────────────────────────────────────────────────────────────
export const difficultyLabel: Record<string, string> = {
	easy: 'ง่าย',
	medium: 'กลาง',
	hard: 'ยาก'
};

export const difficultyBg: Record<string, string> = {
	easy: 'bg-secondary-green text-white',
	medium: 'bg-secondary-yellow text-gray-900',
	hard: 'bg-error text-white'
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface GameDetailState {
	game: IGame | null;
	images: IGameImage[];
	loading: boolean;
	error: string;
	activeImageIdx: number;
}

// ── Store ─────────────────────────────────────────────────────────────────────
const initial: GameDetailState = {
	game: null,
	images: [],
	loading: true,
	error: '',
	activeImageIdx: 0
};

export const gameDetailStore = writable<GameDetailState>({ ...initial });

export const isCreatorStore = derived(
	[gameDetailStore, authUserStore],
	([$detail, $auth]) => {
		const game = $detail.game;
		if (!game) return false;
		// Logged-in user who owns the game
		if ($auth.user?.id && $auth.user.id === game.creatorId) return true;
		// Guest creator: check for the token saved in localStorage at creation time
		if (typeof localStorage !== 'undefined') {
			return !!localStorage.getItem(`creator_token_${game.id}`);
		}
		return false;
	}
);

export function resetGameDetailStore() {
	gameDetailStore.set({ ...initial });
}

// ── Actions ───────────────────────────────────────────────────────────────────
export async function loadGame(id: number) {
	gameDetailStore.update((s) => ({ ...s, loading: true, error: '' }));
	try {
		const [gameRes, imagesRes] = await Promise.all([
			GameService.getOne(id),
			ImageService.paginate({ gameId: id }, 1, 100)
		]);
		if (gameRes.status !== 'success') {
			gameDetailStore.update((s) => ({ ...s, error: 'ไม่พบเกมที่ต้องการ' }));
		} else {
			gameDetailStore.update((s) => ({ ...s, game: gameRes.doc }));
		}
		if (imagesRes.status === 'success') {
			gameDetailStore.update((s) => ({ ...s, images: imagesRes.docs }));
		}
	} catch (e) {
		gameDetailStore.update((s) => ({ ...s, error: (e as Error).message }));
	} finally {
		gameDetailStore.update((s) => ({ ...s, loading: false }));
	}
}

export function setActiveImage(idx: number) {
	gameDetailStore.update((s) => ({ ...s, activeImageIdx: idx }));
}

export async function deleteGame(id: number): Promise<{ ok: boolean; error?: string }> {
	let accessToken: string | undefined;
	let creatorToken: string | undefined;

	// Read auth state synchronously from the store's current value
	authUserStore.subscribe((s) => {
		accessToken = s.accessToken || undefined;
	})();

	if (typeof localStorage !== 'undefined') {
		creatorToken = localStorage.getItem(`creator_token_${id}`) ?? undefined;
	}

	const res = await GameService.deleteOne(id, accessToken, creatorToken);
	if (res.status === 'success') return { ok: true };
	return { ok: false, error: res.error ?? 'เกิดข้อผิดพลาด' };
}
