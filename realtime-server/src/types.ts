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

// The shared "trace" image under the drawing. x/y are the top-left corner and
// width is the image width, all as fractions (0..1) of the paper's width/height
// so it lands in the same place on every screen. Height is derived from
// `aspect` (natural width / height), so the image can never be distorted.
export interface DrawReference {
	id: string;
	url: string;
	x: number;
	y: number;
	width: number;
	aspect: number;
	opacity: number;
	locked: boolean; // static/trace mode: nobody can move, resize or replace it
	visible: boolean;
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
	fill?: boolean;
	points: Point[];
}
