import { db } from '$lib/server/db';
import { siteSettings } from '$lib/server/db/SettingsModel';
import {
	ANNOUNCEMENT_LIMIT_MAX,
	DEFAULT_ANNOUNCEMENT_SETTINGS,
	type IAnnouncementSettings
} from '$lib/data/interface/announcement';
import { eq } from 'drizzle-orm';

const ANNOUNCEMENTS_KEY = 'announcements';

const isLimit = (v: unknown): v is number =>
	Number.isInteger(v) && (v as number) >= 0 && (v as number) <= ANNOUNCEMENT_LIMIT_MAX;

/** Returns the cleaned settings, or null when a value is missing / out of range. */
export function parseAnnouncementSettings(body: unknown): IAnnouncementSettings | null {
	const b = (body ?? {}) as Record<string, unknown>;
	if (!isLimit(b.maxBanners) || !isLimit(b.maxPopups)) return null;
	return { maxBanners: b.maxBanners, maxPopups: b.maxPopups };
}

/** Stored settings merged over the defaults (a missing row or field falls back to the default). */
export async function getAnnouncementSettings(): Promise<IAnnouncementSettings> {
	const [row] = await db
		.select({ value: siteSettings.value })
		.from(siteSettings)
		.where(eq(siteSettings.key, ANNOUNCEMENTS_KEY))
		.limit(1);
	const stored = (row?.value ?? {}) as Partial<IAnnouncementSettings>;
	return {
		maxBanners: isLimit(stored.maxBanners) ? stored.maxBanners : DEFAULT_ANNOUNCEMENT_SETTINGS.maxBanners,
		maxPopups: isLimit(stored.maxPopups) ? stored.maxPopups : DEFAULT_ANNOUNCEMENT_SETTINGS.maxPopups
	};
}

export async function setAnnouncementSettings(value: IAnnouncementSettings, userId: number) {
	await db
		.insert(siteSettings)
		.values({ key: ANNOUNCEMENTS_KEY, value, updatedBy: userId, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value, updatedBy: userId, updatedAt: new Date() }
		});
	return value;
}
