export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type TurnDuration = 15 | 30 | 60;
export type GuessOutcome = 'wrong' | 'close' | 'correct';

export interface IMultiplayerPlayer {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	joinedAt: number;
}

export interface IMultiplayerRoom {
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

export interface IPublicImage {
	id: number;
	imageUrl: string;
	gridSize: number;
	maxReveal: number | null;
	hintCount: number;
}

export interface IRevealedHint {
	id: number;
	hint: string;
	orderIndex: number;
}

export interface IGuessBubble {
	playerId: string;
	guessText?: string; // only present for the player's own guess
	result: GuessOutcome;
}
