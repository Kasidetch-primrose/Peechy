import type { Server } from 'socket.io';
import * as rooms from './drawRoomManager.js';
import { DRAW_RATIOS, type DrawPlayer, type DrawRatio, type DrawRoomState, type Point, type Stroke } from './types.js';

// Single-process MVP: strokes are ephemeral and don't need to survive a
// server restart, so they live in memory keyed by room code — mirrors the
// roomImages/roomTimers pattern in game.ts.
const roomStrokes = new Map<string, Stroke[]>();
const MAX_STROKES_PER_ROOM = 3000;

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
	const strokes = roomStrokes.get(code) ?? [];
	return { room, players, strokes };
}

export async function leaveRoom(io: Server, code: string, playerId: string): Promise<void> {
	await rooms.removePlayer(code, playerId);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
}

export function startStroke(code: string, stroke: Stroke): void {
	const strokes = roomStrokes.get(code);
	if (!strokes) return;
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

export function clearRoom(code: string): void {
	if (roomStrokes.has(code)) roomStrokes.set(code, []);
}

export async function handleDisconnect(io: Server, code: string, playerId: string): Promise<void> {
	const player = await rooms.getPlayer(code, playerId);
	if (!player) return;
	player.connected = false;
	await rooms.setPlayer(code, player);
	io.to(`draw:${code}`).emit('draw:room:playerLeft', { playerId });
}
