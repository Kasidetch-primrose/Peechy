import { redis, ROOM_TTL_SEC } from './redis.js';
import type { Player, RoomState, TurnState, TurnDuration } from './types.js';

function roomKey(code: string) {
	return `room:${code}`;
}
function playersKey(code: string) {
	return `room:${code}:players`;
}
function queueKey(code: string) {
	return `room:${code}:queue`;
}
function turnKey(code: string) {
	return `room:${code}:turn`;
}

async function touch(code: string) {
	const keys = [roomKey(code), playersKey(code), queueKey(code), turnKey(code)];
	const pipeline = redis.pipeline();
	for (const key of keys) pipeline.expire(key, ROOM_TTL_SEC);
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
	gameId: number;
	turnDurationSec: TurnDuration;
}): Promise<RoomState> {
	const state: RoomState = {
		code: params.code,
		hostId: params.hostId,
		gameId: params.gameId,
		status: 'lobby',
		turnDurationSec: params.turnDurationSec,
		currentImageIndex: 0,
		currentTurnPlayerIndex: 0,
		globalRevealedTiles: [],
		createdAt: Date.now()
	};
	await redis.hset(roomKey(params.code), serialize(state));
	await touch(params.code);
	return state;
}

export async function getRoom(code: string): Promise<RoomState | null> {
	const raw = await redis.hgetall(roomKey(code));
	if (!raw || Object.keys(raw).length === 0) return null;
	return deserialize(raw) as unknown as RoomState;
}

export async function updateRoom(code: string, patch: Partial<RoomState>): Promise<void> {
	await redis.hset(roomKey(code), serialize(patch));
	await touch(code);
}

export async function addPlayer(code: string, player: Player): Promise<void> {
	await redis.hset(playersKey(code), player.id, JSON.stringify(player));
	await touch(code);
}

export async function getPlayer(code: string, playerId: string): Promise<Player | null> {
	const raw = await redis.hget(playersKey(code), playerId);
	return raw ? JSON.parse(raw) : null;
}

export async function setPlayer(code: string, player: Player): Promise<void> {
	await redis.hset(playersKey(code), player.id, JSON.stringify(player));
	await touch(code);
}

export async function getAllPlayers(code: string): Promise<Player[]> {
	const raw = await redis.hgetall(playersKey(code));
	return Object.values(raw).map((value) => JSON.parse(value));
}

export async function removePlayer(code: string, playerId: string): Promise<void> {
	await redis.hdel(playersKey(code), playerId);
}

export async function setQueue(code: string, playerIds: string[]): Promise<void> {
	await redis.del(queueKey(code));
	if (playerIds.length > 0) await redis.rpush(queueKey(code), ...playerIds);
	await touch(code);
}

export async function getQueue(code: string): Promise<string[]> {
	return redis.lrange(queueKey(code), 0, -1);
}

export async function setTurn(code: string, turn: TurnState): Promise<void> {
	await redis.hset(turnKey(code), serialize(turn));
	await touch(code);
}

export async function getTurn(code: string): Promise<TurnState | null> {
	const raw = await redis.hgetall(turnKey(code));
	if (!raw || Object.keys(raw).length === 0) return null;
	return deserialize(raw) as unknown as TurnState;
}

export async function deleteRoom(code: string): Promise<void> {
	await redis.del(roomKey(code), playersKey(code), queueKey(code), turnKey(code));
}

// --- (de)serialization helpers: Redis hashes only store strings ---

function serialize(obj: object): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined) continue;
		out[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
	}
	return out;
}

const NUMERIC_FIELDS = new Set([
	'gameId',
	'currentImageIndex',
	'currentTurnPlayerIndex',
	'createdAt',
	'turnDurationSec',
	'startedAt',
	'guessAttempts'
]);
const BOOLEAN_FIELDS = new Set(['tileOpened', 'hintUsed']);
const JSON_FIELDS = new Set(['globalRevealedTiles']);

function deserialize(raw: Record<string, string>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (JSON_FIELDS.has(key)) out[key] = JSON.parse(value);
		else if (NUMERIC_FIELDS.has(key)) out[key] = Number(value);
		else if (BOOLEAN_FIELDS.has(key)) out[key] = value === 'true';
		else out[key] = value;
	}
	return out;
}
