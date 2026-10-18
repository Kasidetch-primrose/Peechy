import { db } from '$lib/server/db';
import { users } from '$lib/server/db/UserModel';
import { deleteImage, keyFromPublicUrl } from '$lib/server/upload';
import {
	NAME_MAX_LENGTH,
	USERNAME_MAX_LENGTH,
	hasControlChars,
	type IAvatarCrop
} from '$lib/data/interface/user';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';

/** Thrown for input problems; the message is shown to the user as-is. */
export class ProfileInputError extends Error {}

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

/**
 * Updates the display name and/or username. A username may be any text (Thai, spaces, symbols)
 * up to USERNAME_MAX_LENGTH; only invisible control characters are refused. It is always shown
 * through escaped text, never as HTML or in a URL. Uniqueness is case-insensitive
 * ("Peach" and "peach" can't both exist).
 */
export async function updateProfile(
	userId: number,
	data: { name?: unknown; username?: unknown }
) {
	const current = await getPublicOne(userId);
	if (!current) return null;

	const patch: { name?: string | null; username?: string } = {};

	if (data.name !== undefined) {
		if (data.name !== null && typeof data.name !== 'string') throw new ProfileInputError('ชื่อไม่ถูกต้อง');
		const name = (data.name ?? '').trim();
		if (hasControlChars(name)) throw new ProfileInputError('ชื่อมีอักขระที่ใช้ไม่ได้');
		if (name.length > NAME_MAX_LENGTH) {
			throw new ProfileInputError(`ชื่อยาวได้ไม่เกิน ${NAME_MAX_LENGTH} ตัวอักษร`);
		}
		patch.name = name || null;
	}

	if (data.username !== undefined) {
		if (typeof data.username !== 'string') throw new ProfileInputError('ชื่อผู้ใช้ไม่ถูกต้อง');
		const username = data.username.trim();
		if (username !== current.username) {
			if (!username) throw new ProfileInputError('กรุณาใส่ชื่อผู้ใช้');
			if (username.length > USERNAME_MAX_LENGTH) {
				throw new ProfileInputError(`ชื่อผู้ใช้ยาวได้ไม่เกิน ${USERNAME_MAX_LENGTH} ตัวอักษร`);
			}
			if (hasControlChars(username)) throw new ProfileInputError('ชื่อผู้ใช้มีอักขระที่ใช้ไม่ได้');
			const [taken] = await db
				.select({ id: users.id })
				.from(users)
				.where(and(sql`lower(${users.username}) = lower(${username})`, ne(users.id, userId)))
				.limit(1);
			if (taken) throw new ProfileInputError('ชื่อผู้ใช้นี้มีคนใช้แล้ว');
			patch.username = username;
		}
	}

	if (Object.keys(patch).length === 0) return current;

	try {
		const [updated] = await db
			.update(users)
			.set(patch)
			.where(and(eq(users.id, userId), isNull(users.deletedAt)))
			.returning(publicUserFields);
		return updated ?? null;
	} catch (e) {
		// Lost a race with someone taking the same username (unique constraint).
		if ((e as { code?: string }).code === '23505') {
			throw new ProfileInputError('ชื่อผู้ใช้นี้มีคนใช้แล้ว');
		}
		throw e;
	}
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
