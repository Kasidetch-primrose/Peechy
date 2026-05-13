import { json } from '@sveltejs/kit';
import * as sessionsLogic from '$lib/server/logic/game-sessions';
import type { RequestHandler } from './$types';

// POST /api/game-sessions — CreateOne
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { userId, gameId } = body;

	if (!userId || !gameId) {
		return json({ status: 'error', error: 'userId and gameId are required' }, { status: 400 });
	}

	try {
		const doc = await sessionsLogic.createOne(body);
		return json({ status: 'success', doc }, { status: 201 });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// DELETE /api/game-sessions — DeleteMany (body: { ids: number[] })
export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = await request.json();

	if (!Array.isArray(ids) || ids.length === 0) {
		return json({ status: 'error', error: 'ids array is required' }, { status: 400 });
	}

	try {
		await sessionsLogic.deleteMany(ids);
		return json({ status: 'success' });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
