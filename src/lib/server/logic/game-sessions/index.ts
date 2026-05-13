import { db } from '$lib/server/db';
import { gameSessions } from '$lib/server/db/GamesModel';
import { eq, isNull, and, inArray, sql, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export type CreateSessionData = {
	userId: number;
	gameId: number;
	currentImageIndex?: number;
	revealedTiles?: number[];
	undoStack?: number[][];
	score?: number;
	isFinished?: boolean;
};

export type UpdateSessionData = Partial<Omit<CreateSessionData, 'userId' | 'gameId'>>;

export type PaginateSessionsPayload = {
	userId?: number;
	gameId?: number;
	isFinished?: boolean;
	page?: number;
	limit?: number;
};

// ---------------------------------------------------------------------------
// Logic functions
// ---------------------------------------------------------------------------

export async function createOne(data: CreateSessionData) {
	const [created] = await db.insert(gameSessions).values(data).returning();
	return created;
}

export async function getOne(id: number) {
	const [item] = await db
		.select()
		.from(gameSessions)
		.where(and(eq(gameSessions.id, id), isNull(gameSessions.deletedAt)));
	return item ?? null;
}

export async function updateOne(id: number, data: UpdateSessionData) {
	const [updated] = await db
		.update(gameSessions)
		.set(data)
		.where(and(eq(gameSessions.id, id), isNull(gameSessions.deletedAt)))
		.returning();
	return updated ?? null;
}

export async function deleteMany(ids: number[]) {
	if (ids.length === 0) return;
	await db
		.update(gameSessions)
		.set({ deletedAt: new Date() })
		.where(and(inArray(gameSessions.id, ids), isNull(gameSessions.deletedAt)));
}

export async function paginate(payload: PaginateSessionsPayload) {
	const page = Math.max(1, payload.page ?? 1);
	const limit = Math.max(1, Math.min(100, payload.limit ?? 20));
	const offset = (page - 1) * limit;

	const where = and(
		isNull(gameSessions.deletedAt),
		payload.userId ? eq(gameSessions.userId, payload.userId) : undefined,
		payload.gameId ? eq(gameSessions.gameId, payload.gameId) : undefined,
		payload.isFinished !== undefined ? eq(gameSessions.isFinished, payload.isFinished) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(gameSessions)
		.where(where);

	const items = await db
		.select()
		.from(gameSessions)
		.where(where)
		.orderBy(desc(gameSessions.createdAt))
		.limit(limit)
		.offset(offset);

	const pages = Math.ceil(total / limit) || 1;
	return { items, total, pages };
}
