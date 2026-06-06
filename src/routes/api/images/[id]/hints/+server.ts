import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import type { RequestHandler } from './$types';

// POST /api/images/[id]/hints/sync
// Body: { hints: { hint: string; orderIndex: number }[] }
export const POST: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const hints: { hint: string; orderIndex: number }[] = Array.isArray(body.hints)
			? body.hints
			: [];
		const docs = await imagesLogic.syncHints(id, hints);
		return json({ status: 'success', docs });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
