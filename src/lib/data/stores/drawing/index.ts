import { writable, get } from 'svelte/store';
import MultiplayerService from '$lib/data/services/multiplayer';
import DrawingService from '$lib/data/services/multiplayer/drawing';
import type { DrawRatio, IDrawPlayer, IDrawRoom, IStroke } from '$lib/data/interface/drawing';

interface DrawingState {
	connecting: boolean;
	error: string;
	room: IDrawRoom | null;
	players: IDrawPlayer[];
	selfId: string;
	// Snapshot of strokes already on the canvas when this client joined —
	// consumed once by DrawCanvas for the initial paint. Live strokes after
	// that are handled directly by DrawCanvas via socket events, not here.
	initialStrokes: IStroke[];
	// Bumped whenever initialStrokes is replaced after mount (reconnect
	// re-sync), telling DrawCanvas to reload its history from the snapshot.
	syncVersion: number;
}

const initial: DrawingState = {
	connecting: false,
	error: '',
	room: null,
	players: [],
	selfId: '',
	initialStrokes: [],
	syncVersion: 0
};

export const drawingStore = writable<DrawingState>({ ...initial });

export function resetDrawingStore() {
	drawingStore.set({ ...initial });
}

export function connect(playerId: string, playerName: string) {
	drawingStore.update((s) => ({ ...s, selfId: playerId }));
	const socket = MultiplayerService.connect(playerId, playerName);
	_bindEvents();
	return socket;
}

export async function createRoom(ratio: DrawRatio): Promise<string | null> {
	drawingStore.update((s) => ({ ...s, connecting: true, error: '' }));
	const res = await DrawingService.createRoom(ratio);
	drawingStore.update((s) => ({ ...s, connecting: false }));
	if (!res.ok) {
		drawingStore.update((s) => ({ ...s, error: res.message ?? 'สร้างห้องไม่สำเร็จ' }));
		return null;
	}
	return res.code ?? null;
}

export async function joinRoom(code: string): Promise<boolean> {
	drawingStore.update((s) => ({ ...s, connecting: true, error: '' }));
	const res = await DrawingService.joinRoom(code);
	drawingStore.update((s) => ({ ...s, connecting: false }));
	if (!res.ok || !res.room) {
		drawingStore.update((s) => ({ ...s, error: res.message ?? 'เข้าร่วมห้องไม่สำเร็จ' }));
		return false;
	}
	drawingStore.update((s) => ({
		...s,
		room: res.room!,
		players: res.players ?? [],
		initialStrokes: res.strokes ?? []
	}));
	return true;
}

export function leaveRoom() {
	const { room } = get(drawingStore);
	if (room) DrawingService.leaveRoom(room.code);
	resetDrawingStore();
}

// A reconnected socket gets a new id and is NOT in any Socket.IO room, so the
// server would ignore all its draw events (strokes, undo, clear) until it
// joins again. Re-join and pull the room's current strokes.
async function resyncAfterReconnect(code: string) {
	const res = await DrawingService.joinRoom(code);
	if (!res.ok || !res.room) return;
	drawingStore.update((s) => ({
		...s,
		room: res.room!,
		players: res.players ?? s.players,
		initialStrokes: res.strokes ?? [],
		syncVersion: s.syncVersion + 1
	}));
}

let bound = false;

function _bindEvents() {
	if (bound) return;
	bound = true;
	const socket = MultiplayerService.getSocket();

	let hasConnected = socket.connected;
	socket.on('connect', () => {
		if (!hasConnected) {
			hasConnected = true;
			return;
		}
		const { room } = get(drawingStore);
		if (room) void resyncAfterReconnect(room.code);
	});

	socket.on('draw:room:playerJoined', ({ player }: { player: IDrawPlayer }) => {
		drawingStore.update((s) => ({
			...s,
			players: [...s.players.filter((p) => p.id !== player.id), player]
		}));
	});

	socket.on('draw:room:playerLeft', ({ playerId }: { playerId: string }) => {
		drawingStore.update((s) => ({
			...s,
			players: s.players.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
		}));
	});
}
