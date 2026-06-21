import { io, type Socket } from 'socket.io-client';
import { env } from '$env/dynamic/public';
import type { IMultiplayerPlayer, IMultiplayerRoom, TurnDuration } from '$lib/data/interface/multiplayer';

interface AckResponse {
	ok: boolean;
	message?: string;
	code?: string;
	room?: IMultiplayerRoom;
	players?: IMultiplayerPlayer[];
}

export default class MultiplayerService {
	private static socket: Socket | null = null;

	static connect(playerId: string, playerName: string): Socket {
		// Reuse the existing socket whenever one exists — including while it's
		// still connecting — otherwise reactive callers (e.g. a Svelte $effect
		// that fires more than once) spin up a new underlying connection on
		// every call and exhaust the browser's connection pool.
		if (this.socket) return this.socket;

		const url = env.PUBLIC_SOCKET_URL || 'http://localhost:4001';
		this.socket = io(url, {
			auth: { playerId, playerName },
			autoConnect: true
		});
		return this.socket;
	}

	static getSocket(): Socket {
		if (!this.socket) throw new Error('Socket not connected — call MultiplayerService.connect() first');
		return this.socket;
	}

	static disconnect(): void {
		this.socket?.disconnect();
		this.socket = null;
	}

	static createRoom(gameId: number, turnDurationSec: TurnDuration): Promise<AckResponse> {
		return new Promise((resolve) => {
			this.getSocket().emit('room:create', { gameId, turnDurationSec }, resolve);
		});
	}

	static joinRoom(code: string): Promise<AckResponse> {
		return new Promise((resolve) => {
			this.getSocket().emit('room:join', { code }, resolve);
		});
	}

	static leaveRoom(code: string): void {
		this.getSocket().emit('room:leave', { code });
	}

	static startGame(code: string): void {
		this.getSocket().emit('room:start', { code });
	}

	static revealTile(code: string, tileIndex: number): void {
		this.getSocket().emit('turn:revealTile', { code, tileIndex });
	}

	static submitGuess(code: string, guess: string): void {
		this.getSocket().emit('turn:submitGuess', { code, guess });
	}

	static useHint(code: string): void {
		this.getSocket().emit('turn:useHint', { code });
	}
}
