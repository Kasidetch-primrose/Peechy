import type { Server } from 'socket.io';
import * as rooms from './roomManager.js';
import { getGameImages, persistMultiplayerResults } from './db.js';
import { checkGuess, computeScore } from './checkGuess.js';
import type { ImageData, Player, TurnState } from './types.js';

// Single-process MVP: per-room ephemeral data that doesn't need to survive
// a server restart (image list, the active turn timer) lives in memory.
const roomImages = new Map<string, ImageData[]>();
const roomTimers = new Map<string, NodeJS.Timeout>();

const REVEAL_ANSWER_SEC = 5;
const PREPARE_BREAK_SEC = 3;

function clearTimer(code: string) {
	const timer = roomTimers.get(code);
	if (timer) clearTimeout(timer);
	roomTimers.delete(code);
}

function isGuestId(playerId: string): boolean {
	return playerId.startsWith('guest_');
}

export async function startGame(io: Server, code: string): Promise<void> {
	const room = await rooms.getRoom(code);
	if (!room || room.status !== 'lobby') return;

	const images = await getGameImages(room.gameId);
	if (images.length === 0) {
		io.to(code).emit('room:error', { code, message: 'เกมนี้ยังไม่มีรูปภาพ' });
		return;
	}
	roomImages.set(code, images);

	const players = await rooms.getAllPlayers(code);
	const shuffled = [...players.map((p) => p.id)].sort(() => Math.random() - 0.5);
	await rooms.setQueue(code, shuffled);

	await rooms.updateRoom(code, {
		status: 'playing',
		currentImageIndex: 0,
		currentTurnPlayerIndex: 0,
		globalRevealedTiles: []
	});

	io.to(code).emit('game:started', {
		queueOrder: shuffled,
		image: publicImage(images[0])
	});

	await startTurn(io, code);
}

function publicImage(image: ImageData) {
	// Never send the answer to clients.
	return {
		id: image.id,
		imageUrl: image.imageUrl,
		gridSize: image.gridSize,
		maxReveal: image.maxReveal
	};
}

async function startTurn(io: Server, code: string): Promise<void> {
	const room = await rooms.getRoom(code);
	if (!room || room.status !== 'playing') return;

	const queue = await rooms.getQueue(code);
	if (queue.length === 0) return;

	const playerId = queue[room.currentTurnPlayerIndex % queue.length];
	const turn: TurnState = {
		playerId,
		startedAt: Date.now(),
		tileOpened: false,
		guessAttempts: 0,
		hintUsed: false
	};
	await rooms.setTurn(code, turn);

	io.to(code).emit('turn:started', {
		playerId,
		turnDurationSec: room.turnDurationSec,
		startedAt: turn.startedAt
	});

	clearTimer(code);
	const timer = setTimeout(() => {
		void handleTurnTimeout(io, code);
	}, room.turnDurationSec * 1000);
	roomTimers.set(code, timer);
}

export async function revealTile(
	io: Server,
	code: string,
	playerId: string,
	tileIndex: number
): Promise<void> {
	const { room, turn, image } = await loadActiveTurnContext(code, playerId);
	if (!room || !turn || !image) return;
	if (turn.tileOpened) return;

	const roundEnded = await applyTileReveal(io, code, room, image, tileIndex, playerId);
	if (roundEnded) return;

	const updatedTurn = { ...turn, tileOpened: true };
	await rooms.setTurn(code, updatedTurn);

	await maybeEndTurn(io, code, updatedTurn);
}

export async function submitGuess(
	io: Server,
	code: string,
	playerId: string,
	guess: string
): Promise<void> {
	const { room, turn, image } = await loadActiveTurnContext(code, playerId);
	if (!room || !turn || !image) return;
	if (turn.guessAttempts >= 2) return;

	const outcome = checkGuess(guess, image.answer);
	const updatedTurn = { ...turn, guessAttempts: (turn.guessAttempts + 1) as 0 | 1 | 2 };
	await rooms.setTurn(code, updatedTurn);

	if (outcome === 'correct') {
		// The round is over either way, so the exact (correct) text is safe to share.
		io.to(code).emit('guess:result', { playerId, guessText: guess, result: outcome });

		const tilesRevealed = (await rooms.getRoom(code))?.globalRevealedTiles.length ?? 0;
		const score = computeScore(tilesRevealed, image.gridSize * image.gridSize);
		const player = await rooms.getPlayer(code, playerId);
		if (player) {
			player.score += score;
			await rooms.setPlayer(code, player);
		}
		await endRound(io, code);
		return;
	}

	io.to(code).emit('guess:result', { playerId, guessText: guess, result: outcome });

	await maybeEndTurn(io, code, updatedTurn);
}

