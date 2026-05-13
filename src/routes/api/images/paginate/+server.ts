import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import type { RequestHandler } from './$types';

// POST /api/images/paginate
// Body: { search?: string, gameId?: number, page?: number, limit?: number }
export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();
		const { items, total, pages } = await imagesLogic.paginate(payload);
		return json({ status: 'success', docs: items, total, pages });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
