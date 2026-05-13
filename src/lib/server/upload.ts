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

export async function uploadImage(file: File): Promise<{ key: string; url: string }> {
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
	const key = `game-images/${randomUUID()}.${ext}`;

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
