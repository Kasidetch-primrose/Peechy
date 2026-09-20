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
	hintUsed: boolean;
}

export interface ImageData {
	id: number;
	imageUrl: string;
	answer: string;
	hint: string | null;
	gridSize: number;
	maxReveal: number | null;
}

export type GuessOutcome = 'wrong' | 'close' | 'correct';

// ── Draw Together ─────────────────────────────────────────────────────────

export interface DrawPlayer {
	id: string;
	name: string;
	connected: boolean;
	joinedAt: number;
}

export const DRAW_RATIOS = ['4:3', '16:9', '1:1', '3:4'] as const;
export type DrawRatio = (typeof DRAW_RATIOS)[number];

export interface DrawRoomState {
	code: string;
	hostId: string;
	ratio: DrawRatio;
	createdAt: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface Stroke {
	id: string;
	playerId: string;
	color: string;
	width: number;
	erase?: boolean;
	points: Point[];
}