export async function useHint(io: Server, code: string, playerId: string): Promise<void> {
	const { room, turn, image } = await loadActiveTurnContext(code, playerId);
	if (!room || !turn || !image) return;
	if (turn.hintUsed) return;

	const updatedTurn = { ...turn, hintUsed: true };
	await rooms.setTurn(code, updatedTurn);

	io.to(code).emit('turn:hintUsed', { playerId, hint: image.hint });
}

async function handleTurnTimeout(io: Server, code: string): Promise<void> {
	const room = await rooms.getRoom(code);
	const turn = await rooms.getTurn(code);
	if (!room || !turn || room.status !== 'playing') return;

	if (!turn.tileOpened) {
		const image = roomImages.get(code)?.[room.currentImageIndex];
		if (image) {
			const totalTiles = image.gridSize * image.gridSize;
			const remaining = allTileIndexes(totalTiles).filter(
				(i) => !room.globalRevealedTiles.includes(i)
			);
			if (remaining.length > 0) {
				const randomTile = remaining[Math.floor(Math.random() * remaining.length)];
				const roundEnded = await applyTileReveal(io, code, room, image, randomTile, turn.playerId, true);
				if (roundEnded) return;
			}
		}
	}

	await endTurnAndAdvance(io, code);
}

async function maybeEndTurn(io: Server, code: string, turn: TurnState): Promise<void> {
	if (turn.guessAttempts >= 2 && turn.tileOpened) {
		clearTimer(code);
		await endTurnAndAdvance(io, code);
	}
}

async function applyTileReveal(
	io: Server,
	code: string,
	room: Awaited<ReturnType<typeof rooms.getRoom>>,
	image: ImageData,
	tileIndex: number,
	revealedBy: string,
	forced = false
): Promise<boolean> {
	if (!room) return false;
	const updatedTiles = [...room.globalRevealedTiles, tileIndex];
	await rooms.updateRoom(code, { globalRevealedTiles: updatedTiles });

	io.to(code).emit(forced ? 'turn:forceReveal' : 'tile:revealed', {
		tileIndex,
		revealedBy
	});

	const totalTiles = image.gridSize * image.gridSize;
	if (
		(image.maxReveal && updatedTiles.length >= image.maxReveal) ||
		updatedTiles.length >= totalTiles
	) {
		// No one solved it within the reveal budget — reveal the answer and move on.
		await endRound(io, code);
		return true;
	}
	return false;
}

function allTileIndexes(total: number): number[] {
	return Array.from({ length: total }, (_, i) => i);
}

// Turn ends but the image stays the same (wrong guesses exhausted or timeout
// with tiles still left to reveal) — give the next player a short, clearly
// signposted break before their timer starts.
async function endTurnAndAdvance(io: Server, code: string): Promise<void> {
	const room = await rooms.getRoom(code);
	if (!room || room.status !== 'playing') return;

	const queue = await rooms.getQueue(code);
	const nextIndex = (room.currentTurnPlayerIndex + 1) % Math.max(queue.length, 1);
	const nextPlayerId = queue[nextIndex];
	await rooms.updateRoom(code, { currentTurnPlayerIndex: nextIndex });

	clearTimer(code);
	io.to(code).emit('round:prepare', { nextPlayerId, breakSec: PREPARE_BREAK_SEC });

	const timer = setTimeout(() => {
		void startTurn(io, code);
	}, PREPARE_BREAK_SEC * 1000);
	roomTimers.set(code, timer);
}

