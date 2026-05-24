import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

// POST /api/games/[id]/play — increment play count
export const POST: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const updated = await gamesLogic.incrementPlayCount(id);
		if (!updated) {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
		return json({ status: 'success', playCount: updated.playCount ?? 0 });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
