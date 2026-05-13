import { json } from '@sveltejs/kit';
import * as sessionsLogic from '$lib/server/logic/game-sessions';
import type { RequestHandler } from './$types';

// GET /api/game-sessions/[id] — GetOne
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const doc = await sessionsLogic.getOne(id);
		if (!doc) {
			return json({ status: 'error', error: 'session not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// PUT /api/game-sessions/[id] — UpdateOne (save progress)
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const doc = await sessionsLogic.updateOne(id, body);
		if (!doc) {
			return json({ status: 'error', error: 'session not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
