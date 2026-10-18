import { json } from '@sveltejs/kit';
import * as announcementsLogic from '$lib/server/logic/announcements';
import type { RequestHandler } from './$types';

// GET /api/announcements — currently live announcements for the home page (public)
export const GET: RequestHandler = async ({ setHeaders }) => {
	try {
		const docs = await announcementsLogic.getActive();
		// Short cache: an edit in the CMS shows up for visitors within ~30s.
		setHeaders({ 'cache-control': 'public, max-age=30' });
		return json({ status: 'success', docs });
	} catch (e) {
		console.error('[api/announcements] GET', e);
		return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
	}
};
