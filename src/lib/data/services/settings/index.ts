import { authFetch } from '$lib/data/stores/authUser';
import type { IStatusResponse } from '$lib/data/interface/game';
import type { IHomeSettings } from '$lib/data/interface/settings';

type DocResponse<T> = IStatusResponse & { doc?: T };

export default class SettingsService {
	static async getHome(): Promise<DocResponse<IHomeSettings>> {
		const res = await authFetch('/api/admin/settings/home');
		return res.json();
	}

	static async saveHome(settings: IHomeSettings): Promise<DocResponse<IHomeSettings>> {
		const res = await authFetch('/api/admin/settings/home', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings)
		});
		return res.json();
	}
}
