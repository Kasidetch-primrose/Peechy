import { json } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { artworks, artworkCollaborators } from '$lib/server/db/ArtworksModel';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/artworks/:id — every published artwork is public.
export const GET: RequestHandler = async ({ params }) => {
	try {
		if (!UUID.test(params.id)) return json({ status: 'error', error: 'Not found' }, { status: 404 });
		const [art] = await db
			.select()
			.from(artworks)
			.where(and(eq(artworks.id, params.id), isNull(artworks.deletedAt)));
		if (!art) return json({ status: 'error', error: 'Not found' }, { status: 404 });

		const collaborators = await db
			.select({
				displayName: artworkCollaborators.displayName,
				role: artworkCollaborators.role,
				userId: artworkCollaborators.userId
			})
			.from(artworkCollaborators)
			.where(eq(artworkCollaborators.artworkId, art.id));

		const { sourceUrl: _sourceUrl, deletedAt: _deletedAt, ...doc } = art;
		return json({ status: 'success', doc: { ...doc, collaborators } });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
