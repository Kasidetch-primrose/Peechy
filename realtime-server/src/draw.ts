import type { Server } from 'socket.io';
import * as rooms from './drawRoomManager.js';
import { randomBytes } from 'node:crypto';
import {
	DRAW_RATIOS,
	type DrawPlayer,
	type DrawRatio,
	type DrawReference,
	type DrawRoomState,
	type Point,
	type Stroke
} from './types.js';

// Single-process MVP: strokes are ephemeral and don't need to survive a
// server restart, so they live in memory keyed by room code — mirrors the
// roomImages/roomTimers pattern in game.ts.
const roomStrokes = new Map<string, Stroke[]>();
const MAX_STROKES_PER_ROOM = 3000;

// Rooms live in Redis (survive a server restart) but this map doesn't, so a
// room can exist with no entry here. Always go through this instead of
// assuming createRoom() ran in this process — otherwise strokes are silently
// dropped and undo/clear do nothing after a restart.
function strokesFor(code: string): Stroke[] {
	let strokes = roomStrokes.get(code);
	if (!strokes) {
		strokes = [];
		roomStrokes.set(code, strokes);
	}
	return strokes;
}

export async function createRoom(
	hostId: string,
	ratio: unknown
): Promise<{ code: string; room: DrawRoomState }> {
	const safeRatio: DrawRatio = (DRAW_RATIOS as readonly unknown[]).includes(ratio)
		? (ratio as DrawRatio)
		: '4:3';
	let code = rooms.generateRoomCode();
	while (await rooms.roomExists(code)) code = rooms.generateRoomCode();

	const room = await rooms.createRoom({ code, hostId, ratio: safeRatio });
	// The room code loop above only guarantees `code` is free in Redis. These
	// process-memory caches have no TTL of their own and are normally only ever
	// written for a code once it's created, but if this process previously ran a
	// DIFFERENT room that used the same code (its Redis entry has since expired,
	// freeing the code for reuse) their leftover entries would otherwise leak that
	// old room's strokes/reference images into this brand new one.
	roomStrokes.set(code, []);
	roomSeq.delete(code);
	roomDroppedUpTo.delete(code);
	roomReferences.delete(code);
	roomPaperRatio.delete(code);
	refControl.delete(code);
	return { code, room };
}

export async function joinRoom(
	code: string,
	playerId: string,
	playerName: string
): Promise<{
	room: DrawRoomState;
	players: DrawPlayer[];
	strokes: Stroke[];
	references: DrawReference[];
	referenceControllers: Record<string, { playerId: string; name: string }>;
} | null> {
	const room = await rooms.getRoom(code);
	if (!room) return null;

	const existing = await rooms.getPlayer(code, playerId);
	const player: DrawPlayer = existing
		? { ...existing, connected: true }
		: { id: playerId, name: playerName, connected: true, joinedAt: Date.now() };
	await rooms.addPlayer(code, player);

	const players = await rooms.getAllPlayers(code);
	const strokes = strokesFor(code);
	const { references, controllers } = await referenceSnapshot(code, playerId);
	return { room, players, strokes, references, referenceControllers: controllers };
}

export async function leaveRoom(io: Server, code: string, playerId: string): Promise<void> {
	await rooms.removePlayer(code, playerId);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
	dropVoter(io, code, playerId);
	await releaseAllReferences(io, code, playerId);
}

// Per-room stroke numbering. The server is the only place that decides the order of
// strokes drawn at the same moment by different players; clients replay in this order.
const roomSeq = new Map<string, number>();
const roomDroppedUpTo = new Map<string, number>(); // highest seq pushed out by the size cap

/** Stores the stroke, numbering it. Returns the number (also written to stroke.seq). */
export function startStroke(code: string, stroke: Stroke): number {
	const strokes = strokesFor(code);
	const seq = (roomSeq.get(code) ?? 0) + 1;
	roomSeq.set(code, seq);
	stroke.seq = seq;
	strokes.push(stroke);
	if (strokes.length > MAX_STROKES_PER_ROOM) {
		const dropped = strokes.shift();
		if (dropped?.seq !== undefined) roomDroppedUpTo.set(code, dropped.seq);
	}
	return seq;
}

// 32-bit FNV-1a. The web client has the same function, so both sides can compare a
// short fingerprint of the stroke list instead of shipping the list.
function fnv1a(text: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(16);
}

