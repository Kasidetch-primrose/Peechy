import { authFetch } from '$lib/data/stores/authUser';
import type { IStatusResponse } from '$lib/data/interface/game';
import type {
	IAnnouncement,
	IAnnouncementInput,
	IPublicAnnouncement
} from '$lib/data/interface/announcement';

type DocsResponse<T> = IStatusResponse & { docs?: T[] };
type DocResponse<T> = IStatusResponse & { doc?: T };

export default class AnnouncementService {
	/** Live announcements for the home page. */
	static async getActive(): Promise<DocsResponse<IPublicAnnouncement>> {
		const res = await fetch('/api/announcements');
		return res.json();
	}

	// ── Admin CMS ───────────────────────────────────────────────────────────
	static async list(): Promise<DocsResponse<IAnnouncement>> {
		const res = await authFetch('/api/admin/announcements');
		return res.json();
	}

	static async create(input: IAnnouncementInput): Promise<DocResponse<IAnnouncement>> {
		const res = await authFetch('/api/admin/announcements', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		return res.json();
	}

	static async update(id: number, input: IAnnouncementInput): Promise<DocResponse<IAnnouncement>> {
		const res = await authFetch(`/api/admin/announcements/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		return res.json();
	}

	static async setActive(id: number, isActive: boolean): Promise<DocResponse<IAnnouncement>> {
		const res = await authFetch(`/api/admin/announcements/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isActive })
		});
		return res.json();
	}

	static async remove(id: number): Promise<IStatusResponse> {
		const res = await authFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
		return res.json();
	}
}
