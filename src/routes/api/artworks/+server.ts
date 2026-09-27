import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, exists, inArray, isNull, or, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { artworks, artworkCollaborators } from '$lib/server/db/ArtworksModel';
import { users } from '$lib/server/db/UserModel';
import { extractAuth } from '$lib/server/request-auth';
import { putObject } from '$lib/server/upload';
import type { RequestHandler } from './$types';

const MAX_PNG_BYTES = 8 * 1024 * 1024;
const MAX_THUMB_BYTES = 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RATIOS: Record<string, number> = { '4:3': 4 / 3, '16:9': 16 / 9, '1:1': 1, '3:4': 3 / 4 };

interface Snapshot {
	roomCode: string;
	ratio: string;
	strokes: unknown[];
	players: { id: string; name: string }[];
	initiatorId: string;
	meta: { title: string; description: string; creatorName: string };
}

/** Width/height from a PNG's IHDR chunk, or null when it isn't a PNG. */
function pngSize(buf: Buffer): { width: number; height: number } | null {
	if (buf.length < 24 || PNG_SIGNATURE.some((b, i) => buf[i] !== b)) return null;
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// GET /api/artworks?page=1&limit=24[&userId=5] — the gallery, newest first. With userId it
// lists what that user created or helped draw (their profile gallery).
export const GET: RequestHandler = async ({ url }) => {
	try {
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit')) || 24));
		const userId = Number(url.searchParams.get('userId'));
		const where = and(
			isNull(artworks.deletedAt),
			Number.isInteger(userId) && userId > 0
				? or(
						eq(artworks.creatorId, userId),
						exists(
							db
								.select({ one: sql`1` })
								.from(artworkCollaborators)
								.where(
									and(eq(artworkCollaborators.artworkId, artworks.id), eq(artworkCollaborators.userId, userId))
								)
						)
					)
				: undefined
		);

		const rows = await db
			.select({
				id: artworks.id,
				title: artworks.title,
				imageUrl: artworks.imageUrl,
				thumbnailUrl: artworks.thumbnailUrl,
				canvasRatio: artworks.canvasRatio,
				creatorName: artworks.creatorName,
				publishedAt: artworks.publishedAt,
				// Fully qualified on purpose: drizzle prints bare column names here, and an unqualified "id" would bind to the inner table.
				collaborators: sql<number>`(select count(*)::int from artwork_collaborators c where c.artwork_id = artworks.id)`
			})
			.from(artworks)
			.where(where)
			.orderBy(desc(artworks.publishedAt))
			.limit(limit)
			.offset((page - 1) * limit);
		const [{ total }] = await db
			.select({ total: sql<number>`count(*)::int` })
			.from(artworks)
			.where(where);

		return json({ status: 'success', docs: rows, total, pages: Math.max(1, Math.ceil(total / limit)) });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};

// POST /api/artworks — multipart: ticket, image (PNG), thumbnail (WebP, optional).
// Title / visibility / who was there come from the realtime server's frozen
// snapshot behind the ticket, never from the browser.
export const POST: RequestHandler = async ({ request }) => {
	try {
		// A logged-in user whose access token has expired must not silently publish as a
		// guest: answer 401 (before the one-time ticket is spent) so the client can refresh.
		const auth = extractAuth(request);
		if (request.headers.get('Authorization') && auth.userId === undefined) {
			return json({ status: 'error', error: 'Access token expired' }, { status: 401 });
		}

		const form = await request.formData();
		const ticket = form.get('ticket');
		const image = form.get('image');
		const thumb = form.get('thumbnail');
		if (typeof ticket !== 'string' || !/^[0-9a-f]{48}$/.test(ticket)) {
			return json({ status: 'error', error: 'Invalid ticket' }, { status: 400 });
		}
		if (!(image instanceof File) || image.size === 0 || image.size > MAX_PNG_BYTES) {
			return json({ status: 'error', error: 'Missing or too large image' }, { status: 400 });
		}
		const png = Buffer.from(await image.arrayBuffer());
		const size = pngSize(png);
		if (!size || size.width < 1 || size.height < 1) {
			return json({ status: 'error', error: 'Image must be a PNG' }, { status: 400 });
		}
		let thumbBuf: Buffer | null = null;
		if (thumb instanceof File && thumb.size > 0) {
			if (thumb.size > MAX_THUMB_BYTES || thumb.type !== 'image/webp') {
				return json({ status: 'error', error: 'Invalid thumbnail' }, { status: 400 });
			}
			thumbBuf = Buffer.from(await thumb.arrayBuffer());
		}

		// Redeem the one-time ticket from the realtime server.
		if (!env.INTERNAL_SECRET) throw new Error('INTERNAL_SECRET is not set');
		const base = env.REALTIME_INTERNAL_URL || 'http://localhost:4001';
		const res = await fetch(`${base}/internal/publish-ticket/${ticket}`, {
			headers: { 'x-internal-secret': env.INTERNAL_SECRET }
		});
		if (res.status === 404) {
			return json({ status: 'error', error: 'Ticket expired or already used' }, { status: 410 });
		}
		if (!res.ok) throw new Error(`Realtime server refused the ticket (${res.status})`);
		const snapshot = (await res.json()) as Snapshot;

		// The PNG must match the room's paper shape.
		const expected = RATIOS[snapshot.ratio];
		if (!expected || Math.abs(size.width / size.height - expected) > 0.05) {
			return json({ status: 'error', error: 'Image does not match the canvas ratio' }, { status: 400 });
		}

		const creatorId = auth.userId ?? null;
		let creatorName = snapshot.meta.creatorName;
		if (creatorId !== null) {
			const [u] = await db.select({ username: users.username }).from(users).where(eq(users.id, creatorId));
			if (!creatorName) creatorName = u?.username ?? '';
		}
		if (!creatorName) creatorName = snapshot.players.find((p) => p.id === snapshot.initiatorId)?.name ?? 'Guest';

		const id = randomUUID();
		const prefix = `artworks/${id}`;
		const imageUrl = await putObject(`${prefix}/original.png`, png, 'image/png');
		const thumbnailUrl = thumbBuf ? await putObject(`${prefix}/thumbnail.webp`, thumbBuf, 'image/webp') : null;
		const sourceUrl = await putObject(
			`${prefix}/source.json`,
			JSON.stringify({ ratio: snapshot.ratio, strokes: snapshot.strokes }),
			'application/json'
		);

		// Account ids that really exist (a player id is just a string from the browser).
		const numericIds = [...new Set(snapshot.players.map((p) => p.id).filter((s) => /^\d{1,9}$/.test(s)).map(Number))];
		const knownIds = numericIds.length
			? new Set((await db.select({ id: users.id }).from(users).where(inArray(users.id, numericIds))).map((u) => u.id))
			: new Set<number>();

		await db.transaction(async (tx) => {
			await tx.insert(artworks).values({
				id,
				title: snapshot.meta.title,
				description: snapshot.meta.description || null,
				imageUrl,
				thumbnailUrl,
				sourceUrl,
				canvasRatio: snapshot.ratio,
				creatorId,
				creatorName: creatorName.slice(0, 60)
			});
			await tx.insert(artworkCollaborators).values(
				snapshot.players.map((p) => {
					const numeric = /^\d{1,9}$/.test(p.id) ? Number(p.id) : null;
					return {
						artworkId: id,
						userId: numeric !== null && knownIds.has(numeric) ? numeric : null,
						displayName: p.name.slice(0, 60),
						role: p.id === snapshot.initiatorId ? 'creator' : 'collaborator'
					};
				})
			);
		});

		return json({ status: 'success', id, title: snapshot.meta.title }, { status: 201 });
	} catch (e) {
		return json({ status: 'error', error: (e as Error).message }, { status: 500 });
	}
};
