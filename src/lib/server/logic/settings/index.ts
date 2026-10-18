import { db } from '$lib/server/db';
import { siteSettings } from '$lib/server/db/SettingsModel';
import {
	DEFAULT_HOME_SETTINGS,
	HOME_LIMIT_MAX,
	HOME_SECTIONS,
	type IHomeSectionLimit,
	type IHomeSettings
} from '$lib/data/interface/settings';
import { eq } from 'drizzle-orm';

const HOME_KEY = 'home';

const isLimit = (v: unknown): v is number =>
	Number.isInteger(v) && (v as number) >= 0 && (v as number) <= HOME_LIMIT_MAX;

/** Reads one section, taking each field that is valid and falling back to `fallback` otherwise. */
function readSection(
	raw: unknown,
	fallback: IHomeSectionLimit,
	strict: true
): IHomeSectionLimit | null;
function readSection(raw: unknown, fallback: IHomeSectionLimit, strict: false): IHomeSectionLimit;
function readSection(raw: unknown, fallback: IHomeSectionLimit, strict: boolean) {
	const r = (raw ?? {}) as Record<string, unknown>;
	if (strict && (!isLimit(r.desktop) || !isLimit(r.mobile))) return null;
	return {
		desktop: isLimit(r.desktop) ? r.desktop : fallback.desktop,
		mobile: isLimit(r.mobile) ? r.mobile : fallback.mobile
	};
}

/** Returns the cleaned settings, or null when any value is missing / out of range. */
export function parseHomeSettings(body: unknown): IHomeSettings | null {
	const b = (body ?? {}) as Record<string, unknown>;
	const out = {} as IHomeSettings;
	for (const key of HOME_SECTIONS) {
		const section = readSection(b[key], DEFAULT_HOME_SETTINGS[key], true);
		if (!section) return null;
		out[key] = section;
	}
	return out;
}

/** Stored settings merged over the defaults (a missing row or field falls back to the default). */
export async function getHomeSettings(): Promise<IHomeSettings> {
	const [row] = await db
		.select({ value: siteSettings.value })
		.from(siteSettings)
		.where(eq(siteSettings.key, HOME_KEY))
		.limit(1);
	const stored = (row?.value ?? {}) as Record<string, unknown>;
	const out = {} as IHomeSettings;
	for (const key of HOME_SECTIONS) {
		out[key] = readSection(stored[key], DEFAULT_HOME_SETTINGS[key], false);
	}
	return out;
}

export async function setHomeSettings(value: IHomeSettings, userId: number) {
	await db
		.insert(siteSettings)
		.values({ key: HOME_KEY, value, updatedBy: userId, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value, updatedBy: userId, updatedAt: new Date() }
		});
	return value;
}
