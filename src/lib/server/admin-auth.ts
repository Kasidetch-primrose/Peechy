import { json } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { users } from './db/UserModel';
import { verifyAccessToken } from './auth-service';

/**
 * Resolves the caller as an admin, or returns the error Response to send back.
 * The JWT's isAdmin claim is not trusted on its own: is_admin is re-read from the
 * database on every call, so revoking an admin (or deleting the user) takes effect
 * immediately instead of when their 24h access token expires.
 */
export async function requireAdmin(request: Request): Promise<{ userId: number } | Response> {
	const header = request.headers.get('Authorization');
	const claims = header?.startsWith('Bearer ') ? verifyAccessToken(header.slice(7)) : null;
	if (!claims) return json({ status: 'error', error: 'Unauthorized' }, { status: 401 });

	const [user] = await db
		.select({ isAdmin: users.isAdmin })
		.from(users)
		.where(and(eq(users.id, claims.userId), isNull(users.deletedAt)))
		.limit(1);

	if (!user?.isAdmin) return json({ status: 'error', error: 'Forbidden' }, { status: 403 });
	return { userId: claims.userId };
}
