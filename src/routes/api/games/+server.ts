import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import type { RequestHandler } from './$types';

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

function serverErr(e: unknown) {
	const msg =
		process.env.NODE_ENV === 'development'
			? e instanceof Error
				? e.message
				: String(e)
			: 'Internal server error';
	return json({ status: 'error', error: msg }, { status: 500 });
}

// POST /api/games — CreateOne
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { name, description, creatorId, difficulty, isPublic, thumbnailUrl } = body;

	if (!name || typeof name !== 'string' || !name.trim()) {
		return json({ status: 'error', error: 'name is required' }, { status: 400 });
	}
	if (name.trim().length > 255) {
		return json({ status: 'error', error: 'name must be 255 characters or fewer' }, { status: 400 });
	}
	if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty)) {
		return json(
			{ status: 'error', error: `difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}` },
			{ status: 400 }
		);
	}
	if (thumbnailUrl && !isValidUrl(thumbnailUrl)) {
		return json({ status: 'error', error: 'thumbnailUrl must be a valid http/https URL' }, { status: 400 });
	}

	try {
		const creatorToken = crypto.randomUUID();
		const doc = await gamesLogic.createOne({
			name: name.trim(),
			description,
			creatorId: creatorId ?? null,
			creatorToken,
			difficulty,
			isPublic,
			thumbnailUrl
		});
		return json({ status: 'success', doc: { ...doc, creatorToken } }, { status: 201 });
	} catch (e) {
		return serverErr(e);
	}
};

// DELETE /api/games — DeleteMany (body: { ids: number[], creatorToken: string })
export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { ids, creatorToken } = body;

	if (!Array.isArray(ids) || ids.length === 0) {
		return json({ status: 'error', error: 'ids array is required' }, { status: 400 });
	}
	if (!creatorToken || typeof creatorToken !== 'string') {
		return json({ status: 'error', error: 'creatorToken is required' }, { status: 400 });
	}

	try {
		await gamesLogic.deleteWithToken(ids, creatorToken);
		return json({ status: 'success' });
	} catch (e) {
		if (e instanceof Error && e.message === 'Unauthorized') {
			return json({ status: 'error', error: 'Unauthorized' }, { status: 403 });
		}
		return serverErr(e);
	}
};

function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
}
