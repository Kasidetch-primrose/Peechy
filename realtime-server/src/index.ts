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

	socket.on('draw:room:join', async ({ code }, callback) => {
		try {
			const result = await draw.joinRoom(code, playerId, playerName);
			if (!result) return callback?.({ ok: false, message: 'ไม่พบห้องนี้' });

			socket.join(`draw:${code}`);
			const player = result.players.find((p) => p.id === playerId);
			if (player) io.to(`draw:${code}`).emit('draw:room:playerJoined', { player });
			callback?.({ ok: true, room: result.room, players: result.players, strokes: result.strokes });
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

	socket.on('draw:clear', ({ code }: { code: string }) => {
		if (!inDrawRoom(code)) return;
		draw.clearRoom(code);
		io.to(`draw:${code}`).emit('draw:cleared');
	});

	socket.on('draw:undo', ({ code }: { code: string }) => {
		if (!inDrawRoom(code)) return;
		const strokeId = draw.undoLastStroke(code, playerId);
		if (strokeId) io.to(`draw:${code}`).emit('draw:undone', { strokeId });
	});

	socket.on('disconnect', async () => {
		for (const room of socket.rooms) {
			if (room === socket.id) continue;
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
