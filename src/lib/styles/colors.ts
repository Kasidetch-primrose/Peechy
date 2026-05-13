// ─── Primary (Peach Brand) ───────────────────────────────────────────────────
export const primary = {
	100: '#FFE5DC',
	400: '#FFB199',
	500: '#FF9B73',
	600: '#E87C5A'
} as const;

// ─── Secondary (Support / Fun) ───────────────────────────────────────────────
export const secondary = {
	yellow: '#FFD166',
	green: '#6BCB77',
	blue: '#4D96FF'
} as const;

// ─── Neutral (UI / Readability) ──────────────────────────────────────────────
export const gray = {
	100: '#F3F4F6',
	200: '#E5E7EB',
	400: '#9CA3AF',
	700: '#4B5563',
	900: '#1F2937'
} as const;

export const white = '#FFFFFF' as const;

// ─── Semantic ────────────────────────────────────────────────────────────────
export const semantic = {
	success: '#6BCB77',
	error: '#FF6B6B',
	warning: '#FFD166',
	info: '#4D96FF'
} as const;

// ─── Button States ───────────────────────────────────────────────────────────
export const button = {
	primary: {
		default: '#FF9B73',
		hover: '#FFB199',
		active: '#E87C5A',
		disabled: '#FFD8CC',
		text: '#FFFFFF'
	},
	secondary: {
		default: '#FFFFFF',
		border: '#FF9B73',
		text: '#FF9B73',
		hover: '#FFE5DC',
		active: '#FFB199'
	},
	ghost: {
		default: 'transparent',
		text: '#FF9B73',
		hover: '#FFE5DC'
	}
} as const;

// ─── Focus ───────────────────────────────────────────────────────────────────
export const focus = '#FFB199' as const;

// ─── Flat map (for easy lookup) ──────────────────────────────────────────────
export const AppColors = {
	primary,
	secondary,
	gray,
	white,
	semantic,
	button,
	focus
} as const;

export type AppColor = typeof AppColors;
