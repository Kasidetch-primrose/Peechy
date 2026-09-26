import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as rooms from './roomManager.js';
import * as game from './game.js';
import * as draw from './draw.js';
import type { Player, Stroke } from './types.js';

const PORT = Number(process.env.PORT ?? 4001);
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim());

const httpServer = createServer();
const io = new Server(httpServer, {
	cors: { origin: CORS_ORIGIN }
});

function err(socket: import('socket.io').Socket, code: string | undefined, message: string) {
	socket.emit('room:error', { code, message });
}

io.on('connection', (socket) => {
	const playerId = String(socket.handshake.auth.playerId ?? '');
	const playerName = String(socket.handshake.auth.playerName ?? 'Player');
	if (!playerId) {
		socket.disconnect(true);
		return;
	}
	// Personal room so the server can privately target this player (e.g. their
	// own guess text) without leaking it to the rest of the room.
	socket.join(`player:${playerId}`);

	socket.on('room:create', async ({ gameId, turnDurationSec }, callback) => {
		try {
			let code = rooms.generateRoomCode();
			while (await rooms.roomExists(code)) code = rooms.generateRoomCode();

			await rooms.createRoom({ code, hostId: playerId, gameId, turnDurationSec });
			const player: Player = {
				id: playerId,
				name: playerName,
				score: 0,
				connected: true,
				joinedAt: Date.now()
			};
			await rooms.addPlayer(code, player);

			socket.join(code);
			callback?.({ ok: true, code });
		} catch (e) {
			callback?.({ ok: false, message: (e as Error).message });
		}
	});

	socket.on('room:join', async ({ code }, callback) => {
		try {
			const room = await rooms.getRoom(code);
			if (!room) return callback?.({ ok: false, message: 'ไม่พบห้องนี้' });
			if (room.status !== 'lobby')
				return callback?.({ ok: false, message: 'เกมเริ่มไปแล้ว ไม่สามารถเข้าร่วมได้' });

			const existing = await rooms.getPlayer(code, playerId);
			const player: Player = existing
				? { ...existing, connected: true }
				: { id: playerId, name: playerName, score: 0, connected: true, joinedAt: Date.now() };
			await rooms.addPlayer(code, player);

			socket.join(code);
			const players = await rooms.getAllPlayers(code);
			io.to(code).emit('room:playerJoined', { player });
			callback?.({ ok: true, room, players });
		} catch (e) {
			callback?.({ ok: false, message: (e as Error).message });
		}
	});

	socket.on('room:leave', async ({ code }) => {
		await rooms.removePlayer(code, playerId);
		socket.leave(code);
		io.to(code).emit('room:playerLeft', { playerId });
	});

	socket.on('room:start', async ({ code }) => {
		const room = await rooms.getRoom(code);
		if (!room) return err(socket, code, 'ไม่พบห้องนี้');
		if (room.hostId !== playerId) return err(socket, code, 'เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้');
		await game.startGame(io, code);
	});

	socket.on('turn:revealTile', async ({ code, tileIndex }) => {
		await game.revealTile(io, code, playerId, tileIndex);
	});

	socket.on('turn:submitGuess', async ({ code, guess }) => {
		await game.submitGuess(io, code, playerId, guess);
	});

	socket.on('turn:useHint', async ({ code }) => {
		await game.useHint(io, code, playerId);
	});

	// ── Draw Together ────────────────────────────────────────────────────
	socket.on('draw:room:create', async (payload, callback) => {
		try {
			const { code } = await draw.createRoom(playerId, payload?.ratio);
			socket.join(`draw:${code}`);
			callback?.({ ok: true, code });
		} catch (e) {
			callback?.({ ok: false, message: (e as Error).message });
		}
	});

	socket.on('draw:room:join', async (payload, callback) => {
		try {
			const code = String(payload?.code ?? '').trim().toUpperCase();
			const result = await draw.joinRoom(code, playerId, playerName);
			if (!result) return callback?.({ ok: false, message: 'ไม่พบห้องนี้' });

			socket.join(`draw:${code}`);
			const player = result.players.find((p) => p.id === playerId);
			if (player) io.to(`draw:${code}`).emit('draw:room:playerJoined', { player });
			callback?.({
				ok: true,
				room: result.room,
				players: result.players,
				strokes: result.strokes,
				references: result.references,
				referenceControllers: result.referenceControllers
			});
		} catch (e) {
			callback?.({ ok: false, message: (e as Error).message });
		}
	});

	socket.on('draw:room:leave', async ({ code }) => {
		await draw.leaveRoom(io, code, playerId);
		socket.leave(`draw:${code}`);
	});

	// Only sockets that actually joined a draw room may act on it.
	const inDrawRoom = (code: string) => socket.rooms.has(`draw:${code}`);

	socket.on('draw:stroke:start', ({ code, stroke }: { code: string; stroke: Stroke }) => {
		if (!inDrawRoom(code)) return;
		// Stamp the author from the socket — per-player undo relies on this
		// being trustworthy, so never take playerId from the payload.
		const stamped: Stroke = { ...stroke, playerId };
		draw.startStroke(code, stamped);
		socket.to(`draw:${code}`).emit('draw:stroke:start', { stroke: stamped });
	});

	socket.on(
		'draw:stroke:points',
		({ code, strokeId, points }: { code: string; strokeId: string; points: Stroke['points'] }) => {
			if (!inDrawRoom(code)) return;
			draw.appendPoints(code, strokeId, playerId, points);
			socket.to(`draw:${code}`).emit('draw:stroke:points', { strokeId, points });
		}
	);

	socket.on('draw:stroke:end', ({ code, strokeId }: { code: string; strokeId: string }) => {
		if (!inDrawRoom(code)) return;
		socket.to(`draw:${code}`).emit('draw:stroke:end', { strokeId });
	});

	// Shared trace images / layers (see draw.ts). Position and size are relayed
	// live to the others while someone holds an image; everything else is
	// broadcast to all as the full (small) layer stack.
	socket.on(
		'draw:ref:add',
		async ({ code, url, aspect, name }: { code: string; url: unknown; aspect: unknown; name: unknown }) => {
			if (!inDrawRoom(code)) return;
			await draw.addReference(io, code, playerId, playerName, { url, aspect, name });
		}
	);

	socket.on(
		'draw:ref:patch',
		async ({
			code,
			id,
			patch
		}: {
			code: string;
			id: unknown;
			patch: { opacity?: unknown; locked?: unknown; rotation?: unknown };
		}) => {
			if (!inDrawRoom(code)) return;
			await draw.patchReference(io, code, playerId, id, patch ?? {});
		}
	);

	// Owner-only: make some/all of their images public or private in one go.
	socket.on(
		'draw:ref:visibility',
		async ({ code, ids, isPublic }: { code: string; ids: unknown; isPublic: unknown }) => {
			if (!inDrawRoom(code)) return;
			await draw.setReferencesVisibility(io, code, playerId, ids, isPublic);
		}
	);

	socket.on(
		'draw:ref:reorder',
		async ({ code, id, direction }: { code: string; id: unknown; direction: unknown }) => {
			if (!inDrawRoom(code)) return;
			await draw.reorderReference(io, code, playerId, id, direction);
		}
	);

	socket.on('draw:ref:grab', async ({ code, id }: { code: string; id: unknown }) => {
		if (!inDrawRoom(code)) return;
		await draw.grabReference(io, code, playerId, playerName, id);
	});

	socket.on(
		'draw:ref:move',
		({
			code,
			id,
			x,
			y,
			width,
			rotation
		}: {
			code: string;
			id: unknown;
			x: unknown;
			y: unknown;
			width: unknown;
			rotation: unknown;
		}) => {
			if (!inDrawRoom(code)) return;
			const reference = draw.moveReference(code, playerId, { id, x, y, width, rotation });
			if (reference) {
				// A private image is only ever relayed to its owner (their other tabs).
				const audience =
					reference.isPublic || reference.ownerId === '' ? `draw:${code}` : `player:${reference.ownerId}`;
				socket
					.to(audience)
					.emit('draw:ref:moved', {
						id: reference.id,
						x: reference.x,
						y: reference.y,
						width: reference.width,
						rotation: reference.rotation
					});
			}
		}
	);

	socket.on('draw:ref:release', async ({ code, id }: { code: string; id: unknown }) => {
		if (!inDrawRoom(code)) return;
		await draw.releaseReference(io, code, playerId, id);
	});

	socket.on('draw:ref:delete', async ({ code, id }: { code: string; id: unknown }) => {
		if (!inDrawRoom(code)) return;
		await draw.deleteReference(io, code, playerId, id);
	});

	// Clearing the canvas is a room vote (see draw.ts); there is no direct clear.
	socket.on('draw:clear:request', async ({ code }: { code: string }) => {
		if (!inDrawRoom(code)) return;
		await draw.requestClear(io, code, playerId);
	});

	socket.on('draw:clear:respond', ({ code, approve }: { code: string; approve: boolean }) => {
		if (!inDrawRoom(code)) return;
		draw.respondClear(io, code, playerId, approve === true);
	});

	socket.on('draw:clear:cancel', ({ code }: { code: string }) => {
		if (!inDrawRoom(code)) return;
		draw.cancelClear(io, code, playerId);
	});

	socket.on('draw:undo', ({ code }: { code: string }) => {
		if (!inDrawRoom(code)) return;
		const strokeId = draw.undoLastStroke(code, playerId);
		if (strokeId) io.to(`draw:${code}`).emit('draw:undone', { strokeId });
	});

	// 'disconnecting', not 'disconnect': by the time 'disconnect' fires Socket.IO
	// has already removed the socket from every room, so socket.rooms is empty.
	// Snapshot it — the loop awaits and the set is emptied right after this event.
	socket.on('disconnecting', async () => {
		for (const room of [...socket.rooms]) {
			if (room === socket.id || room === `player:${playerId}`) continue;
			if (room.startsWith('draw:')) {
				await draw.handleDisconnect(io, room.slice('draw:'.length), playerId);
			} else {
				await game.handleDisconnect(io, room, playerId);
			}
		}
	});
});

httpServer.listen(PORT, () => {
	console.log(`[peechy-realtime] listening on :${PORT}`);
});
