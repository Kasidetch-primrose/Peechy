import { json } from '@sveltejs/kit';
import * as sessionsLogic from '$lib/server/logic/game-sessions';
import type { RequestHandler } from './$types';

// POST /api/game-sessions/paginate
// Body: { userId?: number, gameId?: number, isFinished?: boolean, page?: number, limit?: number }
export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();
		const { items, total, pages } = await sessionsLogic.paginate(payload);
		return json({ status: 'success', docs: items, total, pages });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
