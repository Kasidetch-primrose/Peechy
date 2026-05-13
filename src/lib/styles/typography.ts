// Font families — Thai-first, Latin fallback
export const fontFamily = {
	sans: '"Noto Sans Thai", "Inter", ui-sans-serif, system-ui, sans-serif',
	mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace'
} as const;

// Font sizes (rem scale)
export const fontSize = {
	xs: '0.75rem', //  12px
	sm: '0.875rem', //  14px
	base: '1rem', //  16px
	lg: '1.125rem', //  18px
	xl: '1.25rem', //  20px
	'2xl': '1.5rem', //  24px
	'3xl': '1.875rem', // 30px
	'4xl': '2.25rem', // 36px
	'5xl': '3rem' // 48px
} as const;

// Font weights
export const fontWeight = {
	normal: 400,
	medium: 500,
	semibold: 600,
	bold: 700
} as const;

// Line heights
export const lineHeight = {
	tight: '1.25',
	snug: '1.375',
	normal: '1.5',
	relaxed: '1.75',
	loose: '2'
} as const;

// Text style presets (similar to AppTextTheme in the Flutter reference)
export const textStyle = {
	displayLarge: {
		fontSize: fontSize['4xl'],
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.tight
	},
	displayMedium: {
		fontSize: fontSize['3xl'],
		fontWeight: fontWeight.semibold,
		lineHeight: lineHeight.tight
	},
	titleLarge: {
		fontSize: fontSize['2xl'],
		fontWeight: fontWeight.semibold,
		lineHeight: lineHeight.snug
	},
	titleMedium: {
		fontSize: fontSize.xl,
		fontWeight: fontWeight.semibold,
		lineHeight: lineHeight.snug
	},
	bodyLarge: {
		fontSize: fontSize.lg,
		fontWeight: fontWeight.normal,
		lineHeight: lineHeight.normal
	},
	bodyMedium: {
		fontSize: fontSize.base,
		fontWeight: fontWeight.normal,
		lineHeight: lineHeight.normal
	},
	bodySmall: {
		fontSize: fontSize.sm,
		fontWeight: fontWeight.normal,
		lineHeight: lineHeight.normal
	},
	labelLarge: {
		fontSize: fontSize.base,
		fontWeight: fontWeight.medium,
		lineHeight: lineHeight.normal
	},
	labelMedium: {
		fontSize: fontSize.sm,
		fontWeight: fontWeight.medium,
		lineHeight: lineHeight.normal
	},
	labelSmall: {
		fontSize: fontSize.xs,
		fontWeight: fontWeight.medium,
		lineHeight: lineHeight.normal
	}
} as const;

export type TextStyleKey = keyof typeof textStyle;