export interface SyncSnapshot {
	droppedUpTo: number;
	lastSeq: number;
	ids: string; // fingerprint of "seq:id" for every stored stroke, in order
	byPlayer: Record<string, string>; // per player: fingerprint of "id:pointCount" of their strokes
}

/** What every client should hold right now; sent as a heartbeat so a missed event heals itself. */
export function syncSnapshot(code: string): SyncSnapshot {
	const strokes = roomStrokes.get(code) ?? [];
	const perPlayer = new Map<string, string[]>();
	for (const s of strokes) {
		const list = perPlayer.get(s.playerId) ?? [];
		list.push(`${s.id}:${s.points.length}`);
		perPlayer.set(s.playerId, list);
	}
	return {
		droppedUpTo: roomDroppedUpTo.get(code) ?? 0,
		lastSeq: roomSeq.get(code) ?? 0,
		ids: fnv1a(strokes.map((s) => `${s.seq}:${s.id}`).join(',')),
		byPlayer: Object.fromEntries([...perPlayer].map(([pid, list]) => [pid, fnv1a(list.join(','))]))
	};
}

export function activeDrawRoomCodes(): string[] {
	return [...roomStrokes.keys()];
}

export function appendPoints(code: string, strokeId: string, playerId: string, points: Point[]): void {
	const stroke = roomStrokes.get(code)?.find((s) => s.id === strokeId);
	if (!stroke || stroke.playerId !== playerId) return;
	stroke.points.push(...points);
}

// Removes and returns the id of this player's most recent stroke (pen,
// eraser or fill), or null if they have none. Only ever touches strokes
// authored by `playerId`.
export function undoLastStroke(code: string, playerId: string): string | null {
	const strokes = roomStrokes.get(code);
	if (!strokes) return null;
	for (let i = strokes.length - 1; i >= 0; i--) {
		if (strokes[i].playerId === playerId) {
			const [removed] = strokes.splice(i, 1);
			return removed.id;
		}
	}
	return null;
}

function clearRoom(code: string): void {
	roomStrokes.set(code, []);
}

// ── Clear-canvas vote ─────────────────────────────────────────────────────
// Clearing wipes everyone's work, so it only happens when every player who
// is online when the vote starts says yes. One vote per room at a time.

const CLEAR_VOTE_MS = 30_000;
// After any vote ends (any outcome) nobody can start another for this long,
// so a rejected request can't be re-spammed at the room.
const CLEAR_COOLDOWN_MS = 10_000;

const clearCooldownUntil = new Map<string, number>();

interface ClearVote {
	initiatorId: string;
	names: Map<string, string>;
	votes: Map<string, boolean | null>; // null = hasn't answered yet
	expiresAt: number;
	timer: NodeJS.Timeout;
}

const clearVotes = new Map<string, ClearVote>();

function emitVoteState(io: Server, code: string, vote: ClearVote): void {
	io.to(`draw:${code}`).emit('draw:clear:vote', {
		initiatorId: vote.initiatorId,
		initiatorName: vote.names.get(vote.initiatorId) ?? '',
		expiresAt: vote.expiresAt,
		votes: Object.fromEntries(vote.votes)
	});
}

type ClearOutcome = 'approved' | 'rejected' | 'expired' | 'cancelled';

function finishClearVote(io: Server, code: string, status: ClearOutcome, byName?: string): void {
	const vote = clearVotes.get(code);
	if (!vote) return;
	clearTimeout(vote.timer);
	clearVotes.delete(code);
	const cooldownUntil = Date.now() + CLEAR_COOLDOWN_MS;
	clearCooldownUntil.set(code, cooldownUntil);
	if (status === 'approved') {
		clearRoom(code);
		io.to(`draw:${code}`).emit('draw:cleared');
	}
	io.to(`draw:${code}`).emit('draw:clear:result', { status, byName, cooldownUntil });
}

function allYes(vote: ClearVote): boolean {
	return [...vote.votes.values()].every((v) => v === true);
}

