import { verifyAccessToken } from './auth-service';

export type RequestAuth = { userId?: number; creatorToken?: string };

/**
 * Resolves the caller's identity for ownership checks: a logged-in user's
 * Bearer JWT takes priority, falling back to an anonymous creatorToken
 * from the request body (used for games/images created while logged out).
 */
export function extractAuth(request: Request, body?: Record<string, unknown> | null): RequestAuth {
	const auth: RequestAuth = {};

	const authHeader = request.headers.get('Authorization');
	if (authHeader?.startsWith('Bearer ')) {
		const claims = verifyAccessToken(authHeader.slice(7));
		if (claims) auth.userId = claims.userId;
	}

	if (auth.userId === undefined && body && typeof body.creatorToken === 'string') {
		auth.creatorToken = body.creatorToken;
	}

	return auth;
}
