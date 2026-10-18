import { json } from '@sveltejs/kit';
import * as usersLogic from '$lib/server/logic/users';
import { extractAuth } from '$lib/server/request-auth';
import type { RequestHandler } from './$types';

// PATCH /api/users/me — JSON { name?, username? }: edit the logged-in user's own profile
export const PATCH: RequestHandler = async ({ request }) => {
	const { userId } = extractAuth(request);
	if (userId === undefined) {
		return json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ status: 'error', error: 'invalid body' }, { status: 400 });
	}

	try {
		const doc = await usersLogic.updateProfile(userId, {
			name: body.name,
			username: body.username
		});
		if (!doc) return json({ status: 'error', error: 'user not found' }, { status: 404 });
		return json({ status: 'success', doc });
	} catch (e) {
		if (e instanceof usersLogic.ProfileInputError) {
			return json({ status: 'error', error: e.message }, { status: 400 });
		}
		console.error('[api/users/me] PATCH', e);
		return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
	}
};
