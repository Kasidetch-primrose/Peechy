import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

// POST /api/games/paginate — Paginate
// Body: { search?: string, difficulty?: string, creatorId?: number, isPublic?: boolean, page?: number, limit?: number }
export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();
		const { items, total, pages } = await gamesLogic.paginate(payload);
		return json({ status: 'success', docs: items, total, pages });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
