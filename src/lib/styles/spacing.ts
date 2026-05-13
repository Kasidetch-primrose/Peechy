// ─── Spacing Scale (rem) ─────────────────────────────────────────────────────
// Mirrors AppSpacing in the Flutter reference project.

export const spacing = {
	'2xs': '0.125rem', //  2px
	xs: '0.25rem', //  4px
	sm: '0.5rem', //  8px
	md: '1rem', //  16px
	lg: '1.5rem', //  24px
	xl: '2rem', //  32px
	'2xl': '3rem', //  48px
	'3xl': '4rem' //  64px
} as const;

export type SpacingKey = keyof typeof spacing;

// ─── Numeric spacing (px) — handy for JS calculations ────────────────────────
export const spacingPx = {
	'2xs': 2,
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	'2xl': 48,
	'3xl': 64
} as const;
