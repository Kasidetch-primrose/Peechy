import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import type { RequestHandler } from './$types';

// GET /api/images/[id] — GetOne
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const doc = await imagesLogic.getOne(id);
		if (!doc) {
			return json({ status: 'error', error: 'image not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// PUT /api/images/[id] — UpdateOne
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const doc = await imagesLogic.updateOne(id, body);
		if (!doc) {
			return json({ status: 'error', error: 'image not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
