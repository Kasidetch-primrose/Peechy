import { db } from '$lib/server/db';
import { images } from '$lib/server/db/ImagesModel';
import { imageHints } from '$lib/server/db/ImageHintsModel';
import { eq, isNull, ilike, and, inArray, sql, asc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export type CreateImageData = {
	gameId: number;
	imageUrl: string;
	answer: string;
	gridSize: number;
	orderIndex: number;
	name?: string;
	thumbnailUrl?: string;
	hint?: string;
	timeLimit?: number;
	maxReveal?: number;
};

export type UpdateImageData = Partial<Omit<CreateImageData, 'gameId'>>;

export type PaginateImagesPayload = {
	search?: string;
	gameId?: number;
	page?: number;
	limit?: number;
};

// ---------------------------------------------------------------------------
// Logic functions
// ---------------------------------------------------------------------------

export async function getGameId(id: number): Promise<number | null> {
	const [item] = await db
		.select({ gameId: images.gameId })
		.from(images)
		.where(and(eq(images.id, id), isNull(images.deletedAt)));
	return item?.gameId ?? null;
}

export async function getGameIdsForImages(ids: number[]): Promise<number[]> {
	if (ids.length === 0) return [];
	const rows = await db
		.select({ gameId: images.gameId })
		.from(images)
		.where(and(inArray(images.id, ids), isNull(images.deletedAt)));
	return [...new Set(rows.map((r) => r.gameId))];
}

export async function createOne(data: CreateImageData) {
	const [created] = await db.insert(images).values(data).returning();
	return { ...created, hints: [] };
}

export async function getOne(id: number) {
	const [item] = await db
		.select()
		.from(images)
		.where(and(eq(images.id, id), isNull(images.deletedAt)));
	if (!item) return null;
	const hints = await db
		.select()
		.from(imageHints)
		.where(and(eq(imageHints.imageId, id), isNull(imageHints.deletedAt)))
		.orderBy(asc(imageHints.orderIndex));
	return { ...item, hints };
}

export async function updateOne(id: number, data: UpdateImageData) {
	const [updated] = await db
		.update(images)
		.set(data)
		.where(and(eq(images.id, id), isNull(images.deletedAt)))
		.returning();
	if (!updated) return null;
	const hints = await db
		.select()
		.from(imageHints)
		.where(and(eq(imageHints.imageId, id), isNull(imageHints.deletedAt)))
		.orderBy(asc(imageHints.orderIndex));
	return { ...updated, hints };
}

export async function deleteMany(ids: number[]) {
	if (ids.length === 0) return;
	await db
		.update(images)
		.set({ deletedAt: new Date() })
		.where(and(inArray(images.id, ids), isNull(images.deletedAt)));
}

export async function paginate(payload: PaginateImagesPayload) {
	const page = Math.max(1, payload.page ?? 1);
	const limit = Math.max(1, Math.min(100, payload.limit ?? 20));
	const offset = (page - 1) * limit;

	const where = and(
		isNull(images.deletedAt),
		payload.gameId ? eq(images.gameId, payload.gameId) : undefined,
		payload.search ? ilike(images.name, `%${payload.search}%`) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(images)
		.where(where);

	const items = await db
		.select()
		.from(images)
		.where(where)
		.orderBy(asc(images.orderIndex))
		.limit(limit)
		.offset(offset);

	// Attach hints to each image
	const imageIds = items.map((i) => i.id);
	const hintsRows =
		imageIds.length > 0
			? await db
					.select()
					.from(imageHints)
					.where(and(inArray(imageHints.imageId, imageIds), isNull(imageHints.deletedAt)))
					.orderBy(asc(imageHints.orderIndex))
			: [];

	const hintsByImageId = hintsRows.reduce(
		(acc, h) => {
			(acc[h.imageId] ??= []).push(h);
			return acc;
		},
		{} as Record<number, typeof hintsRows>
	);

	const itemsWithHints = items.map((img) => ({ ...img, hints: hintsByImageId[img.id] ?? [] }));

	const pages = Math.ceil(total / limit) || 1;
	return { items: itemsWithHints, total, pages };
}

// Replace all hints for an image in one shot
export async function syncHints(imageId: number, hints: { hint: string; orderIndex: number }[]) {
	// Soft-delete existing active hints for this image
	await db
		.update(imageHints)
		.set({ deletedAt: new Date() })
		.where(and(eq(imageHints.imageId, imageId), isNull(imageHints.deletedAt)));

	if (hints.length === 0) return [];

	const inserted = await db
		.insert(imageHints)
		.values(hints.map((h) => ({ imageId, hint: h.hint, orderIndex: h.orderIndex })))
		.returning();
	return inserted;
}
