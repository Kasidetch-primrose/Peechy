import { json } from '@sveltejs/kit';
import * as settingsLogic from '$lib/server/logic/settings';
import { requireAdmin } from '$lib/server/admin-auth';
import { HOME_LIMIT_MAX } from '$lib/data/interface/settings';
import type { RequestHandler } from './$types';

function serverErr(scope: string, e: unknown) {
	console.error(`[api/admin/settings/home] ${scope}`, e);
	return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
}

// GET /api/admin/settings/home — home page card counts (admin only)
export const GET: RequestHandler = async ({ request }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;

	try {
		const doc = await settingsLogic.getHomeSettings();
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr('GET', e);
	}
};

// PUT /api/admin/settings/home — JSON { games: { desktop, mobile }, artworks: { desktop, mobile } } (admin only)
export const PUT: RequestHandler = async ({ request }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;

	const input = settingsLogic.parseHomeSettings(await request.json().catch(() => null));
	if (!input) {
		return json(
			{ status: 'error', error: `จำนวนต้องเป็นเลข 0–${HOME_LIMIT_MAX}` },
			{ status: 400 }
		);
	}

	try {
		const doc = await settingsLogic.setHomeSettings(input, admin.userId);
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr('PUT', e);
	}
};
