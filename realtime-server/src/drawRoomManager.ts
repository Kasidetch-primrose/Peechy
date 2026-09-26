import { redis, ROOM_TTL_SEC } from './redis.js';
import {
	DRAW_RATIOS,
	type DrawPlayer,
	type DrawRatio,
	type DrawReference,
	type DrawRoomState
} from './types.js';

function roomKey(code: string) {
	return `draw:room:${code}`;
}
function playersKey(code: string) {
	return `draw:room:${code}:players`;
}

async function touch(code: string) {
	const pipeline = redis.pipeline();
	pipeline.expire(roomKey(code), ROOM_TTL_SEC);
	pipeline.expire(playersKey(code), ROOM_TTL_SEC);
	await pipeline.exec();
}

export function generateRoomCode(): string {
	return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function roomExists(code: string): Promise<boolean> {
	return (await redis.exists(roomKey(code))) === 1;
}

export async function createRoom(params: {
	code: string;
	hostId: string;
	ratio: DrawRatio;
}): Promise<DrawRoomState> {
	const state: DrawRoomState = {
		code: params.code,
		hostId: params.hostId,
		ratio: params.ratio,
		createdAt: Date.now()
	};
	await redis.hset(roomKey(params.code), {
		code: state.code,
		hostId: state.hostId,
		ratio: state.ratio,
		createdAt: String(state.createdAt)
	});
	await touch(params.code);
	return state;
}

export async function getRoom(code: string): Promise<DrawRoomState | null> {
	const raw = await redis.hgetall(roomKey(code));
	if (!raw || Object.keys(raw).length === 0) return null;
	const ratio = (DRAW_RATIOS as readonly string[]).includes(raw.ratio) ? (raw.ratio as DrawRatio) : '4:3';
	return { code: raw.code, hostId: raw.hostId, ratio, createdAt: Number(raw.createdAt) };
}

export async function addPlayer(code: string, player: DrawPlayer): Promise<void> {
	await redis.hset(playersKey(code), player.id, JSON.stringify(player));
	await touch(code);
}

export async function getPlayer(code: string, playerId: string): Promise<DrawPlayer | null> {
	const raw = await redis.hget(playersKey(code), playerId);
	return raw ? JSON.parse(raw) : null;
}

export async function setPlayer(code: string, player: DrawPlayer): Promise<void> {
	await redis.hset(playersKey(code), player.id, JSON.stringify(player));
	await touch(code);
}

export async function getAllPlayers(code: string): Promise<DrawPlayer[]> {
	const raw = await redis.hgetall(playersKey(code));
	return Object.values(raw).map((value) => JSON.parse(value));
}

// The trace image lives in the room hash so it survives a server restart
// (like the room itself), unlike strokes which are memory-only.
export async function getReferences(code: string): Promise<DrawReference[]> {
	const [list, legacy] = await redis.hmget(roomKey(code), 'references', 'reference');
	try {
		// Layers saved before rotation/ownership existed: upright, and public with no
		// owner (they were visible to everyone back then).
		const normalize = (r: Partial<DrawReference>): DrawReference => ({
			...(r as DrawReference),
			name: r.name ?? 'รูปต้นแบบ',
			rotation: r.rotation ?? 0,
			ownerId: r.ownerId ?? '',
			ownerName: r.ownerName ?? '',
			isPublic: r.isPublic ?? true
		});
		if (list) return (JSON.parse(list) as Partial<DrawReference>[]).map(normalize);
		// Rooms saved before layers existed held a single image in `reference`.
		if (legacy) return [normalize(JSON.parse(legacy) as Partial<DrawReference>)];
	} catch {
		// corrupt entry: treat as empty rather than breaking the room
	}
	return [];
}

export async function setReferences(code: string, references: DrawReference[]): Promise<void> {
	if (references.length > 0) await redis.hset(roomKey(code), 'references', JSON.stringify(references));
	else await redis.hdel(roomKey(code), 'references');
	await redis.hdel(roomKey(code), 'reference'); // drop the legacy single-image field
	await touch(code);
}

export async function removePlayer(code: string, playerId: string): Promise<void> {
	await redis.hdel(playersKey(code), playerId);
}
