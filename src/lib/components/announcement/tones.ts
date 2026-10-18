import type { AnnouncementDisplay, AnnouncementTone } from '$lib/data/interface/announcement';

export const TONE_STYLES: Record<
	AnnouncementTone,
	{ label: string; icon: string; box: string; chip: string; button: string }
> = {
	info: {
		label: 'ข่าวสาร',
		icon: '📢',
		box: 'border-sky-200 bg-gradient-to-r from-sky-50 to-white',
		chip: 'bg-secondary-sky/60 text-sky-900',
		button: 'bg-sky-500 hover:bg-sky-400'
	},
	success: {
		label: 'อัปเดตใหม่',
		icon: '✨',
		box: 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-white',
		chip: 'bg-secondary-mint/70 text-emerald-900',
		button: 'bg-emerald-500 hover:bg-emerald-400'
	},
	warning: {
		label: 'แจ้งเตือน',
		icon: '⚠️',
		box: 'border-amber-200 bg-gradient-to-r from-amber-50 to-white',
		chip: 'bg-secondary-yellow/80 text-amber-900',
		button: 'bg-amber-500 hover:bg-amber-400'
	},
	event: {
		label: 'กิจกรรม',
		icon: '🎉',
		box: 'border-primary-200 bg-gradient-to-r from-primary-100 via-primary-50 to-secondary-lavender/30',
		chip: 'bg-primary-200 text-primary-600',
		button: 'bg-primary-500 hover:bg-primary-400'
	}
};

export const DISPLAY_LABELS: Record<AnnouncementDisplay, string> = {
	banner: 'แถบด้านบน',
	popup: 'ป๊อปอัป',
	both: 'แถบ + ป๊อปอัป'
};

/** External links open in a new tab; site paths navigate in place. */
export const isExternal = (url: string) => /^https?:\/\//i.test(url);
