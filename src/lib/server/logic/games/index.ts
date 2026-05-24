import { db } from '$lib/server/db';
import { games } from '$lib/server/db/GamesModel';
import { userGameLikes } from '$lib/server/db/UserModel';
import { eq, isNull, ilike, and, inArray, sql, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Payload types (mirrors Go's dto/request_search pattern)
// ---------------------------------------------------------------------------

export type CreateGameData = {
	name: string;
	description?: string;
	creatorId: number | null;
	difficulty?: string;
	isPublic?: boolean;
	thumbnailUrl?: string;
};

export type UpdateGameData = Partial<Omit<CreateGameData, 'creatorId'>>;

export type PaginateGamesPayload = {
	search?: string;
	difficulty?: string;
	creatorId?: number;
	isPublic?: boolean;
	viewerUserId?: number;
	page?: number;
	limit?: number;
};

// ---------------------------------------------------------------------------
// Logic functions (mirrors Go logic/project/main.go)
// ---------------------------------------------------------------------------

export async function createOne(data: CreateGameData) {
	const [created] = await db.insert(games).values(data).returning();
	return created;
}

export async function getOne(id: number) {
	const [item] = await db
		.select()
		.from(games)
		.where(and(eq(games.id, id), isNull(games.deletedAt)));
	return item ?? null;
}

export async function updateOne(id: number, data: UpdateGameData) {
	const [updated] = await db
		.update(games)
		.set(data)
		.where(and(eq(games.id, id), isNull(games.deletedAt)))
		.returning();
	return updated ?? null;
}

export async function deleteMany(ids: number[]) {
	if (ids.length === 0) return;
	await db
		.update(games)
		.set({ deletedAt: new Date() })
		.where(and(inArray(games.id, ids), isNull(games.deletedAt)));
}

export async function paginate(payload: PaginateGamesPayload) {
	const page = Math.max(1, payload.page ?? 1);
	const limit = Math.max(1, Math.min(100, payload.limit ?? 20));
	const offset = (page - 1) * limit;

	const where = and(
		isNull(games.deletedAt),
		payload.search ? ilike(games.name, `%${payload.search}%`) : undefined,
		payload.difficulty ? eq(games.difficulty, payload.difficulty) : undefined,
		payload.creatorId ? eq(games.creatorId, payload.creatorId) : undefined,
		payload.isPublic !== undefined ? eq(games.isPublic, payload.isPublic) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(games)
		.where(where);

	const items = await db
		.select()
		.from(games)
		.where(where)
		.orderBy(desc(games.createdAt))
		.limit(limit)
		.offset(offset);

	let itemsWithLiked = items.map((item) => ({ ...item, isLiked: false }));

	if (payload.viewerUserId && items.length > 0) {
		const likedRows = await db
			.select({ gameId: userGameLikes.gameId })
			.from(userGameLikes)
			.where(
				and(
					eq(userGameLikes.userId, payload.viewerUserId),
					inArray(
						userGameLikes.gameId,
						items.map((item) => item.id)
					)
				)
			);

		const likedSet = new Set(likedRows.map((row) => row.gameId));
		itemsWithLiked = items.map((item) => ({ ...item, isLiked: likedSet.has(item.id) }));
	}

	const pages = Math.ceil(total / limit) || 1;
	return { items: itemsWithLiked, total, pages };
}

export async function listAll() {
	return db
		.select({ id: games.id, name: games.name, difficulty: games.difficulty })
		.from(games)
		.where(isNull(games.deletedAt))
		.orderBy(games.name);
}

export async function incrementPlayCount(id: number) {
	const [updated] = await db
		.update(games)
		.set({ playCount: sql`coalesce(${games.playCount}, 0) + 1` })
		.where(and(eq(games.id, id), isNull(games.deletedAt)))
		.returning({ id: games.id, playCount: games.playCount });

	return updated ?? null;
}

export async function toggleLike(gameId: number, userId: number) {
	const existing = await db
		.select({ gameId: userGameLikes.gameId })
		.from(userGameLikes)
		.where(and(eq(userGameLikes.gameId, gameId), eq(userGameLikes.userId, userId)))
		.limit(1);

	const hasLiked = existing.length > 0;

	if (hasLiked) {
		await db
			.delete(userGameLikes)
			.where(and(eq(userGameLikes.gameId, gameId), eq(userGameLikes.userId, userId)));

		const [updated] = await db
			.update(games)
			.set({ likes: sql`greatest(coalesce(${games.likes}, 0) - 1, 0)` })
			.where(and(eq(games.id, gameId), isNull(games.deletedAt)))
			.returning({ likes: games.likes });

		return { liked: false, likes: updated?.likes ?? 0 };
	}

	await db.insert(userGameLikes).values({ gameId, userId }).onConflictDoNothing();

	const [updated] = await db
		.update(games)
		.set({ likes: sql`coalesce(${games.likes}, 0) + 1` })
		.where(and(eq(games.id, gameId), isNull(games.deletedAt)))
		.returning({ likes: games.likes });

	return { liked: true, likes: updated?.likes ?? 1 };
}
