import { writable, get } from 'svelte/store';
import MultiplayerService from '$lib/data/services/multiplayer';
import type {
	IMultiplayerPlayer,
	IMultiplayerRoom,
	IPublicImage,
	IGuessBubble,
	IRevealedHint,
	TurnDuration
} from '$lib/data/interface/multiplayer';

interface MultiplayerState {
	connecting: boolean;
	error: string;

	room: IMultiplayerRoom | null;
	players: IMultiplayerPlayer[];
	selfId: string;

	currentImage: IPublicImage | null;
	revealedTiles: number[];

	currentTurnPlayerId: string | null;
	turnDurationSec: TurnDuration;
	turnStartedAt: number | null;

	bubbles: IGuessBubble[]; // recent guesses, auto-expire from UI after a few seconds
	revealedHints: IRevealedHint[]; // hints opened so far for the current image, shared by everyone
	revealedAnswer: string | null; // shown briefly when an image round ends

	// Between-round break state: 'answer' shows the full solved image,
	// 'prepare' is the short countdown before the next player's turn.
	roundPhase: 'none' | 'answer' | 'prepare';
	roundBreakSec: number;
	roundBreakStartedAt: number | null;
	nextPlayerId: string | null;

	finished: boolean;
	finalScores: Record<string, number>;
	winnerId: string | null;
}

const initial: MultiplayerState = {
	connecting: false,
	error: '',
	room: null,
	players: [],
	selfId: '',
	currentImage: null,
	revealedTiles: [],
	currentTurnPlayerId: null,
	turnDurationSec: 30,
	turnStartedAt: null,
	bubbles: [],
	revealedHints: [],
	revealedAnswer: null,
	roundPhase: 'none',
	roundBreakSec: 0,
	roundBreakStartedAt: null,
	nextPlayerId: null,
	finished: false,
	finalScores: {},
	winnerId: null
};

export const multiplayerStore = writable<MultiplayerState>({ ...initial });

export function resetMultiplayerStore() {
	multiplayerStore.set({ ...initial });
}

// ── Connection & lobby ──────────────────────────────────────────────────────

export function connect(playerId: string, playerName: string) {
	multiplayerStore.update((s) => ({ ...s, selfId: playerId }));
	const socket = MultiplayerService.connect(playerId, playerName);
	_bindEvents();
	return socket;
}

export async function createRoom(gameId: number, turnDurationSec: TurnDuration) {
	multiplayerStore.update((s) => ({ ...s, connecting: true, error: '' }));
	const res = await MultiplayerService.createRoom(gameId, turnDurationSec);
	multiplayerStore.update((s) => ({ ...s, connecting: false }));
	if (!res.ok) {
		multiplayerStore.update((s) => ({ ...s, error: res.message ?? 'สร้างห้องไม่สำเร็จ' }));
		return null;
	}
	return res.code ?? null;
}

export async function joinRoom(code: string) {
	multiplayerStore.update((s) => ({ ...s, connecting: true, error: '' }));
	const res = await MultiplayerService.joinRoom(code);
	multiplayerStore.update((s) => ({ ...s, connecting: false }));
	if (!res.ok || !res.room) {
		multiplayerStore.update((s) => ({ ...s, error: res.message ?? 'เข้าร่วมห้องไม่สำเร็จ' }));
		return false;
	}
	multiplayerStore.update((s) => ({
		...s,
		room: res.room!,
		players: res.players ?? [],
		turnDurationSec: res.room!.turnDurationSec
	}));
	return true;
}

export function startGame(code: string) {
	MultiplayerService.startGame(code);
}

export function leaveRoom() {
	const { room } = get(multiplayerStore);
	if (room) MultiplayerService.leaveRoom(room.code);
	resetMultiplayerStore();
}

// ── In-game actions ──────────────────────────────────────────────────────────

export function revealTile(tileIndex: number) {
	const { room } = get(multiplayerStore);
	if (!room) return;
	MultiplayerService.revealTile(room.code, tileIndex);
}

export function submitGuess(guess: string) {
	const { room } = get(multiplayerStore);
	if (!room) return;
	MultiplayerService.submitGuess(room.code, guess);
}

export function useHint() {
	const { room } = get(multiplayerStore);
	if (!room) return;
	MultiplayerService.useHint(room.code);
}

// ── Server event wiring ───────────────────────────────────────────────────────

let bound = false;

