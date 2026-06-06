import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
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

		const docs = await imagesLogic.syncHints(id, hints);
		return json({ status: 'success', docs });
	} catch (e) {
		return serverErr(e);
	}
};
