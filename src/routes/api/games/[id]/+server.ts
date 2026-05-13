import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

// GET /api/games/[id] — GetOne
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const doc = await gamesLogic.getOne(id);
		if (!doc) {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// PUT /api/games/[id] — UpdateOne
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const doc = await gamesLogic.updateOne(id, body);
		if (!doc) {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
