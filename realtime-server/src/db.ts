import postgres from 'postgres';
import type { ImageData } from './types.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sql = postgres(DATABASE_URL);

export async function getGameImages(gameId: number): Promise<ImageData[]> {
	const rows = await sql<
		{
			id: number;
			image_url: string;
			answer: string;
			hints: { id: number; hint: string; orderIndex: number }[];
			grid_size: number;
			max_reveal: number | null;
		}[]
	>`
		select i.id, i.image_url, i.answer, i.grid_size, i.max_reveal,
			coalesce(h.hints, '[]'::json) as hints
		from images i
		left join lateral (
			select json_agg(
				json_build_object('id', ih.id, 'hint', ih.hint, 'orderIndex', ih.order_index)
				order by ih.order_index asc
			) as hints
			from image_hints ih
			where ih.image_id = i.id and ih.deleted_at is null
		) h on true
		where i.game_id = ${gameId} and i.deleted_at is null
		order by i.order_index asc
	`;
	return rows.map((row) => ({
		id: row.id,
		imageUrl: row.image_url,
		answer: row.answer,
		hints: row.hints,
		gridSize: row.grid_size,
		maxReveal: row.max_reveal
	}));
}

export async function persistMultiplayerResults(params: {
	code: string;
	gameId: number;
	hostId: number;
	scores: { userId: number; score: number }[];
}): Promise<void> {
	const ranked = [...params.scores].sort((a, b) => b.score - a.score);

	await sql.begin(async (tx) => {
		const [room] = await tx<{ id: number }[]>`
			insert into multiplayer_rooms (code, game_id, host_id, finished_at)
			values (${params.code}, ${params.gameId}, ${params.hostId}, now())
			returning id
		`;
		for (let i = 0; i < ranked.length; i++) {
			const entry = ranked[i];
			await tx`
				insert into multiplayer_results (room_id, user_id, score, rank)
				values (${room.id}, ${entry.userId}, ${entry.score}, ${i + 1})
			`;
		}
	});
}
