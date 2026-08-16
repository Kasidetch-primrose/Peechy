import { json } from '@sveltejs/kit';
import * as gamesLogic from '$lib/server/logic/games';
import { verifyAccessToken } from '$lib/server/auth-service';
import type { RequestHandler } from './$types';

// POST /api/games/[id]/like — toggle current user's like/favorite
export const POST: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return json({ status: 'error', error: 'invalid id' }, { status: 400 });
	}

	const authHeader = request.headers.get('Authorization');
	const claims = authHeader?.startsWith('Bearer ') ? verifyAccessToken(authHeader.slice(7)) : null;
	if (!claims) {
		return json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const result = await gamesLogic.toggleLike(id, claims.userId);
		return json({ status: 'success', liked: result.liked, likes: result.likes });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
