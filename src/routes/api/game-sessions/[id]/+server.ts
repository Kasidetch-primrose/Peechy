import { json } from '@sveltejs/kit';
import * as sessionsLogic from '$lib/server/logic/game-sessions';
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
		return serverErr(e);
	}
};

// PUT /api/game-sessions/[id] — UpdateOne (save progress)
// Only allows updating progress fields — userId and gameId cannot be changed.
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();

		// Whitelist: only these fields may be updated
		const allowed: sessionsLogic.UpdateSessionData = {};
		if (body.currentImageIndex !== undefined) {
			if (!Number.isInteger(body.currentImageIndex) || body.currentImageIndex < 0) {
				return json({ status: 'error', error: 'currentImageIndex must be a non-negative integer' }, { status: 400 });
			}
			allowed.currentImageIndex = body.currentImageIndex;
		}
		if (body.revealedTiles !== undefined) {
			if (!Array.isArray(body.revealedTiles)) {
				return json({ status: 'error', error: 'revealedTiles must be an array' }, { status: 400 });
			}
			allowed.revealedTiles = body.revealedTiles;
		}
		if (body.undoStack !== undefined) {
			if (!Array.isArray(body.undoStack)) {
				return json({ status: 'error', error: 'undoStack must be an array' }, { status: 400 });
			}
			allowed.undoStack = body.undoStack;
		}
		if (body.score !== undefined) {
			if (!Number.isInteger(body.score) || body.score < 0) {
				return json({ status: 'error', error: 'score must be a non-negative integer' }, { status: 400 });
			}
			allowed.score = body.score;
		}
		if (body.isFinished !== undefined) {
			if (typeof body.isFinished !== 'boolean') {
				return json({ status: 'error', error: 'isFinished must be a boolean' }, { status: 400 });
			}
			allowed.isFinished = body.isFinished;
		}

		const doc = await sessionsLogic.updateOne(id, allowed);
		if (!doc) {
			return json({ status: 'error', error: 'session not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr(e);
	}
};
