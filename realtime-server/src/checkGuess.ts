import Fuse from 'fuse.js';
import type { GuessOutcome } from './types.js';

// Multiplayer uses a stricter threshold than singleplayer (0.35) to reduce
// how much a "close" result leaks the answer to other players watching.
const FUZZY_THRESHOLD = 0.25;

export function checkGuess(guess: string, answer: string): GuessOutcome {
	const normGuess = guess.trim().toLowerCase();
	const normAnswer = answer.trim().toLowerCase();

	if (normGuess === normAnswer) return 'correct';

	const fuse = new Fuse([normAnswer], {
		includeScore: true,
		threshold: FUZZY_THRESHOLD,
		ignoreLocation: true,
		minMatchCharLength: 2
	});

	return fuse.search(normGuess).length > 0 ? 'close' : 'wrong';
}

export function computeScore(tilesRevealed: number, totalTiles: number): number {
	return Math.round((1 - tilesRevealed / totalTiles) * 100);
}
