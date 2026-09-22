const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // matches the server limit in $lib/server/upload.ts

function measureAspect(file: File): Promise<number> {
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
 * Uploads a trace image to R2 through the existing /api/upload-image endpoint
 * and returns its public URL plus natural aspect ratio (width / height).
 * The image itself never travels over the socket — only the URL does.
 */
export async function uploadReferenceImage(file: File): Promise<{ url: string; aspect: number }> {
	if (!ALLOWED_TYPES.includes(file.type)) throw new Error('รองรับเฉพาะไฟล์ PNG, JPEG หรือ WebP');
	if (file.size > MAX_BYTES) throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 5 MB)');

	const aspect = await measureAspect(file);

	const body = new FormData();
	body.append('file', file);
	const res = await fetch('/api/upload-image', { method: 'POST', body });
	const data: { status: string; url?: string; error?: string } = await res.json();
	if (data.status !== 'success' || !data.url) throw new Error(data.error ?? 'อัปโหลดรูปไม่สำเร็จ');
	return { url: data.url, aspect };
}
