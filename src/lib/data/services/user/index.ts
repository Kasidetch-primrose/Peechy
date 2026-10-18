import type { IAvatarCrop, IAvatarResponse, IPublicUser } from '$lib/data/interface/user';
import type { IStatusResponse, ISingleResponse } from '$lib/data/interface/game';

export default class UserService {
	static async getOne(id: number): Promise<ISingleResponse<IPublicUser> & IStatusResponse> {
		const res = await fetch(`/api/users/${id}`);
		return res.json();
	}

	/** Uploads a new picture and the circle position chosen for it. */
	static async uploadAvatar(
		file: Blob,
		crop: IAvatarCrop,
		accessToken: string
	): Promise<IAvatarResponse> {
		const fd = new FormData();
		fd.append('file', file, `avatar.${file.type.split('/')[1] ?? 'webp'}`);
		fd.append('crop', JSON.stringify(crop));
		const res = await fetch('/api/users/me/avatar', {
			method: 'POST',
			headers: { Authorization: `Bearer ${accessToken}` },
			body: fd
		});
		return res.json();
	}

	/** Re-positions the circle on the current picture. */
	static async updateAvatarCrop(crop: IAvatarCrop, accessToken: string): Promise<IAvatarResponse> {
		const res = await fetch('/api/users/me/avatar', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
			body: JSON.stringify({ crop })
		});
		return res.json();
	}

	static async removeAvatar(accessToken: string): Promise<IAvatarResponse> {
		const res = await fetch('/api/users/me/avatar', {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		return res.json();
	}
}
