const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // matches the server limit in $lib/server/upload.ts

export interface PreparedImage {
	url: string;
	aspect: number; // natural width / height
	name: string;
}

function validate(file: File) {
	if (!ALLOWED_TYPES.includes(file.type)) throw new Error('รองรับเฉพาะไฟล์ PNG, JPEG หรือ WebP');
	if (file.size > MAX_BYTES) throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 5 MB)');
}

function displayName(file: File): string {
	return file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'รูปต้นแบบ';
}

// Loads the file just to read its natural aspect ratio (width / height).
function readAspect(file: File): Promise<number> {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(objectUrl);
			if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img.naturalWidth / img.naturalHeight);
			else reject(new Error('อ่านขนาดรูปไม่ได้'));
		};
		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('เปิดไฟล์รูปนี้ไม่ได้'));
		};
		img.src = objectUrl;
	});
}

/**
 * Uploads a trace image to R2 through the existing /api/upload-image endpoint.
 * The image itself never travels over the socket — only the URL does. Every
 * trace image goes through here, whether it ends up public or private.
 */
export async function uploadReferenceImage(file: File): Promise<PreparedImage> {
	validate(file);
	const aspect = await readAspect(file);

	const body = new FormData();
	body.append('file', file);
	const res = await fetch('/api/upload-image', { method: 'POST', body });
	const data: { status: string; url?: string; error?: string } = await res.json();
	if (data.status !== 'success' || !data.url) throw new Error(data.error ?? 'อัปโหลดรูปไม่สำเร็จ');
	return { url: data.url, aspect, name: displayName(file) };
}