export async function requestClear(io: Server, code: string, playerId: string): Promise<void> {
	// Tell the requester (all their tabs) why nothing happened instead of
	// dropping the request silently.
	const deny = (reason: 'busy' | 'cooldown', retryAt?: number): void => {
		io.to(`player:${playerId}`).emit('draw:clear:denied', { reason, retryAt });
	};

	if (clearVotes.has(code)) {
		deny('busy');
		return;
	}
	const cooldownEnds = clearCooldownUntil.get(code) ?? 0;
	if (Date.now() < cooldownEnds) {
		deny('cooldown', cooldownEnds);
		return;
	}

	const online = (await rooms.getAllPlayers(code)).filter((p) => p.connected || p.id === playerId);
	if (!online.some((p) => p.id === playerId)) return;

	// Nobody else to ask — just clear.
	if (online.length <= 1) {
		clearRoom(code);
		io.to(`draw:${code}`).emit('draw:cleared');
		return;
	}

	const vote: ClearVote = {
		initiatorId: playerId,
		names: new Map(online.map((p) => [p.id, p.name])),
		votes: new Map(online.map((p) => [p.id, p.id === playerId ? true : null])),
		expiresAt: Date.now() + CLEAR_VOTE_MS,
		timer: setTimeout(() => finishClearVote(io, code, 'expired'), CLEAR_VOTE_MS)
	};
	clearVotes.set(code, vote);
	emitVoteState(io, code, vote);
}

export function respondClear(io: Server, code: string, playerId: string, approve: boolean): void {
	const vote = clearVotes.get(code);
	if (!vote || playerId === vote.initiatorId || vote.votes.get(playerId) !== null) return;

	if (!approve) {
		finishClearVote(io, code, 'rejected', vote.names.get(playerId));
		return;
	}
	vote.votes.set(playerId, true);
	if (allYes(vote)) finishClearVote(io, code, 'approved');
	else emitVoteState(io, code, vote);
}

export function cancelClear(io: Server, code: string, playerId: string): void {
	const vote = clearVotes.get(code);
	if (vote && vote.initiatorId === playerId) finishClearVote(io, code, 'cancelled');
}

// A voter left or dropped: their answer no longer counts. If they started
// the vote, it's cancelled; otherwise the rest may now be unanimous.
function dropVoter(io: Server, code: string, playerId: string): void {
	dropPublishVoter(io, code, playerId);
	const vote = clearVotes.get(code);
	if (!vote || !vote.votes.has(playerId)) return;
	if (vote.initiatorId === playerId) {
		finishClearVote(io, code, 'cancelled');
		return;
	}
	vote.votes.delete(playerId);
	if (allYes(vote)) finishClearVote(io, code, 'approved');
	else emitVoteState(io, code, vote);
}

// ── Publish vote ──────────────────────────────────────────────────────────
// Publishing turns the drawing into a permanent gallery artwork, so — like
// clearing — it needs every online player to agree. The server never renders or
// stores the artwork itself: on approval it freezes a snapshot of the room
// (strokes + who was there) behind a one-time ticket that only the player who
// asked can use. The web app redeems that ticket over a private HTTP call
// (GET /internal/publish-ticket/:token), so the stored source data is the
// server's copy, not something a browser can make up.

const PUBLISH_VOTE_MS = 30_000;
const PUBLISH_COOLDOWN_MS = 10_000;
const PUBLISH_TICKET_MS = 5 * 60_000;

export interface PublishMeta {
	title: string;
	description: string;
	creatorName: string;
}

interface PublishVote {
	initiatorId: string;
	initiatorSocketId: string; // the exact tab that asked: only it may redeem the ticket
	meta: PublishMeta;
	names: Map<string, string>;
	votes: Map<string, boolean | null>;
	expiresAt: number;
	timer: NodeJS.Timeout;
}

export interface PublishSnapshot {
	roomCode: string;
	ratio: DrawRatio;
	strokes: Stroke[];
	players: { id: string; name: string }[];
	initiatorId: string;
	meta: PublishMeta;
}

const publishVotes = new Map<string, PublishVote>();
const publishCooldownUntil = new Map<string, number>();
const publishTickets = new Map<string, { snapshot: PublishSnapshot; timer: NodeJS.Timeout }>();

function cleanMeta(input: unknown): PublishMeta | null {
	if (!input || typeof input !== 'object') return null;
	const m = input as Record<string, unknown>;
	const title = typeof m.title === 'string' ? m.title.trim().slice(0, 100) : '';
	if (!title) return null;
	const description = typeof m.description === 'string' ? m.description.trim().slice(0, 500) : '';
	const creatorName = typeof m.creatorName === 'string' ? m.creatorName.trim().slice(0, 40) : '';
	return { title, description, creatorName };
}

function emitPublishState(io: Server, code: string, vote: PublishVote): void {
	io.to(`draw:${code}`).emit('draw:publish:vote', {
		initiatorId: vote.initiatorId,
		initiatorName: vote.names.get(vote.initiatorId) ?? '',
		title: vote.meta.title,
		expiresAt: vote.expiresAt,
		votes: Object.fromEntries(vote.votes)
	});
}

