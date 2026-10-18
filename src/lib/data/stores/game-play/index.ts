import { goto } from '$app/navigation';
import { get, writable } from 'svelte/store';
import { authUserStore } from '$lib/data/stores/authUser';
import GameService from '$lib/data/services/game';
import ImageService from '$lib/data/services/image';
import GameSessionService from '$lib/data/services/gameSession';
import type { IGame, IGameImage, IGameSession } from '$lib/data/interface/game';
import { checkGuess } from '$lib/utils/check-guess';

// ── Types ─────────────────────────────────────────────────────────────────────
export type RoundStatus = 'playing' | 'correct' | 'wrong' | 'timeout' | 'revealed';

interface GamePlayState {
	// Loading / error
	loading: boolean;
	error: string;

	// Game data
	game: IGame | null;
	images: IGameImage[];

	// Session
	session: IGameSession | null;

	// Round state
	imageIdx: number;
	revealedTiles: number[];
	undoStack: number[][];
	guess: string;
	status: RoundStatus;
	wrongShake: boolean;

	// Score
	score: number;

	// Timer
	timeLeft: number | null; // null = no limit

	// Fuzzy-match hint shown when guess is close but not exact
	hintMessage: string;

	// Hints revealed for the current round (by hint id)
	revealedHintIds: number[];

	// Result overlay
	finished: boolean; // all images done
}

const initial: GamePlayState = {
	loading: true,
	error: '',
	game: null,
	images: [],
	session: null,
	imageIdx: 0,
	revealedTiles: [],
	undoStack: [],
	guess: '',
	status: 'playing',
	wrongShake: false,
	score: 0,
	timeLeft: null,
	hintMessage: '',
	revealedHintIds: [],
	finished: false
};

export const gamePlayStore = writable<GamePlayState>({ ...initial });

export function resetGamePlayStore() {
	_clearTimer();
	gamePlayStore.set({ ...initial });
}

// ── Internal timer handle ─────────────────────────────────────────────────────
let _timerId: ReturnType<typeof setInterval> | null = null;

function _clearTimer() {
	if (_timerId !== null) {
		clearInterval(_timerId);
		_timerId = null;
	}
}

function _startTimer(seconds: number) {
	_clearTimer();
	gamePlayStore.update((s) => ({ ...s, timeLeft: seconds }));
	_timerId = setInterval(() => {
		const { timeLeft, status } = get(gamePlayStore);
		if (status !== 'playing' || timeLeft === null) {
			_clearTimer();
			return;
		}
		if (timeLeft <= 1) {
			_clearTimer();
			_handleTimeout();
		} else {
			gamePlayStore.update((s) => ({ ...s, timeLeft: (s.timeLeft ?? 1) - 1 }));
		}
	}, 1000);
}

function _handleTimeout() {
	gamePlayStore.update((s) => ({ ...s, status: 'timeout' }));
	_persistSession();
}

