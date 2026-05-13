// ─── Border Radius Scale ─────────────────────────────────────────────────────
// Mirrors AppRadii in the Flutter reference project.

export const radii = {
	none: '0px',
	sm: '0.375rem', //  6px
	md: '0.75rem', //  12px
	lg: '1rem', //  16px
	xl: '1.25rem', //  20px
	'2xl': '1.5rem', //  24px
	full: '9999px'
} as const;

export type RadiiKey = keyof typeof radii;
