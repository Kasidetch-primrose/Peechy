import type { Server } from 'socket.io';
import * as rooms from './drawRoomManager.js';
import { DRAW_RATIOS, type DrawPlayer, type DrawRatio, type DrawRoomState, type Point, type Stroke } from './types.js';

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
): Promise<{ room: DrawRoomState; players: DrawPlayer[]; strokes: Stroke[] } | null> {
	const room = await rooms.getRoom(code);
	if (!room) return null;

	const existing = await rooms.getPlayer(code, playerId);
	const player: DrawPlayer = existing
		? { ...existing, connected: true }
		: { id: playerId, name: playerName, connected: true, joinedAt: Date.now() };
	await rooms.addPlayer(code, player);

	const players = await rooms.getAllPlayers(code);
	const strokes = strokesFor(code);
	return { room, players, strokes };
}

export async function leaveRoom(io: Server, code: string, playerId: string): Promise<void> {
	await rooms.removePlayer(code, playerId);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
	dropVoter(io, code, playerId);
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
}