// ── Score helper ──────────────────────────────────────────────────────────────
function _calcRoundScore(image: IGameImage, revealed: number): number {
	const total = image.gridSize * image.gridSize;
	const ratio = 1 - revealed / total;
	return Math.round(ratio * 100);
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadGame(gameId: number) {
	_clearTimer();
	gamePlayStore.update((s) => ({ ...s, loading: true, error: '' }));
	try {
		const [gameRes, imagesRes] = await Promise.all([
			GameService.getOne(gameId),
			ImageService.paginate({ gameId }, 1, 200)
		]);
		if (gameRes.status !== 'success') throw new Error('ไม่พบเกมที่ต้องการ');
		if (imagesRes.status !== 'success' || imagesRes.docs.length === 0)
			throw new Error('เกมนี้ยังไม่มีรูปภาพ');

		const images = [...imagesRes.docs].sort((a, b) => a.orderIndex - b.orderIndex);
		const { user, accessToken } = get(authUserStore);

		// Create or reuse session
		let session: IGameSession | null = null;
		if (user && accessToken) {
			const sessionRes = await GameSessionService.create(
				{
					userId: user.id,
					gameId,
					currentImageIndex: 0,
					revealedTiles: [],
					undoStack: [],
					score: 0,
					isFinished: false
				}
			);
			if (sessionRes.status === 'success') session = sessionRes.doc;
		}

		gamePlayStore.update((s) => ({
			...s,
			loading: false,
			game: gameRes.doc,
			images,
			session,
			imageIdx: 0,
			revealedTiles: [],
			undoStack: [],
			guess: '',
			status: 'playing',
			score: 0,
			finished: false,
			timeLeft: images[0]?.timeLimit ?? null
		}));

		if (images[0]?.timeLimit) _startTimer(images[0].timeLimit);
	} catch (err) {
		gamePlayStore.update((s) => ({ ...s, loading: false, error: (err as Error).message }));
	}
}

// ── Tile interactions ─────────────────────────────────────────────────────────
export function revealTile(tileIdx: number) {
	const { status, revealedTiles, images, imageIdx } = get(gamePlayStore);
	if (status !== 'playing') return;
	if (revealedTiles.includes(tileIdx)) return;

	const image = images[imageIdx];
	const maxReveal = image?.maxReveal ?? Infinity;

	const newRevealed = [...revealedTiles, tileIdx];
	const newUndo = [...get(gamePlayStore).undoStack, [...revealedTiles]];

	const allRevealed = newRevealed.length >= image.gridSize * image.gridSize;
	const hitMax = image.maxReveal !== null && newRevealed.length >= (image.maxReveal ?? Infinity);

	gamePlayStore.update((s) => ({
		...s,
		revealedTiles: newRevealed,
		undoStack: newUndo
	}));

	if (allRevealed || hitMax) {
		_clearTimer();
		gamePlayStore.update((s) => ({ ...s, status: 'revealed' }));
		_persistSession();
	}
}

export function undoReveal() {
	const { status, undoStack } = get(gamePlayStore);
	if (status !== 'playing' || undoStack.length === 0) return;
	const prev = undoStack[undoStack.length - 1];
	gamePlayStore.update((s) => ({
		...s,
		revealedTiles: prev,
		undoStack: s.undoStack.slice(0, -1)
	}));
}

// ── Hints ─────────────────────────────────────────────────────────────────────
export function revealHint(hintId: number) {
	const { status, images, imageIdx, revealedHintIds } = get(gamePlayStore);
	if (status !== 'playing') return;
	if (revealedHintIds.includes(hintId)) return;

	const image = images[imageIdx];
	const penalty = Math.round(100 / (image.gridSize * image.gridSize));

	gamePlayStore.update((s) => ({
		...s,
		revealedHintIds: [...s.revealedHintIds, hintId],
		score: Math.max(0, s.score - penalty)
	}));
}

// ── Answer ────────────────────────────────────────────────────────────────────
export function setGuess(value: string) {
	gamePlayStore.update((s) => ({ ...s, guess: value, hintMessage: '' }));
}

export function submitGuess() {
	const { status, guess, images, imageIdx, revealedTiles, score } = get(gamePlayStore);
	if (status !== 'playing' && status !== 'revealed') return;

	const image = images[imageIdx];
	const result = checkGuess(guess, image.answer);

	if (result === 'correct') {
		_clearTimer();
		const roundScore = _calcRoundScore(image, revealedTiles.length);
		gamePlayStore.update((s) => ({
			...s,
			status: 'correct',
			score: s.score + roundScore,
			hintMessage: ''
		}));
		_persistSession();
	} else if (result === 'close') {
		gamePlayStore.update((s) => ({
			...s,
			hintMessage: 'เกือบถูกแล้ว! ลองตรวจสอบการสะกดอีกครั้ง'
		}));
	} else {
		gamePlayStore.update((s) => ({ ...s, wrongShake: true, hintMessage: '' }));
		setTimeout(() => gamePlayStore.update((s) => ({ ...s, wrongShake: false })), 600);
	}
}

// ── Advance ───────────────────────────────────────────────────────────────────
export function nextImage() {
	const { imageIdx, images, session, score } = get(gamePlayStore);
	const nextIdx = imageIdx + 1;

	if (nextIdx >= images.length) {
		// Game finished
		gamePlayStore.update((s) => ({ ...s, finished: true }));
		if (session) {
			if (get(authUserStore).accessToken) {
				GameSessionService.update(session.id, {
					currentImageIndex: nextIdx,
					score,
					isFinished: true
				});
			}
		}
		return;
	}

	const nextImage = images[nextIdx];
	_clearTimer();

	gamePlayStore.update((s) => ({
		...s,
		imageIdx: nextIdx,
		revealedTiles: [],
		undoStack: [],
		guess: '',
		status: 'playing',
		hintMessage: '',
		revealedHintIds: [],
		timeLeft: nextImage.timeLimit ?? null
	}));

	if (nextImage.timeLimit) _startTimer(nextImage.timeLimit);
	_persistSession();
}

// ── Persist session ───────────────────────────────────────────────────────────
async function _persistSession() {
	const { session, imageIdx, revealedTiles, undoStack, score } = get(gamePlayStore);
	if (!session) return;
	if (!get(authUserStore).accessToken) return;
	await GameSessionService.update(session.id, {
		currentImageIndex: imageIdx,
		revealedTiles,
		undoStack,
		score
	});
}
