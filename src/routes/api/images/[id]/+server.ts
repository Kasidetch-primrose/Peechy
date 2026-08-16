import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import * as gamesLogic from '$lib/server/logic/games';
import { extractAuth } from '$lib/server/request-auth';
import type { RequestHandler } from './$types';

function serverErr(e: unknown) {
	const msg =
		process.env.NODE_ENV === 'development'
			? e instanceof Error
				? e.message
				: String(e)
			: 'Internal server error';
	return json({ status: 'error', error: msg }, { status: 500 });
}

// GET /api/images/[id] — GetOne
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const doc = await imagesLogic.getOne(id);
		if (!doc) {
			return json({ status: 'error', error: 'image not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr(e);
	}
};

// PUT /api/images/[id] — UpdateOne
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const gameId = await imagesLogic.getGameId(id);
		if (gameId === null) {
			return json({ status: 'error', error: 'image not found' }, { status: 404 });
		}

		const body = await request.json();
		const auth = extractAuth(request, body);
		await gamesLogic.verifyGameOwnership(gameId, auth);

		const doc = await imagesLogic.updateOne(id, body);
		if (!doc) {
			return json({ status: 'error', error: 'image not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		if (e instanceof Error && e.message === 'Unauthorized') {
			return json({ status: 'error', error: 'Unauthorized' }, { status: 403 });
		}
		if (e instanceof Error && e.message === 'Game not found') {
			return json({ status: 'error', error: 'image not found' }, { status: 404 });
		}
		return serverErr(e);
	}
};
