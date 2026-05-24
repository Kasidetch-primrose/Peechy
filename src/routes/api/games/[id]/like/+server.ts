import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

// POST /api/games/[id]/like — toggle current user's like/favorite
export const POST: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const userId = Number(body?.userId);
		if (!userId) {
			return json({ status: 'error', error: 'userId is required' }, { status: 400 });
		}

		const result = await gamesLogic.toggleLike(id, userId);
		return json({ status: 'success', liked: result.liked, likes: result.likes });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
