import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import * as gamesLogic from '$lib/server/logic/games';
import { extractAuth } from '$lib/server/request-auth';
import type { RequestHandler } from './$types';

const MAX_HINT_LENGTH = 500;

function serverErr(e: unknown) {
	const msg =
		process.env.NODE_ENV === 'development'
			? e instanceof Error
				? e.message
				: String(e)
			: 'Internal server error';
	return json({ status: 'error', error: msg }, { status: 500 });
}

// POST /api/images/[id]/hints — Sync hints for an image
// Body: { hints: { hint: string; orderIndex: number }[] }
export const POST: RequestHandler = async ({ params, request }) => {
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

		if (!Array.isArray(body.hints)) {
			return json({ status: 'error', error: 'hints must be an array' }, { status: 400 });
		}

		const hints: { hint: string; orderIndex: number }[] = [];
		for (const item of body.hints) {
			if (typeof item.hint !== 'string' || !item.hint.trim()) continue;
			if (item.hint.trim().length > MAX_HINT_LENGTH) {
				return json(
					{ status: 'error', error: `Each hint must be ${MAX_HINT_LENGTH} characters or fewer` },
					{ status: 400 }
				);
			}
			if (!Number.isInteger(item.orderIndex) || item.orderIndex < 0) {
				return json({ status: 'error', error: 'orderIndex must be a non-negative integer' }, { status: 400 });
			}
			hints.push({ hint: item.hint.trim(), orderIndex: item.orderIndex });
		}

		const auth = extractAuth(request, body);
		await gamesLogic.verifyGameOwnership(gameId, auth);

		const docs = await imagesLogic.syncHints(id, hints);
		return json({ status: 'success', docs });
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
