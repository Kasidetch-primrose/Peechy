import { authFetch } from '$lib/data/stores/authUser';
import type { IAvatarCrop, IAvatarResponse, IPublicUser } from '$lib/data/interface/user';
import type { IStatusResponse, ISingleResponse } from '$lib/data/interface/game';

export default class UserService {
	static async getOne(id: number): Promise<ISingleResponse<IPublicUser> & IStatusResponse> {
		const res = await fetch(`/api/users/${id}`);
		return res.json();
	}

	/** Edits the logged-in user's display name and/or username. */
	static async updateProfile(data: {
		name?: string | null;
		username?: string;
	}): Promise<Partial<ISingleResponse<IPublicUser>> & IStatusResponse> {
		const res = await authFetch('/api/users/me', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.json();
	}

	/** Uploads a new picture and the circle position chosen for it. */
	static async uploadAvatar(
		file: Blob,
		crop: IAvatarCrop
	): Promise<IAvatarResponse> {
		const fd = new FormData();
		fd.append('file', file, `avatar.${file.type.split('/')[1] ?? 'webp'}`);
		fd.append('crop', JSON.stringify(crop));
		const res = await authFetch('/api/users/me/avatar', {
			method: 'POST',
			body: fd
		});
		return res.json();
	}

	/** Re-positions the circle on the current picture. */
	static async updateAvatarCrop(crop: IAvatarCrop): Promise<IAvatarResponse> {
		const res = await authFetch('/api/users/me/avatar', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ crop })
		});
		return res.json();
	}

	static async removeAvatar(): Promise<IAvatarResponse> {
		const res = await authFetch('/api/users/me/avatar', { method: 'DELETE' });
		return res.json();
	}
}
