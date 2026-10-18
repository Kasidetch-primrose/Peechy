import { json } from '@sveltejs/kit';
import * as announcementsLogic from '$lib/server/logic/announcements';
import * as settingsLogic from '$lib/server/logic/settings';
import { DEFAULT_ANNOUNCEMENT_SETTINGS } from '$lib/data/interface/announcement';
import type { RequestHandler } from './$types';

// GET /api/announcements — currently live announcements + display limits for the home page (public)
export const GET: RequestHandler = async ({ setHeaders }) => {
	try {
		const [docs, settings] = await Promise.all([
			announcementsLogic.getActive(),
			// Limits are optional: fall back to defaults rather than hide every announcement.
			settingsLogic.getAnnouncementSettings().catch((e) => {
				console.error('[api/announcements] settings', e);
				return DEFAULT_ANNOUNCEMENT_SETTINGS;
			})
		]);
		// Short cache: an edit in the CMS shows up for visitors within ~30s.
		setHeaders({ 'cache-control': 'public, max-age=30' });
		return json({ status: 'success', docs, settings });
	} catch (e) {
		console.error('[api/announcements] GET', e);
		return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
	}
};
