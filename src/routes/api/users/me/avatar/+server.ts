import { json } from '@sveltejs/kit';
import * as usersLogic from '$lib/server/logic/users';
import { uploadImage, deleteImage } from '$lib/server/upload';
import { extractAuth } from '$lib/server/request-auth';
import { parseAvatarCrop } from '$lib/utils/avatar';
import type { RequestHandler } from './$types';

const unauthorized = () => json({ status: 'error', error: 'Unauthorized' }, { status: 401 });

function serverErr(scope: string, e: unknown) {
	console.error(`[api/users/me/avatar] ${scope}`, e);
	return json({ status: 'error', error: 'Internal server error' }, { status: 500 });
}

function avatarJson(doc: { avatarUrl: string | null; avatarCrop: unknown }) {
	return json({ status: 'success', avatarUrl: doc.avatarUrl, avatarCrop: doc.avatarCrop });
}

// POST /api/users/me/avatar — multipart: file (new picture) + crop (JSON)
export const POST: RequestHandler = async ({ request }) => {
	const { userId } = extractAuth(request);
	if (userId === undefined) return unauthorized();

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		return json({ status: 'error', error: 'No file uploaded' }, { status: 400 });
	}

	let crop;
	try {
		crop = parseAvatarCrop(JSON.parse(String(formData.get('crop') ?? '')));
	} catch {
		crop = null;
	}
	if (!crop) return json({ status: 'error', error: 'invalid crop' }, { status: 400 });

	let uploaded: { key: string; url: string };
	try {
		uploaded = await uploadImage(file, 'avatars');
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 400 });
	}

	try {
		const doc = await usersLogic.updateAvatar(userId, { avatarUrl: uploaded.url, avatarCrop: crop });
		if (!doc) {
			await deleteImage(uploaded.key).catch(() => {});
			return json({ status: 'error', error: 'user not found' }, { status: 404 });
		}
		return avatarJson(doc);
	} catch (e) {
		await deleteImage(uploaded.key).catch(() => {});
		return serverErr('POST', e);
	}
};

// PATCH /api/users/me/avatar — JSON { crop }: re-position the existing picture
export const PATCH: RequestHandler = async ({ request }) => {
	const { userId } = extractAuth(request);
	if (userId === undefined) return unauthorized();

	const body = await request.json().catch(() => null);
	const crop = parseAvatarCrop(body?.crop);
	if (!crop) return json({ status: 'error', error: 'invalid crop' }, { status: 400 });

	try {
		const current = await usersLogic.getPublicOne(userId);
		if (!current) return json({ status: 'error', error: 'user not found' }, { status: 404 });
		if (!current.avatarUrl) {
			return json({ status: 'error', error: 'no avatar to adjust' }, { status: 400 });
		}
		const doc = await usersLogic.updateAvatar(userId, { avatarCrop: crop });
		return doc ? avatarJson(doc) : json({ status: 'error', error: 'user not found' }, { status: 404 });
	} catch (e) {
		return serverErr('PATCH', e);
	}
};

// DELETE /api/users/me/avatar — back to the initials avatar
export const DELETE: RequestHandler = async ({ request }) => {
	const { userId } = extractAuth(request);
	if (userId === undefined) return unauthorized();

	try {
		const doc = await usersLogic.removeAvatar(userId);
		return doc ? avatarJson(doc) : json({ status: 'error', error: 'user not found' }, { status: 404 });
	} catch (e) {
		return serverErr('DELETE', e);
	}
};
