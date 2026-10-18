export const ANNOUNCEMENT_TONES = ['info', 'success', 'warning', 'event'] as const;
export const ANNOUNCEMENT_DISPLAYS = ['banner', 'popup', 'both'] as const;

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
