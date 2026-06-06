import { json } from '@sveltejs/kit';
import * as imagesLogic from '$lib/server/logic/images';
import type { RequestHandler } from './$types';

function serverErr(e: unknown) {
	const msg =
		process.env.NODE_ENV === 'development'
			? e instanceof Error
				? e.message
				: String(e)
			: 'Internal server error';
	return json({ status: 'error', error: msg }, { status: 500 });
}

function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
}

// POST /api/images — CreateOne
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { gameId, imageUrl, answer, gridSize, orderIndex, timeLimit, maxReveal, thumbnailUrl } = body;

	if (!gameId || typeof gameId !== 'number') {
		return json({ status: 'error', error: 'gameId is required' }, { status: 400 });
	}
	if (!imageUrl || typeof imageUrl !== 'string' || !isValidUrl(imageUrl)) {
		return json({ status: 'error', error: 'imageUrl must be a valid http/https URL' }, { status: 400 });
	}
	if (!answer || typeof answer !== 'string' || !answer.trim()) {
		return json({ status: 'error', error: 'answer is required' }, { status: 400 });
	}
	if (answer.trim().length > 255) {
		return json({ status: 'error', error: 'answer must be 255 characters or fewer' }, { status: 400 });
	}
	if (!Number.isInteger(gridSize) || gridSize < 2 || gridSize > 10) {
		return json({ status: 'error', error: 'gridSize must be an integer between 2 and 10' }, { status: 400 });
	}
	if (orderIndex === undefined || !Number.isInteger(orderIndex) || orderIndex < 0) {
		return json({ status: 'error', error: 'orderIndex must be a non-negative integer' }, { status: 400 });
	}
	if (timeLimit !== undefined && (!Number.isInteger(timeLimit) || timeLimit < 5 || timeLimit > 3600)) {
		return json(
			{ status: 'error', error: 'timeLimit must be an integer between 5 and 3600 seconds' },
			{ status: 400 }
		);
	}
	if (maxReveal !== undefined && (!Number.isInteger(maxReveal) || maxReveal < 1 || maxReveal > gridSize * gridSize)) {
		return json(
			{ status: 'error', error: 'maxReveal must be a positive integer no greater than gridSize²' },
			{ status: 400 }
		);
	}
	if (thumbnailUrl && !isValidUrl(thumbnailUrl)) {
		return json({ status: 'error', error: 'thumbnailUrl must be a valid http/https URL' }, { status: 400 });
	}

	try {
		const doc = await imagesLogic.createOne(body);
		return json({ status: 'success', doc }, { status: 201 });
	} catch (e) {
		return serverErr(e);
	}
};

// DELETE /api/images — DeleteMany (body: { ids: number[] })
export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = await request.json();

	if (!Array.isArray(ids) || ids.length === 0) {
		return json({ status: 'error', error: 'ids array is required' }, { status: 400 });
	}

	try {
		await imagesLogic.deleteMany(ids);
		return json({ status: 'success' });
	} catch (e) {
		return serverErr(e);
	}
};
