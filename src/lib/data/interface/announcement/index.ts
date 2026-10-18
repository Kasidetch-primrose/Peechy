export const ANNOUNCEMENT_TONES = ['info', 'success', 'warning', 'event'] as const;
export const ANNOUNCEMENT_DISPLAYS = ['banner', 'popup', 'both'] as const;

/** How many announcements the home page shows at once (set in the CMS). */
export interface IAnnouncementSettings {
	/** Banners on screen at the same time; closing one lets the next in line show. 0 = none. */
	maxBanners: number;
	/** Popups that may pop, one after another, in a single visit to the home page. 0 = none. */
	maxPopups: number;
}

export const ANNOUNCEMENT_LIMIT_MAX = 10;
export const DEFAULT_ANNOUNCEMENT_SETTINGS: IAnnouncementSettings = { maxBanners: 3, maxPopups: 1 };

export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];
export type AnnouncementDisplay = (typeof ANNOUNCEMENT_DISPLAYS)[number];

/** What the home page receives (public). */
export interface IPublicAnnouncement {
	id: number;
	title: string;
	message: string;
	tone: AnnouncementTone;
	display: AnnouncementDisplay;
	linkUrl: string | null;
	linkLabel: string | null;
	updatedAt: string;
}

/** Full row as seen in the admin CMS. */
export interface IAnnouncement extends IPublicAnnouncement {
	isActive: boolean;
	startsAt: string | null;
	endsAt: string | null;
	createdAt: string;
}

export interface IAnnouncementInput {
	title: string;
	message: string;
	tone: AnnouncementTone;
	display: AnnouncementDisplay;
	linkUrl: string | null;
	linkLabel: string | null;
	isActive: boolean;
	startsAt: string | null;
	endsAt: string | null;
}
