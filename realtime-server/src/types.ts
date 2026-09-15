export type RoomStatus = 'lobby' | 'playing' | 'finished';

export type TurnDuration = 15 | 30 | 60;

export interface RoomState {
	code: string;
	hostId: string;
	gameId: number;
	status: RoomStatus;
	turnDurationSec: TurnDuration;
	currentImageIndex: number;
	currentTurnPlayerIndex: number;
	globalRevealedTiles: number[];
	// Hint ids revealed so far for the current image, in reveal order. Lives
	// on the room (not the per-player TurnState) because revealing a hint is
	// shared: it stays visible to every player taking a turn on this image.
	revealedHintIds: number[];
	createdAt: number;
}

export interface Player {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	joinedAt: number;
}

export interface TurnState {
	playerId: string;
	startedAt: number;
	tileOpened: boolean;
	guessAttempts: 0 | 1 | 2;
}

export interface ImageHint {
	id: number;
	hint: string;
	orderIndex: number;
}

export interface ImageData {
	id: number;
	imageUrl: string;
	answer: string;
	hints: ImageHint[]; // sorted by orderIndex ascending
	gridSize: number;
	maxReveal: number | null;
}

export type GuessOutcome = 'wrong' | 'close' | 'correct';
