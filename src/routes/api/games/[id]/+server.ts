import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import { verifyAccessToken } from '$lib/server/auth-service';
import { extractAuth } from '$lib/server/request-auth';
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

// GET /api/games/[id] — GetOne
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const doc = await gamesLogic.getOne(id);
		if (!doc) {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		return serverErr(e);
	}
};

// PUT /api/games/[id] — UpdateOne
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { name, description, difficulty, isPublic, thumbnailUrl, thumbnailPositionX, thumbnailPositionY } = body;

		if (name !== undefined) {
			if (typeof name !== 'string' || !name.trim()) {
				return json({ status: 'error', error: 'name must be a non-empty string' }, { status: 400 });
			}
			if (name.trim().length > 255) {
				return json({ status: 'error', error: 'name must be 255 characters or fewer' }, { status: 400 });
			}
		}
		if (difficulty !== undefined && !ALLOWED_DIFFICULTIES.includes(difficulty)) {
			return json(
				{ status: 'error', error: `difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}` },
				{ status: 400 }
			);
		}
		if (thumbnailUrl && !isValidUrl(thumbnailUrl)) {
			return json({ status: 'error', error: 'thumbnailUrl must be a valid http/https URL' }, { status: 400 });
		}

		const auth = extractAuth(request, body);
		await gamesLogic.verifyGameOwnership(id, auth);

		const doc = await gamesLogic.updateOne(id, {
			name, description, difficulty, isPublic, thumbnailUrl,
			thumbnailPositionX: typeof thumbnailPositionX === 'number' ? thumbnailPositionX : undefined,
			thumbnailPositionY: typeof thumbnailPositionY === 'number' ? thumbnailPositionY : undefined
		});
		if (!doc) {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
		return json({ status: 'success', doc });
	} catch (e) {
		if (e instanceof Error && e.message === 'Unauthorized') {
			return json({ status: 'error', error: 'Unauthorized' }, { status: 403 });
		}
		if (e instanceof Error && e.message === 'Game not found') {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
		return serverErr(e);
	}
};

// DELETE /api/games/[id] — DeleteOne (auth via Bearer token or creatorToken in body)
export const DELETE: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	try {
		const auth: { userId?: number; creatorToken?: string; isAdmin?: boolean } = {};

		const authHeader = request.headers.get('Authorization');
		if (authHeader?.startsWith('Bearer ')) {
			const claims = verifyAccessToken(authHeader.slice(7));
			if (claims) {
				auth.userId = claims.userId;
				auth.isAdmin = claims.isAdmin;
			}
		}

		if (auth.userId === undefined) {
			const body = await request.json().catch(() => ({}));
			if (body.creatorToken && typeof body.creatorToken === 'string') {
				auth.creatorToken = body.creatorToken;
			}
		}

		const deleted = await gamesLogic.deleteOne(id, auth);
		if (!deleted) {
			return json({ status: 'error', error: 'game not found' }, { status: 404 });
		}
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