function _bindEvents() {
	if (bound) return;
	bound = true;
	const socket = MultiplayerService.getSocket();

	socket.on('room:playerJoined', ({ player }: { player: IMultiplayerPlayer }) => {
		multiplayerStore.update((s) => ({
			...s,
			players: [...s.players.filter((p) => p.id !== player.id), player]
		}));
	});

	socket.on('room:playerLeft', ({ playerId }: { playerId: string }) => {
		multiplayerStore.update((s) => ({
			...s,
			players: s.players.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
		}));
	});

	socket.on('room:hostChanged', ({ newHostId }: { newHostId: string }) => {
		multiplayerStore.update((s) => (s.room ? { ...s, room: { ...s.room, hostId: newHostId } } : s));
	});

	socket.on('game:started', ({ image }: { queueOrder: string[]; image: IPublicImage }) => {
		multiplayerStore.update((s) => ({
			...s,
			room: s.room ? { ...s.room, status: 'playing' } : s.room,
			currentImage: image,
			revealedTiles: [],
			revealedHints: []
		}));
	});

	socket.on(
		'turn:started',
		({
			playerId,
			turnDurationSec,
			startedAt
		}: {
			playerId: string;
			turnDurationSec: TurnDuration;
			startedAt: number;
		}) => {
			multiplayerStore.update((s) => ({
				...s,
				currentTurnPlayerId: playerId,
				turnDurationSec,
				turnStartedAt: startedAt,
				revealedAnswer: null,
				roundPhase: 'none',
				roundBreakStartedAt: null,
				nextPlayerId: null
			}));
		}
	);

	socket.on('tile:revealed', ({ tileIndex }: { tileIndex: number; revealedBy: string }) => {
		multiplayerStore.update((s) => ({ ...s, revealedTiles: [...s.revealedTiles, tileIndex] }));
	});

	socket.on('turn:forceReveal', ({ tileIndex }: { tileIndex: number }) => {
		multiplayerStore.update((s) => ({ ...s, revealedTiles: [...s.revealedTiles, tileIndex] }));
	});

	socket.on(
		'guess:result',
		({
			playerId,
			guessText,
			result
		}: {
			playerId: string;
			guessText: string;
			result: IGuessBubble['result'];
		}) => {
			const bubble: IGuessBubble = { playerId, result, guessText };
			multiplayerStore.update((s) => ({ ...s, bubbles: [...s.bubbles, bubble] }));
			// Fade the bubble out of the UI after 3s.
			setTimeout(() => {
				multiplayerStore.update((s) => ({ ...s, bubbles: s.bubbles.filter((b) => b !== bubble) }));
			}, 3000);
		}
	);

	socket.on(
		'turn:hintUsed',
		({
			hintId,
			hint,
			orderIndex,
			scores
		}: {
			playerId: string;
			hintId: number;
			hint: string;
			orderIndex: number;
			penalty: number;
			scores: Record<string, number>;
		}) => {
			multiplayerStore.update((s) => ({
				...s,
				revealedHints: [...s.revealedHints, { id: hintId, hint, orderIndex }],
				players: s.players.map((p) => ({ ...p, score: scores[p.id] ?? p.score }))
			}));
		}
	);

	socket.on(
		'round:revealAnswer',
		({
			answer,
			scores,
			revealSec
		}: {
			answer: string;
			imageUrl: string;
			scores: Record<string, number>;
			revealSec: number;
		}) => {
			multiplayerStore.update((s) => ({
				...s,
				revealedAnswer: answer,
				roundPhase: 'answer',
				roundBreakSec: revealSec,
				roundBreakStartedAt: Date.now(),
				bubbles: [],
				players: s.players.map((p) => ({ ...p, score: scores[p.id] ?? p.score }))
			}));
		}
	);

	socket.on(
		'round:prepare',
		({ nextPlayerId, breakSec }: { nextPlayerId: string; breakSec: number }) => {
			multiplayerStore.update((s) => ({
				...s,
				roundPhase: 'prepare',
				roundBreakSec: breakSec,
				roundBreakStartedAt: Date.now(),
				nextPlayerId
			}));
		}
	);

	socket.on(
		'image:advanced',
		({
			imageIndex,
			image,
			scores
		}: {
			imageIndex: number;
			image: IPublicImage;
			scores: Record<string, number>;
		}) => {
			multiplayerStore.update((s) => ({
				...s,
				currentImage: image,
				revealedTiles: [],
				revealedHints: [],
				players: s.players.map((p) => ({ ...p, score: scores[p.id] ?? p.score })),
				room: s.room ? { ...s.room, currentImageIndex: imageIndex } : s.room
			}));
		}
	);

	socket.on(
		'game:finished',
		({
			finalScores,
			winnerId,
			lastAnswer
		}: {
			finalScores: Record<string, number>;
			winnerId: string | null;
			lastAnswer: string;
		}) => {
			multiplayerStore.update((s) => ({
				...s,
				finished: true,
				finalScores,
				winnerId,
				revealedAnswer: lastAnswer,
				room: s.room ? { ...s.room, status: 'finished' } : s.room
			}));
		}
	);

	socket.on('room:error', ({ message }: { message: string }) => {
		multiplayerStore.update((s) => ({ ...s, error: message }));
	});
}
