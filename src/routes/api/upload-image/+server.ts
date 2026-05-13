import { json } from '@sveltejs/kit';
import { uploadImage } from '$lib/server/upload';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		return json({ status: 'error', error: 'No file uploaded' }, { status: 400 });
	}

	try {
		const result = await uploadImage(file);
		return json({ status: 'success', key: result.key, url: result.url }, { status: 201 });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 400 });
	}
};
