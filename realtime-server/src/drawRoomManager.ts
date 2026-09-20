import { redis, ROOM_TTL_SEC } from './redis.js';
import { DRAW_RATIOS, type DrawPlayer, type DrawRatio, type DrawRoomState } from './types.js';

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

export async function removePlayer(code: string, playerId: string): Promise<void> {
	await redis.hdel(playersKey(code), playerId);
}
