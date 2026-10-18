import type { IAvatarCrop } from '$lib/data/interface/user';

export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Picture size relative to the (square) circle box: at zoom 1 its short side equals the box. */
export function avatarImageSize(crop: Pick<IAvatarCrop, 'zoom' | 'aspect'>) {
	return {
		w: crop.zoom * Math.max(1, crop.aspect),
		h: crop.zoom * Math.max(1, 1 / crop.aspect)
	};
}

/** Keeps zoom in range and the centre far enough from the edges that the circle never shows empty space. */
export function clampAvatarCrop(crop: IAvatarCrop): IAvatarCrop {
	const zoom = clamp(crop.zoom, AVATAR_MIN_ZOOM, AVATAR_MAX_ZOOM);
	const aspect = crop.aspect > 0 && Number.isFinite(crop.aspect) ? crop.aspect : 1;
	const { w, h } = avatarImageSize({ zoom, aspect });
	const halfX = 0.5 / w;
	const halfY = 0.5 / h;
	return {
		x: clamp(crop.x, halfX, 1 - halfX),
		y: clamp(crop.y, halfY, 1 - halfY),
		zoom,
		aspect
	};
}

/** Inline style that places the picture inside a relatively-positioned, overflow-hidden square box. */
export function avatarImageStyle(crop: IAvatarCrop): string {
	const c = clampAvatarCrop(crop);
	const { w, h } = avatarImageSize(c);
	const pct = (n: number) => `${(n * 100).toFixed(3)}%`;
	return `position:absolute;max-width:none;width:${pct(w)};height:${pct(h)};left:${pct(0.5 - c.x * w)};top:${pct(0.5 - c.y * h)};`;
}

/** Validates an untrusted crop object (e.g. from a request body). */
export function parseAvatarCrop(value: unknown): IAvatarCrop | null {
	if (!value || typeof value !== 'object') return null;
	const v = value as Record<string, unknown>;
	const nums = [v.x, v.y, v.zoom, v.aspect];
	if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
	if ((v.aspect as number) <= 0) return null;
	return clampAvatarCrop({
		x: v.x as number,
		y: v.y as number,
		zoom: v.zoom as number,
		aspect: v.aspect as number
	});
}

/** Up to two initials from a display name, for the no-picture fallback. */
export function avatarInitials(name: string | null | undefined): string {
	return (name ?? '')
		.trim()
		.split(/\s+/)
		.map((w) => w[0] ?? '')
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

/**
 * Browser-only: re-encodes a picked picture at most `maxSide` px on its long side
 * (keeps uploads small and bakes in EXIF rotation). The crop stays valid because
 * the aspect ratio is unchanged.
 */
export async function downscaleAvatarSource(img: HTMLImageElement, maxSide = 1024): Promise<Blob> {
	const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
	canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas not supported');
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	const encode = (type: string, quality?: number) =>
		new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
	// Safari can't encode WebP and silently returns PNG; fall back to JPEG to stay small.
	const webp = await encode('image/webp', 0.9);
	if (webp?.type === 'image/webp') return webp;
	// JPEG has no transparency — put white behind it instead of black.
	ctx.globalCompositeOperation = 'destination-over';
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	const jpeg = await encode('image/jpeg', 0.9);
	if (!jpeg) throw new Error('Could not encode image');
	return jpeg;
}
