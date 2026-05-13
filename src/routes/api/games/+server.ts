import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

// POST /api/games — CreateOne
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { name, description, creatorId, difficulty, isPublic } = body;

	if (!name || !creatorId) {
		return json({ status: 'error', error: 'name and creatorId are required' }, { status: 400 });
	}

	try {
		const doc = await gamesLogic.createOne({ name, description, creatorId, difficulty, isPublic });
		return json({ status: 'success', doc }, { status: 201 });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// DELETE /api/games — DeleteMany (body: { ids: number[] })
export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = await request.json();

	if (!Array.isArray(ids) || ids.length === 0) {
		return json({ status: 'error', error: 'ids array is required' }, { status: 400 });
	}

	try {
		await gamesLogic.deleteMany(ids);
		return json({ status: 'success' });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
