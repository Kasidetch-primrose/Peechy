import { db } from '$lib/server/db';
import { images } from '$lib/server/db/ImagesModel';
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

export async function createOne(data: CreateImageData) {
	const [created] = await db.insert(images).values(data).returning();
	return created;
}

export async function getOne(id: number) {
	const [item] = await db
		.select()
		.from(images)
		.where(and(eq(images.id, id), isNull(images.deletedAt)));
	return item ?? null;
}

export async function updateOne(id: number, data: UpdateImageData) {
	const [updated] = await db
		.update(images)
		.set(data)
		.where(and(eq(images.id, id), isNull(images.deletedAt)))
		.returning();
	return updated ?? null;
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

	const pages = Math.ceil(total / limit) || 1;
	return { items, total, pages };
}
