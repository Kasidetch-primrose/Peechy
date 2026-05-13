import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

// GET /api/games/list — ListAll (lightweight list for dropdowns)
export const GET: RequestHandler = async () => {
	try {
		const docs = await gamesLogic.listAll();
		return json({ status: 'success', docs });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
