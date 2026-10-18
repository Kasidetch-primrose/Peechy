import { db } from '$lib/server/db';
import { users } from '$lib/server/db/UserModel';
import { deleteImage, keyFromPublicUrl } from '$lib/server/upload';
import type { IAvatarCrop } from '$lib/data/interface/user';
import { and, eq, isNull } from 'drizzle-orm';

const publicUserFields = {
	id: users.id,
	username: users.username,
	name: users.name,
	avatarUrl: users.avatarUrl,
	avatarCrop: users.avatarCrop
};

export async function getPublicOne(id: number) {
	const [item] = await db
		.select(publicUserFields)
		.from(users)
		.where(and(eq(users.id, id), isNull(users.deletedAt)));
	return item ?? null;
}

/** Best-effort removal of an old avatar file; only touches objects under avatars/. */
async function deleteAvatarFile(url: string | null) {
	if (!url) return;
	const key = keyFromPublicUrl(url);
	if (!key?.startsWith('avatars/')) return;
	try {
		await deleteImage(key);
	} catch (e) {
		console.warn('[users] failed to delete old avatar', key, e);
	}
}

/**
 * Sets the avatar picture and/or crop. Passing a new avatarUrl replaces the
 * previous picture (its R2 object is deleted); omitting it only re-positions.
 */
export async function updateAvatar(
	userId: number,
	data: { avatarUrl?: string; avatarCrop: IAvatarCrop }
) {
	const current = await getPublicOne(userId);
	if (!current) return null;

	const [updated] = await db
		.update(users)
		.set(data.avatarUrl ? { avatarUrl: data.avatarUrl, avatarCrop: data.avatarCrop } : { avatarCrop: data.avatarCrop })
		.where(eq(users.id, userId))
		.returning(publicUserFields);

	if (data.avatarUrl && current.avatarUrl !== data.avatarUrl) {
		await deleteAvatarFile(current.avatarUrl);
	}
	return updated ?? null;
}

export async function removeAvatar(userId: number) {
	const current = await getPublicOne(userId);
	if (!current) return null;

	const [updated] = await db
		.update(users)
		.set({ avatarUrl: null, avatarCrop: null })
		.where(eq(users.id, userId))
		.returning(publicUserFields);

	await deleteAvatarFile(current.avatarUrl);
	return updated ?? null;
}