type PublishOutcome = 'approved' | 'rejected' | 'expired' | 'cancelled';

async function finishPublishVote(
	io: Server,
	code: string,
	status: PublishOutcome,
	byName?: string
): Promise<void> {
	const vote = publishVotes.get(code);
	if (!vote) return;
	clearTimeout(vote.timer);
	publishVotes.delete(code);
	const cooldownUntil = Date.now() + PUBLISH_COOLDOWN_MS;
	publishCooldownUntil.set(code, cooldownUntil);

	if (status === 'approved') {
		const room = await rooms.getRoom(code);
		if (room) {
			// Freeze the drawing now; later strokes don't change this artwork.
			const ticket = randomBytes(24).toString('hex');
			const snapshot: PublishSnapshot = {
				roomCode: code,
				ratio: room.ratio,
				strokes: structuredClone(strokesFor(code)),
				players: [...vote.names].map(([id, name]) => ({ id, name })),
				initiatorId: vote.initiatorId,
				meta: vote.meta
			};
			publishTickets.set(ticket, {
				snapshot,
				timer: setTimeout(() => publishTickets.delete(ticket), PUBLISH_TICKET_MS)
			});
			// Deliver to the tab that asked, NOT to every tab of that player: another tab of
			// the same account (e.g. an old room left open) would also upload, with ITS canvas,
			// and could win the race for this one-time ticket — publishing the wrong picture.
			void sendPublishTicket(io, code, vote, ticket);
		}
	}
	io.to(`draw:${code}`).emit('draw:publish:result', {
		status,
		byName,
		cooldownUntil,
		initiatorId: vote.initiatorId
	});
}

async function sendPublishTicket(
	io: Server,
	code: string,
	vote: PublishVote,
	ticket: string
): Promise<void> {
	const payload = { code, ticket };
	const asker = io.sockets.sockets.get(vote.initiatorSocketId);
	if (asker?.rooms.has(`draw:${code}`)) {
		asker.emit('draw:publish:approved', payload);
		return;
	}
	// The asking tab reconnected mid-vote (new socket id): fall back to that player's
	// tabs that are in THIS room.
	const inRoom = await io.in(`draw:${code}`).fetchSockets();
	for (const s of inRoom) {
		if (String(s.handshake.auth.playerId ?? '') === vote.initiatorId) s.emit('draw:publish:approved', payload);
	}
}

const publishAllYes = (vote: PublishVote) => [...vote.votes.values()].every((v) => v === true);

export async function requestPublish(
	io: Server,
	code: string,
	playerId: string,
	socketId: string,
	metaInput: unknown
): Promise<void> {
	const deny = (reason: 'busy' | 'cooldown' | 'invalid', retryAt?: number): void => {
		io.to(socketId).emit('draw:publish:denied', { reason, retryAt });
	};
	const meta = cleanMeta(metaInput);
	if (!meta) return deny('invalid');
	if (publishVotes.has(code)) return deny('busy');
	const cooldownEnds = publishCooldownUntil.get(code) ?? 0;
	if (Date.now() < cooldownEnds) return deny('cooldown', cooldownEnds);
	if (strokesFor(code).length === 0) return deny('invalid'); // nothing drawn yet

	const online = (await rooms.getAllPlayers(code)).filter((p) => p.connected || p.id === playerId);
	if (!online.some((p) => p.id === playerId)) return;

	const vote: PublishVote = {
		initiatorId: playerId,
		initiatorSocketId: socketId,
		meta,
		names: new Map(online.map((p) => [p.id, p.name])),
		votes: new Map(online.map((p) => [p.id, p.id === playerId ? true : null])),
		expiresAt: Date.now() + PUBLISH_VOTE_MS,
		timer: setTimeout(() => void finishPublishVote(io, code, 'expired'), PUBLISH_VOTE_MS)
	};
	publishVotes.set(code, vote);
	// Alone in the room: nobody to ask.
	if (publishAllYes(vote)) {
		await finishPublishVote(io, code, 'approved');
		return;
	}
	emitPublishState(io, code, vote);
}

