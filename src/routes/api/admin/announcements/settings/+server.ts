import { json } from '@sveltejs/kit';
import * as settingsLogic from '$lib/server/logic/settings';
import { requireAdmin } from '$lib/server/admin-auth';
import { ANNOUNCEMENT_LIMIT_MAX } from '$lib/data/interface/announcement';
import type { RequestHandler } from './$types';

function serverErr(scope: string, e: unknown) {
	console.error(`[api/admin/announcements/settings] ${scope}`, e);
	return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
}

// GET /api/admin/announcements/settings — display limits (admin only)
export const GET: RequestHandler = async ({ request }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;

	try {
		const doc = await settingsLogic.getAnnouncementSettings();
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr('GET', e);
	}
};

// PUT /api/admin/announcements/settings — JSON { maxBanners, maxPopups } (admin only)
export const PUT: RequestHandler = async ({ request }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;

	const input = settingsLogic.parseAnnouncementSettings(await request.json().catch(() => null));
	if (!input) {
		return json(
			{ status: 'error', error: `จำนวนต้องเป็นเลข 0–${ANNOUNCEMENT_LIMIT_MAX}` },
			{ status: 400 }
		);
	}

	try {
		const doc = await settingsLogic.setAnnouncementSettings(input, admin.userId);
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr('PUT', e);
	}
};
