import { json } from '@sveltejs/kit';
import * as announcementsLogic from '$lib/server/logic/announcements';
import { requireAdmin } from '$lib/server/admin-auth';
import type { RequestHandler } from './$types';

function serverErr(scope: string, e: unknown) {
	console.error(`[api/admin/announcements] ${scope}`, e);
	return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
}

// GET /api/admin/announcements — every announcement, incl. inactive / scheduled (admin only)
export const GET: RequestHandler = async ({ request }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;

	try {
		const docs = await announcementsLogic.listAll();
		return json({ status: 'success', docs });
	} catch (e) {
		return serverErr('GET', e);
	}
};

// POST /api/admin/announcements — create (admin only)
export const POST: RequestHandler = async ({ request }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;

	const input = announcementsLogic.parseInput(await request.json().catch(() => null));
	if (typeof input === 'string') return json({ status: 'error', error: input }, { status: 400 });

	try {
		const doc = await announcementsLogic.create(input, admin.userId);
		return json({ status: 'success', doc }, { status: 201 });
	} catch (e) {
		return serverErr('POST', e);
	}
};
