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
	roomStrokes.set(code, []);
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
	reference: DrawReference | null;
	referenceController: { playerId: string; name: string } | null;
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
	const reference = await loadReference(code);
	const controller = refControl.get(code);
	return {
		room,
		players,
		strokes,
		reference,
		referenceController: controller ? { playerId: controller.playerId, name: controller.name } : null
	};
}

export async function leaveRoom(io: Server, code: string, playerId: string): Promise<void> {
	await rooms.removePlayer(code, playerId);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
	dropVoter(io, code, playerId);
	await releaseReference(io, code, playerId);
}

export function startStroke(code: string, stroke: Stroke): void {
	const strokes = strokesFor(code);
	strokes.push(stroke);
	if (strokes.length > MAX_STROKES_PER_ROOM) strokes.shift();
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

export async function handleDisconnect(io: Server, code: string, playerId: string): Promise<void> {
	const player = await rooms.getPlayer(code, playerId);
	if (!player) return;
	player.connected = false;
	await rooms.setPlayer(code, player);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
	dropVoter(io, code, playerId);
	await releaseReference(io, code, playerId);
}

// ── Shared trace image ────────────────────────────────────────────────────
// One reference image per room that everyone can adjust. Opacity / lock /
// visibility are plain last-writer-wins edits. Moving and resizing go through
// a short-lived "control" so two people can't fight over the position: the
// first to grab it drives it until they let go (or go quiet for a few seconds).

const REF_CONTROL_MS = 8_000;
const roomReferences = new Map<string, DrawReference | null>();
const roomPaperRatio = new Map<string, number>(); // paper width / height

interface RefControl {
	playerId: string;
	name: string;
	timer: NodeJS.Timeout;
	release: () => void; // frees control and tells the room (also used by the idle timer)
}
const refControl = new Map<string, RefControl>();

const PAPER_RATIO: Record<DrawRatio, number> = { '4:3': 4 / 3, '16:9': 16 / 9, '1:1': 1, '3:4': 3 / 4 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

async function loadReference(code: string): Promise<DrawReference | null> {
	if (!roomReferences.has(code)) roomReferences.set(code, await rooms.getReference(code));
	return roomReferences.get(code) ?? null;
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

function refDenied(io: Server, playerId: string, reason: 'locked' | 'busy' | 'invalid', byName?: string): void {
	io.to(`player:${playerId}`).emit('draw:ref:denied', { reason, byName });
}

function emitRefControl(io: Server, code: string): void {
	const control = refControl.get(code);
	io.to(`draw:${code}`).emit('draw:ref:control', {
		controller: control ? { playerId: control.playerId, name: control.name } : null
	});
}

function clearRefControl(code: string): void {
	const control = refControl.get(code);
	if (control) clearTimeout(control.timer);
	refControl.delete(code);
}

async function saveReference(io: Server, code: string, reference: DrawReference | null): Promise<void> {
	roomReferences.set(code, reference);
	await rooms.setReference(code, reference);
	io.to(`draw:${code}`).emit('draw:ref:state', { reference });
}

export async function addReference(
	io: Server,
	code: string,
	playerId: string,
	input: { url?: unknown; aspect?: unknown }
): Promise<void> {
	const { url, aspect } = input;
	if (!isAllowedImageUrl(url) || !isNum(aspect) || aspect < 0.05 || aspect > 20) {
		refDenied(io, playerId, 'invalid');
		return;
	}
	const current = await loadReference(code);
	if (current?.locked) {
		refDenied(io, playerId, 'locked');
		return;
	}
	const control = refControl.get(code);
	if (control && control.playerId !== playerId) {
		refDenied(io, playerId, 'busy', control.name);
		return;
	}

	// Fit the image inside ~80% of the paper, centred.
	const paperRatio = await paperRatioOf(code);
	const width = Math.min(0.6, (0.8 * aspect) / paperRatio);
	const height = (width * paperRatio) / aspect;
	const reference: DrawReference = {
		id: randomBytes(6).toString('hex'),
		url,
		x: (1 - width) / 2,
		y: (1 - height) / 2,
		width,
		aspect,
		opacity: 0.4,
		locked: false,
		visible: true
	};
	clearRefControl(code);
	emitRefControl(io, code);
	await saveReference(io, code, reference);
}

export async function patchReference(
	io: Server,
	code: string,
	playerId: string,
	patch: { opacity?: unknown; locked?: unknown; visible?: unknown }
): Promise<void> {
	const current = await loadReference(code);
	if (!current) return;
	const next = { ...current };
	if (isNum(patch.opacity)) next.opacity = clamp(patch.opacity, 0.05, 1);
	if (typeof patch.visible === 'boolean') next.visible = patch.visible;
	if (typeof patch.locked === 'boolean') next.locked = patch.locked;

	// Locking freezes the image, so whoever was dragging it has to let go.
	if (next.locked && refControl.has(code)) {
		clearRefControl(code);
		emitRefControl(io, code);
	}
	await saveReference(io, code, next);
}

export async function grabReference(io: Server, code: string, playerId: string, name: string): Promise<void> {
	const reference = await loadReference(code);
	if (!reference) return;
	if (reference.locked) {
		refDenied(io, playerId, 'locked');
		return;
	}
	const control = refControl.get(code);
	if (control && control.playerId !== playerId) {
		refDenied(io, playerId, 'busy', control.name);
		return;
	}
	await paperRatioOf(code); // warm the cache so moveReference can stay synchronous
	if (control) clearTimeout(control.timer);
	const release = () => void releaseReference(io, code, playerId);
	refControl.set(code, { playerId, name, release, timer: setTimeout(release, REF_CONTROL_MS) });
	emitRefControl(io, code);
}

// Synchronous on purpose: this runs for every pointer move while dragging.
// Returns the updated reference (to relay to the other players) or null.
export function moveReference(
	code: string,
	playerId: string,
	input: { x?: unknown; y?: unknown; width?: unknown }
): DrawReference | null {
	const control = refControl.get(code);
	const reference = roomReferences.get(code);
	if (!control || control.playerId !== playerId || !reference || reference.locked) return null;
	if (!isNum(input.x) || !isNum(input.y) || !isNum(input.width)) return null;

	const paperRatio = roomPaperRatio.get(code) ?? 1;
	const width = clamp(input.width, 0.05, 1.5);
	const height = (width * paperRatio) / reference.aspect;
	// Keep at least a corner of the image on the paper so it can't be lost off-screen.
	const next: DrawReference = {
		...reference,
		width,
		x: clamp(input.x, -width + 0.1, 0.9),
		y: clamp(input.y, -height + 0.1, 0.9)
	};
	roomReferences.set(code, next);

	// Went quiet (tab closed mid-drag, lost connection): free it for everyone.
	clearTimeout(control.timer);
	control.timer = setTimeout(control.release, REF_CONTROL_MS);
	return next;
}

export async function releaseReference(io: Server, code: string, playerId: string): Promise<void> {
	const control = refControl.get(code);
	if (!control || control.playerId !== playerId) return;
	clearRefControl(code);
	emitRefControl(io, code);
	// Moves are relayed to everyone except the mover, so publish the final
	// position to all (it corrects any dropped move) and persist it.
	const reference = roomReferences.get(code);
	if (reference) {
		await rooms.setReference(code, reference);
		io.to(`draw:${code}`).emit('draw:ref:state', { reference });
	}
}

export async function deleteReference(io: Server, code: string, playerId: string): Promise<void> {
	const reference = await loadReference(code);
	if (!reference) return;
	if (reference.locked) {
		refDenied(io, playerId, 'locked');
		return;
	}
	const control = refControl.get(code);
	if (control && control.playerId !== playerId) {
		refDenied(io, playerId, 'busy', control.name);
		return;
	}
	clearRefControl(code);
	emitRefControl(io, code);
	await saveReference(io, code, null);
}
