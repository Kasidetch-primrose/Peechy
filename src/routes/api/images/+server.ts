import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import type { RequestHandler } from './$types';

// POST /api/images — CreateOne
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { gameId, imageUrl, answer, gridSize, orderIndex } = body;

	if (!gameId || !imageUrl || !answer || !gridSize || orderIndex === undefined) {
		return json(
			{ status: 'error', error: 'gameId, imageUrl, answer, gridSize, orderIndex are required' },
			{ status: 400 }
		);
	}

	try {
		const doc = await imagesLogic.createOne(body);
		return json({ status: 'success', doc }, { status: 201 });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// DELETE /api/images — DeleteMany (body: { ids: number[] })
export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = await request.json();

	if (!Array.isArray(ids) || ids.length === 0) {
		return json({ status: 'error', error: 'ids array is required' }, { status: 400 });
	}

	try {
		await imagesLogic.deleteMany(ids);
		return json({ status: 'success' });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
