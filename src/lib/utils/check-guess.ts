import Fuse from 'fuse.js';

export type GuessResult = 'correct' | 'close' | 'wrong';

/**
 * How lenient fuzzy matching is.
 *
 * Fuse.js score runs 0 → 1 (0 = perfect, 1 = no match at all).
 * The threshold is the *maximum* score a result can have and still
 * be returned — lower = stricter.
 *
 * 0.35 lets through ~1–2 character typos in a typical 6–10 char word
 * (e.g. "elefant" or "Elaphent" → "elephant") while reliably rejecting
 * completely unrelated words like "tiger" or "dog".
 */
const FUZZY_THRESHOLD = 0.35;

/**
 * Checks a player's guess against the correct answer.
 *
 * @returns
 *   - `'correct'` — exact match (after normalisation)
 *   - `'close'`   — fuzzy near-match; likely a typo
 *   - `'wrong'`   — unrelated answer
 */
export function checkGuess(guess: string, answer: string): GuessResult {
	const normGuess = guess.trim().toLowerCase();
	const normAnswer = answer.trim().toLowerCase();

	// Fast path: exact match after normalisation
	if (normGuess === normAnswer) return 'correct';

	// Fuzzy path: wrap the single answer in an array so Fuse can search it.
	// `ignoreLocation` removes the position bias so the full string is compared.
	// `minMatchCharLength: 2` avoids spurious hits on single-character inputs.
	const fuse = new Fuse([normAnswer], {
		includeScore: true,
		threshold: FUZZY_THRESHOLD,
		ignoreLocation: true,
		minMatchCharLength: 2
	});

	const results = fuse.search(normGuess);
	if (results.length > 0) return 'close';

	return 'wrong';
}