export async function respondPublish(
	io: Server,
	code: string,
	playerId: string,
	approve: boolean
): Promise<void> {
	const vote = publishVotes.get(code);
	if (!vote || playerId === vote.initiatorId || vote.votes.get(playerId) !== null) return;
	if (!approve) {
		await finishPublishVote(io, code, 'rejected', vote.names.get(playerId));
		return;
	}
	vote.votes.set(playerId, true);
	if (publishAllYes(vote)) await finishPublishVote(io, code, 'approved');
	else emitPublishState(io, code, vote);
}

export async function cancelPublish(io: Server, code: string, playerId: string): Promise<void> {
	const vote = publishVotes.get(code);
	if (vote && vote.initiatorId === playerId) await finishPublishVote(io, code, 'cancelled');
}

function dropPublishVoter(io: Server, code: string, playerId: string): void {
	const vote = publishVotes.get(code);
	if (!vote || !vote.votes.has(playerId)) return;
	if (vote.initiatorId === playerId) {
		void finishPublishVote(io, code, 'cancelled');
		return;
	}
	vote.votes.delete(playerId);
	if (publishAllYes(vote)) void finishPublishVote(io, code, 'approved');
	else emitPublishState(io, code, vote);
}

/** One-time redemption of a publish ticket (used by the web app's API). */
export function redeemPublishTicket(token: string): PublishSnapshot | null {
	const entry = publishTickets.get(token);
	if (!entry) return null;
	clearTimeout(entry.timer);
	publishTickets.delete(token);
	return entry.snapshot;
}

/** Tell the room an artwork was published (called after the web app stored it). */
export function announcePublished(
	io: Server,
	code: string,
	playerId: string,
	artworkId: unknown,
	title: unknown
): void {
	if (typeof artworkId !== 'string' || !/^[0-9a-f-]{36}$/i.test(artworkId)) return;
	io.to(`draw:${code}`).emit('draw:publish:published', {
		artworkId,
		title: typeof title === 'string' ? title.slice(0, 100) : '',
		byId: playerId
	});
}

export async function handleDisconnect(io: Server, code: string, playerId: string): Promise<void> {
	const player = await rooms.getPlayer(code, playerId);
	if (!player) return;
	player.connected = false;
	await rooms.setPlayer(code, player);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
	dropVoter(io, code, playerId);
	await releaseAllReferences(io, code, playerId);
}

// ── Trace-image layers ────────────────────────────────────────────────────
// Each room keeps an ordered stack of reference images (index 0 = bottom);
// strokes are always drawn above all of them. Every image is uploaded by
// someone (its owner) and starts PRIVATE: the server only ever sends it to the
// owner. The owner can flip it public, after which everyone sees it and can
// move/resize/rotate/lock/delete it. Moving/resizing goes through a short-lived
// per-image "control" so two people can't fight over one image: the first to
// grab it drives it until they let go (or go quiet for a few seconds).

const REF_CONTROL_MS = 8_000;
const MAX_REFERENCES_PER_OWNER = 8;
const MAX_REFERENCES_PER_ROOM = 32;
const roomReferences = new Map<string, DrawReference[]>();
const roomPaperRatio = new Map<string, number>(); // paper width / height

interface RefControl {
	playerId: string;
	name: string;
	timer: NodeJS.Timeout;
	release: () => void; // frees control and tells the room (also used by the idle timer)
}
const refControl = new Map<string, Map<string, RefControl>>(); // room -> imageId -> control

