import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { r2 } from './r2';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

type AllowedMime = (typeof ALLOWED_TYPES)[number];

function isAllowedType(type: string): type is AllowedMime {
	return (ALLOWED_TYPES as readonly string[]).includes(type);
}

function extensionFromMime(mime: AllowedMime): string {
	const map: Record<AllowedMime, string> = {
		'image/png': 'png',
		'image/jpeg': 'jpg',
		'image/webp': 'webp'
	};
	return map[mime];
}

export async function uploadImage(
	file: File,
	folder = 'game-images'
): Promise<{ key: string; url: string }> {
	if (!isAllowedType(file.type)) {
		throw new Error(`Invalid file type: ${file.type}. Allowed: png, jpeg, webp`);
	}

	if (file.size > MAX_SIZE_BYTES) {
		throw new Error(`File too large. Maximum size is 5 MB`);
	}

	if (!env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not set');
	if (!env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is not set');

	const buffer = Buffer.from(await file.arrayBuffer());
	const ext = extensionFromMime(file.type);
	const key = `${folder}/${randomUUID()}.${ext}`;

	await r2.send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: file.type
		})
	);

	const url = `${env.R2_PUBLIC_URL}/${key}`;
	return { key, url };
}

export async function deleteImage(key: string): Promise<void> {
	if (!env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not set');

	await r2.send(
		new DeleteObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key
		})
	);
}

/** Maps a public URL produced by uploadImage/putObject back to its R2 key (null if it is not ours). */
export function keyFromPublicUrl(url: string): string | null {
	const base = env.R2_PUBLIC_URL;
	if (!base || !url.startsWith(`${base}/`)) return null;
	return url.slice(base.length + 1);
}

/** Stores raw bytes at an exact key (used for published artworks) and returns the public URL. */
export async function putObject(key: string, body: Buffer | string, contentType: string): Promise<string> {
	if (!env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not set');
	if (!env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is not set');
	await r2.send(
		new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: body, ContentType: contentType })
	);
	return `${env.R2_PUBLIC_URL}/${key}`;
}
