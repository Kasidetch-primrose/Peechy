import { db } from '$lib/server/db';
import { announcements } from '$lib/server/db/AnnouncementsModel';
import {
	ANNOUNCEMENT_DISPLAYS,
	ANNOUNCEMENT_TONES,
	type AnnouncementDisplay,
	type AnnouncementTone,
	type IAnnouncementInput
} from '$lib/data/interface/announcement';
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';

const publicFields = {
	id: announcements.id,
	title: announcements.title,
	message: announcements.message,
	tone: announcements.tone,
	display: announcements.display,
	linkUrl: announcements.linkUrl,
	linkLabel: announcements.linkLabel,
	updatedAt: announcements.updatedAt
};

const adminFields = {
	...publicFields,
	isActive: announcements.isActive,
	startsAt: announcements.startsAt,
	endsAt: announcements.endsAt,
	createdAt: announcements.createdAt
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Parsed = Omit<IAnnouncementInput, 'startsAt' | 'endsAt'> & {
	startsAt: Date | null;
	endsAt: Date | null;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Only same-site paths ("/games") or http(s) URLs — blocks javascript:, data:, protocol-relative "//". */
function parseLink(v: unknown): string | null | undefined {
	const s = str(v);
	if (!s) return null;
	if (s.length > 500) return undefined;
	if (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\')) return s;
	try {
		const u = new URL(s);
		return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined;
	} catch {
		return undefined;
	}
}

function parseDate(v: unknown): Date | null | undefined {
	if (v === null || v === undefined || v === '') return null;
	if (typeof v !== 'string') return undefined;
	const d = new Date(v);
	return isNaN(d.getTime()) ? undefined : d;
}

/** Returns the cleaned input, or an error message (Thai, shown in the CMS). */
export function parseInput(body: unknown): Parsed | string {
	const b = (body ?? {}) as Record<string, unknown>;

	const title = str(b.title);
	const message = str(b.message);
	if (!title || title.length > 120) return 'หัวข้อต้องมี 1–120 ตัวอักษร';
	if (!message || message.length > 1000) return 'ข้อความต้องมี 1–1000 ตัวอักษร';

	if (!ANNOUNCEMENT_TONES.includes(b.tone as AnnouncementTone)) return 'โทนสีไม่ถูกต้อง';
	if (!ANNOUNCEMENT_DISPLAYS.includes(b.display as AnnouncementDisplay))
		return 'รูปแบบการแสดงผลไม่ถูกต้อง';

	const linkUrl = parseLink(b.linkUrl);
	if (linkUrl === undefined) return 'ลิงก์ต้องขึ้นต้นด้วย / หรือ https://';
	const linkLabel = str(b.linkLabel) || null;
	if (linkLabel && linkLabel.length > 60) return 'ข้อความปุ่มลิงก์ยาวเกิน 60 ตัวอักษร';

	const startsAt = parseDate(b.startsAt);
	const endsAt = parseDate(b.endsAt);
	if (startsAt === undefined || endsAt === undefined) return 'วันเวลาไม่ถูกต้อง';
	if (startsAt && endsAt && endsAt <= startsAt) return 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม';

	return {
		title,
		message,
		tone: b.tone as AnnouncementTone,
		display: b.display as AnnouncementDisplay,
		linkUrl,
		linkLabel: linkUrl ? linkLabel : null,
		isActive: b.isActive === true,
		startsAt,
		endsAt
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Announcements switched on and inside their schedule window right now, newest edit first. */
export async function getActive() {
	const now = new Date();
	return db
		.select(publicFields)
		.from(announcements)
		.where(
			and(
				isNull(announcements.deletedAt),
				eq(announcements.isActive, true),
				or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
				or(isNull(announcements.endsAt), gte(announcements.endsAt, now))
			)
		)
		.orderBy(desc(announcements.updatedAt))
		.limit(10);
}

export async function listAll() {
	return db
		.select(adminFields)
		.from(announcements)
		.where(isNull(announcements.deletedAt))
		.orderBy(desc(announcements.updatedAt));
}

export async function create(data: Parsed, createdBy: number) {
	const [doc] = await db
		.insert(announcements)
		.values({ ...data, createdBy, updatedAt: new Date() })
		.returning(adminFields);
	return doc;
}

/** Content edits bump updatedAt, which re-shows the popup to visitors who closed the old version. */
export async function update(id: number, data: Parsed) {
	const [doc] = await db
		.update(announcements)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(announcements.id, id), isNull(announcements.deletedAt)))
		.returning(adminFields);
	return doc ?? null;
}

/** On/off switch only — leaves updatedAt alone so re-enabling doesn't re-pop a closed popup. */
export async function setActive(id: number, isActive: boolean) {
	const [doc] = await db
		.update(announcements)
		.set({ isActive })
		.where(and(eq(announcements.id, id), isNull(announcements.deletedAt)))
		.returning(adminFields);
	return doc ?? null;
}

export async function softDelete(id: number) {
	const [doc] = await db
		.update(announcements)
		.set({ deletedAt: new Date() })
		.where(and(eq(announcements.id, id), isNull(announcements.deletedAt)))
		.returning({ id: announcements.id });
	return doc ?? null;
}
