import { json } from '@sveltejs/kit';
import * as announcementsLogic from '$lib/server/logic/announcements';
import { requireAdmin } from '$lib/server/admin-auth';
import type { RequestHandler } from './$types';

const badId = () => json({ status: 'error', error: 'invalid id' }, { status: 400 });
const notFound = () => json({ status: 'error', error: 'announcement not found' }, { status: 404 });

function serverErr(scope: string, e: unknown) {
	console.error(`[api/admin/announcements/:id] ${scope}`, e);
	return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
}

// PUT /api/admin/announcements/[id] — replace content (admin only)
export const PUT: RequestHandler = async ({ request, params }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;
	const id = parseInt(params.id);
	if (isNaN(id)) return badId();

	const input = announcementsLogic.parseInput(await request.json().catch(() => null));
	if (typeof input === 'string') return json({ status: 'error', error: input }, { status: 400 });

	try {
		const doc = await announcementsLogic.update(id, input);
		return doc ? json({ status: 'success', doc }) : notFound();
	} catch (e) {
		return serverErr('PUT', e);
	}
};

// PATCH /api/admin/announcements/[id] — JSON { isActive }: on/off switch (admin only)
export const PATCH: RequestHandler = async ({ request, params }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;
	const id = parseInt(params.id);
	if (isNaN(id)) return badId();

	const body = await request.json().catch(() => null);
	if (typeof body?.isActive !== 'boolean') {
		return json({ status: 'error', error: 'isActive must be boolean' }, { status: 400 });
	}

	try {
		const doc = await announcementsLogic.setActive(id, body.isActive);
		return doc ? json({ status: 'success', doc }) : notFound();
	} catch (e) {
		return serverErr('PATCH', e);
	}
};

// DELETE /api/admin/announcements/[id] — soft delete (admin only)
export const DELETE: RequestHandler = async ({ request, params }) => {
	const admin = await requireAdmin(request);
	if (admin instanceof Response) return admin;
	const id = parseInt(params.id);
	if (isNaN(id)) return badId();

	try {
		const doc = await announcementsLogic.softDelete(id);
		return doc ? json({ status: 'success' }) : notFound();
	} catch (e) {
		return serverErr('DELETE', e);
	}
};