// The image is fully solved/exhausted — reveal it to everyone for a beat,
// then move to the next image (and the next player's turn) after a short
// "get ready" break.
async function endRound(io: Server, code: string): Promise<void> {
	const room = await rooms.getRoom(code);
	const images = roomImages.get(code);
	if (!room || !images) return;

	const currentImage = images[room.currentImageIndex];
	const players = await rooms.getAllPlayers(code);
	const scores = Object.fromEntries(players.map((p) => [p.id, p.score]));

	clearTimer(code);
	io.to(code).emit('round:revealAnswer', {
		answer: currentImage.answer,
		imageUrl: currentImage.imageUrl,
		scores,
		revealSec: REVEAL_ANSWER_SEC
	});

	const timer = setTimeout(() => {
		void proceedAfterReveal(io, code, scores);
	}, REVEAL_ANSWER_SEC * 1000);
	roomTimers.set(code, timer);
}

async function proceedAfterReveal(
	io: Server,
	code: string,
	scores: Record<string, number>
): Promise<void> {
	const room = await rooms.getRoom(code);
	const images = roomImages.get(code);
	if (!room || !images) return;

	const currentImage = images[room.currentImageIndex];
	const nextIndex = room.currentImageIndex + 1;
	if (nextIndex >= images.length) {
		await finishGame(io, code, currentImage.answer, scores);
		return;
	}

	const queue = await rooms.getQueue(code);
	const nextTurnIndex = (room.currentTurnPlayerIndex + 1) % Math.max(queue.length, 1);
	const nextPlayerId = queue[nextTurnIndex];

	await rooms.updateRoom(code, {
		currentImageIndex: nextIndex,
		currentTurnPlayerIndex: nextTurnIndex,
		globalRevealedTiles: []
	});

	io.to(code).emit('round:prepare', { nextPlayerId, breakSec: PREPARE_BREAK_SEC });
	io.to(code).emit('image:advanced', {
		imageIndex: nextIndex,
		image: publicImage(images[nextIndex]),
		scores
	});

	const timer = setTimeout(() => {
		void startTurn(io, code);
	}, PREPARE_BREAK_SEC * 1000);
	roomTimers.set(code, timer);
}

async function finishGame(
	io: Server,
	code: string,
	lastAnswer: string,
	scores: Record<string, number>
): Promise<void> {
	clearTimer(code);
	await rooms.updateRoom(code, { status: 'finished' });

	const players = await rooms.getAllPlayers(code);
	const sorted = [...players].sort((a, b) => b.score - a.score);
	const winnerId = sorted[0]?.id ?? null;

	io.to(code).emit('game:finished', {
		lastAnswer,
		finalScores: scores,
		winnerId
	});

	const room = await rooms.getRoom(code);
	if (room) {
		const persistable = players
			.filter((p) => !isGuestId(p.id))
			.map((p) => ({ userId: Number(p.id), score: p.score }));
		if (persistable.length > 0) {
			await persistMultiplayerResults({
				code,
				gameId: room.gameId,
				hostId: Number(room.hostId),
				scores: persistable
			}).catch((err) => console.error('[multiplayer] failed to persist results:', err));
		}
	}

	roomImages.delete(code);
	roomTimers.delete(code);
}

export async function handleDisconnect(io: Server, code: string, playerId: string): Promise<void> {
	const player = await rooms.getPlayer(code, playerId);
	if (!player) return;
	player.connected = false;
	await rooms.setPlayer(code, player);

	const room = await rooms.getRoom(code);
	if (!room) return;

	if (room.hostId === playerId) {
		const remaining = (await rooms.getAllPlayers(code)).filter((p) => p.connected);
		if (remaining.length > 0) {
			await rooms.updateRoom(code, { hostId: remaining[0].id });
			io.to(code).emit('room:hostChanged', { newHostId: remaining[0].id });
		}
	}

	if (room.status === 'playing') {
		const turn = await rooms.getTurn(code);
		if (turn?.playerId === playerId) {
			await handleTurnTimeout(io, code);
		}
	}

	io.to(code).emit('room:playerLeft', { playerId });
}

async function loadActiveTurnContext(code: string, playerId: string) {
	const room = await rooms.getRoom(code);
	const turn = await rooms.getTurn(code);
	const image = room ? roomImages.get(code)?.[room.currentImageIndex] : undefined;

	if (!room || room.status !== 'playing' || !turn || turn.playerId !== playerId || !image) {
		return { room: null, turn: null, image: null };
	}
	return { room, turn, image };
}