const PAPER_RATIO: Record<DrawRatio, number> = { '4:3': 4 / 3, '16:9': 16 / 9, '1:1': 1, '3:4': 3 / 4 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
// Any angle -> degrees in (-180, 180].
const normalizeAngle = (deg: number) => {
	const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
	return wrapped === -180 ? 180 : wrapped;
};

// Who may see (and therefore edit) a layer: everyone if it's public, otherwise its owner.
const canSee = (r: DrawReference, viewerId: string) => r.isPublic || r.ownerId === '' || r.ownerId === viewerId;
// Only the owner decides public/private (legacy ownerless images: anyone).
const canChangeVisibility = (r: DrawReference, actorId: string) => r.ownerId === '' || r.ownerId === actorId;

// The edits below are read → await → write steps, so two arriving at once would
// each start from the same old list and overwrite the other. Run all edits for a
// room one at a time.
const refQueues = new Map<string, Promise<unknown>>();
function serialize<T>(code: string, task: () => Promise<T>): Promise<T> {
	const run = (refQueues.get(code) ?? Promise.resolve()).then(task, task);
	refQueues.set(
		code,
		run.catch(() => undefined)
	);
	return run;
}

async function loadReferences(code: string): Promise<DrawReference[]> {
	if (!roomReferences.has(code)) roomReferences.set(code, await rooms.getReferences(code));
	return roomReferences.get(code) ?? [];
}

async function paperRatioOf(code: string): Promise<number> {
	let ratio = roomPaperRatio.get(code);
	if (ratio === undefined) {
		const room = await rooms.getRoom(code);
		ratio = PAPER_RATIO[room?.ratio ?? '4:3'];
		roomPaperRatio.set(code, ratio);
	}
	return ratio;
}

// Only images we uploaded ourselves (R2). Without this check anyone could point
// every player's browser at an arbitrary URL.
function isAllowedImageUrl(url: unknown): url is string {
	if (typeof url !== 'string' || url.length > 500) return false;
	const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
	return base ? url.startsWith(`${base}/`) : url.startsWith('https://');
}

function cleanName(name: unknown): string {
	if (typeof name !== 'string') return 'รูปต้นแบบ';
	const trimmed = name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
	return trimmed || 'รูปต้นแบบ';
}

type RefDeniedReason = 'locked' | 'busy' | 'invalid' | 'limit';

function refDenied(io: Server, playerId: string, reason: RefDeniedReason, byName?: string): void {
	io.to(`player:${playerId}`).emit('draw:ref:denied', { reason, byName });
}

const viewerOf = (socket: { handshake: { auth: Record<string, unknown> } }) => String(socket.handshake.auth.playerId ?? '');

function controllersFor(code: string, viewerId: string): Record<string, { playerId: string; name: string }> {
	const references = roomReferences.get(code) ?? [];
	const out: Record<string, { playerId: string; name: string }> = {};
	for (const [id, c] of refControl.get(code) ?? []) {
		const layer = references.find((r) => r.id === id);
		if (layer && canSee(layer, viewerId)) out[id] = { playerId: c.playerId, name: c.name };
	}
	return out;
}

// State is sent per viewer: a private layer never leaves the server for anyone but its owner.
async function emitRefState(io: Server, code: string): Promise<void> {
	const references = roomReferences.get(code) ?? [];
	for (const socket of await io.in(`draw:${code}`).fetchSockets()) {
		const viewerId = viewerOf(socket);
		socket.emit('draw:ref:state', { references: references.filter((r) => canSee(r, viewerId)) });
	}
}

async function emitRefControl(io: Server, code: string): Promise<void> {
	for (const socket of await io.in(`draw:${code}`).fetchSockets()) {
		socket.emit('draw:ref:control', { controllers: controllersFor(code, viewerOf(socket)) });
	}
}

function clearRefControl(code: string, id: string): void {
	const controls = refControl.get(code);
	const control = controls?.get(id);
	if (control) clearTimeout(control.timer);
	controls?.delete(id);
}

async function saveReferences(io: Server, code: string, references: DrawReference[]): Promise<void> {
	roomReferences.set(code, references);
	await rooms.setReferences(code, references);
	await emitRefState(io, code);
}

// For the join ack: only what this viewer may see, plus who is dragging those layers.
export async function referenceSnapshot(code: string, viewerId: string) {
	const references = await loadReferences(code);
	return {
		references: references.filter((r) => canSee(r, viewerId)),
		controllers: controllersFor(code, viewerId)
	};
}

async function addReferenceNow(
	io: Server,
	code: string,
	playerId: string,
	playerName: string,
	input: { url?: unknown; aspect?: unknown; name?: unknown }
): Promise<void> {
	const { url, aspect } = input;
	if (!isAllowedImageUrl(url) || !isNum(aspect) || aspect < 0.05 || aspect > 20) {
		refDenied(io, playerId, 'invalid');
		return;
	}
	const references = await loadReferences(code);
	const mine = references.filter((r) => r.ownerId === playerId).length;
	if (mine >= MAX_REFERENCES_PER_OWNER || references.length >= MAX_REFERENCES_PER_ROOM) {
		refDenied(io, playerId, 'limit');
		return;
	}

	// Fit the image inside ~80% of the paper, centred.
	const paperRatio = await paperRatioOf(code);
	const width = Math.min(0.6, (0.8 * aspect) / paperRatio);
	const height = (width * paperRatio) / aspect;
	const reference: DrawReference = {
		id: randomBytes(6).toString('hex'),
		url,
		name: cleanName(input.name),
		x: (1 - width) / 2,
		y: (1 - height) / 2,
		width,
		aspect,
		rotation: 0,
		opacity: 0.4,
		locked: false,
		ownerId: playerId,
		ownerName: playerName.slice(0, 40),
		isPublic: true // shared by default; the owner can make it private later
	};
	await saveReferences(io, code, [...references, reference]); // new layers go on top of the stack
}

async function patchReferenceNow(
	io: Server,
	code: string,
	playerId: string,
	id: unknown,
	patch: { opacity?: unknown; locked?: unknown; rotation?: unknown }
): Promise<void> {
	const references = await loadReferences(code);
	const index = references.findIndex((r) => r.id === id && canSee(r, playerId));
	if (index < 0) return;
	const next = { ...references[index] };
	if (isNum(patch.opacity)) next.opacity = clamp(patch.opacity, 0.05, 1);
	if (typeof patch.locked === 'boolean') next.locked = patch.locked;
	if (isNum(patch.rotation)) {
		// Rotating is an edit of the image's position, so it follows the same rules as moving it.
		const control = refControl.get(code)?.get(next.id);
		if (references[index].locked) {
			refDenied(io, playerId, 'locked');
			return;
		}
		if (control && control.playerId !== playerId) {
			refDenied(io, playerId, 'busy', control.name);
			return;
		}
		next.rotation = normalizeAngle(patch.rotation);
	}

	// Locking freezes the image, so whoever was dragging it has to let go.
	if (next.locked && refControl.get(code)?.has(next.id)) {
		clearRefControl(code, next.id);
		await emitRefControl(io, code);
	}
	const updated = [...references];
	updated[index] = next;
	await saveReferences(io, code, updated);
}

// Owner-only: make several of their images public/private in one go ("select all").
async function setVisibilityNow(
	io: Server,
	code: string,
	playerId: string,
	ids: unknown,
	isPublic: unknown
): Promise<void> {
	if (!Array.isArray(ids) || typeof isPublic !== 'boolean') return;
	const wanted = new Set(ids.slice(0, 64).filter((v): v is string => typeof v === 'string'));
	const references = await loadReferences(code);
	let changed = false;
	let controlChanged = false;
	const updated = references.map((r) => {
		if (!wanted.has(r.id) || !canChangeVisibility(r, playerId) || r.isPublic === isPublic) return r;
		changed = true;
		// Hiding an image from everyone else ends any drag someone else was doing on it.
		const control = refControl.get(code)?.get(r.id);
		if (!isPublic && control && control.playerId !== r.ownerId) {
			clearRefControl(code, r.id);
			controlChanged = true;
		}
		return { ...r, isPublic };
	});
	if (!changed) return;
	await saveReferences(io, code, updated);
	if (controlChanged) await emitRefControl(io, code);
}

async function reorderReferenceNow(
	io: Server,
	code: string,
	playerId: string,
	id: unknown,
	direction: unknown
): Promise<void> {
	if (direction !== 'up' && direction !== 'down') return;
	const references = await loadReferences(code);
	const index = references.findIndex((r) => r.id === id && canSee(r, playerId));
	if (index < 0) return;
	// Swap with the next layer this player can actually see (others' private ones don't count).
	const step = direction === 'up' ? 1 : -1;
	let target = index + step;
	while (target >= 0 && target < references.length && !canSee(references[target], playerId)) target += step;
	if (target < 0 || target >= references.length) return;
	const updated = [...references];
	[updated[index], updated[target]] = [updated[target], updated[index]];
	await saveReferences(io, code, updated);
}

export async function grabReference(
	io: Server,
	code: string,
	playerId: string,
	name: string,
	id: unknown
): Promise<void> {
	const references = await loadReferences(code);
	const reference = references.find((r) => r.id === id && canSee(r, playerId));
	if (!reference) return;
	if (reference.locked) {
		refDenied(io, playerId, 'locked');
		return;
	}
	const controls = refControl.get(code) ?? new Map<string, RefControl>();
	refControl.set(code, controls);
	const control = controls.get(reference.id);
	if (control && control.playerId !== playerId) {
		refDenied(io, playerId, 'busy', control.name);
		return;
	}
	await paperRatioOf(code); // warm the cache so moveReference can stay synchronous
	if (control) clearTimeout(control.timer);
	const release = () => void releaseReference(io, code, playerId, reference.id);
	controls.set(reference.id, { playerId, name, release, timer: setTimeout(release, REF_CONTROL_MS) });
	await emitRefControl(io, code);
}

// Synchronous on purpose: this runs for every pointer move while dragging.
// Returns the updated image (to relay to whoever can see it) or null.
export function moveReference(
	code: string,
	playerId: string,
	input: { id?: unknown; x?: unknown; y?: unknown; width?: unknown; rotation?: unknown }
): DrawReference | null {
	const control = refControl.get(code)?.get(String(input.id));
	const references = roomReferences.get(code);
	const index = references?.findIndex((r) => r.id === input.id) ?? -1;
	if (!control || control.playerId !== playerId || !references || index < 0) return null;
	const reference = references[index];
	if (reference.locked || !canSee(reference, playerId)) return null;
	if (!isNum(input.x) || !isNum(input.y) || !isNum(input.width)) return null;

	const paperRatio = roomPaperRatio.get(code) ?? 1;
	const width = clamp(input.width, 0.05, 1.5);
	const height = (width * paperRatio) / reference.aspect;
	// Keep at least a corner of the image on the paper so it can't be lost off-screen.
	const next: DrawReference = {
		...reference,
		width,
		x: clamp(input.x, -width + 0.1, 0.9),
		y: clamp(input.y, -height + 0.1, 0.9),
		rotation: isNum(input.rotation) ? normalizeAngle(input.rotation) : reference.rotation
	};
	references[index] = next;

	// Went quiet (tab closed mid-drag, lost connection): free it for everyone.
	clearTimeout(control.timer);
	control.timer = setTimeout(control.release, REF_CONTROL_MS);
	return next;
}

async function releaseReferenceNow(io: Server, code: string, playerId: string, id: unknown): Promise<void> {
	const control = refControl.get(code)?.get(String(id));
	if (!control || control.playerId !== playerId) return;
	clearRefControl(code, String(id));
	await emitRefControl(io, code);
	// Moves are relayed to everyone except the mover, so publish the final
	// stack (it corrects any dropped move) and persist it.
	const references = roomReferences.get(code);
	if (references) await saveReferences(io, code, references);
}

// A player left or dropped: hand back everything they were dragging.
export async function releaseAllReferences(io: Server, code: string, playerId: string): Promise<void> {
	for (const [id, control] of [...(refControl.get(code) ?? [])]) {
		if (control.playerId === playerId) await releaseReference(io, code, playerId, id);
	}
}

async function deleteReferenceNow(io: Server, code: string, playerId: string, id: unknown): Promise<void> {
	const references = await loadReferences(code);
	const reference = references.find((r) => r.id === id && canSee(r, playerId));
	if (!reference) return;
	if (reference.locked) {
		refDenied(io, playerId, 'locked');
		return;
	}
	const control = refControl.get(code)?.get(reference.id);
	if (control && control.playerId !== playerId) {
		refDenied(io, playerId, 'busy', control.name);
		return;
	}
	clearRefControl(code, reference.id);
	await emitRefControl(io, code);
	await saveReferences(
		io,
		code,
		references.filter((r) => r.id !== reference.id)
	);
}

export function addReference(
	io: Server,
	code: string,
	playerId: string,
	playerName: string,
	input: { url?: unknown; aspect?: unknown; name?: unknown }
): Promise<void> {
	return serialize(code, () => addReferenceNow(io, code, playerId, playerName, input));
}

export function patchReference(
	io: Server,
	code: string,
	playerId: string,
	id: unknown,
	patch: { opacity?: unknown; locked?: unknown; rotation?: unknown }
): Promise<void> {
	return serialize(code, () => patchReferenceNow(io, code, playerId, id, patch));
}

export function setReferencesVisibility(
	io: Server,
	code: string,
	playerId: string,
	ids: unknown,
	isPublic: unknown
): Promise<void> {
	return serialize(code, () => setVisibilityNow(io, code, playerId, ids, isPublic));
}

export function reorderReference(
	io: Server,
	code: string,
	playerId: string,
	id: unknown,
	direction: unknown
): Promise<void> {
	return serialize(code, () => reorderReferenceNow(io, code, playerId, id, direction));
}

export function deleteReference(io: Server, code: string, playerId: string, id: unknown): Promise<void> {
	return serialize(code, () => deleteReferenceNow(io, code, playerId, id));
}

export function releaseReference(io: Server, code: string, playerId: string, id: unknown): Promise<void> {
	return serialize(code, () => releaseReferenceNow(io, code, playerId, id));
}
