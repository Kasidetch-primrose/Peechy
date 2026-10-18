import * as settingsLogic from '$lib/server/logic/settings';
import { DEFAULT_HOME_SETTINGS } from '$lib/data/interface/settings';
import type { PageServerLoad } from './$types';

// Card counts per section come from the CMS; the cards themselves still load client-side.
export const load: PageServerLoad = async () => {
	const home = await settingsLogic.getHomeSettings().catch((e) => {
		console.error('[home] settings', e);
		return DEFAULT_HOME_SETTINGS;
	});
	return { home };
};
