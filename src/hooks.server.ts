import type { Handle } from '@sveltejs/kit';
import { purgeExpiredAnonymousGames } from '$lib/server/logic/games';

// Fire-and-forget on server startup — cleans up anonymous games older than 60 days
purgeExpiredAnonymousGames().catch((e) =>
	console.error('[purge] anonymous games cleanup failed:', e)
);

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
