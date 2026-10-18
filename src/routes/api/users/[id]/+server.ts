import { json } from '@sveltejs/kit';
import * as usersLogic from '$lib/server/logic/users';
import type { RequestHandler } from './$types';

// GET /api/users/[id] — public profile (no email / private fields)
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const doc = await usersLogic.getPublicOne(id);
		if (!doc) {
			return json({ status: 'error', error: 'user not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		console.error('[api/users/:id] GET', e);
		return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
	}
};
