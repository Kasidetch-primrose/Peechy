import { writable, get } from 'svelte/store';
import MultiplayerService from '$lib/data/services/multiplayer';
import DrawingService from '$lib/data/services/multiplayer/drawing';
import type {
	ClearResultStatus,
	DrawRatio,
	IClearNotice,
	IClearVote,
	IDrawPlayer,
	IDrawReference,
	IDrawRoom,
	IRefController,
	IStroke,
	RefDeniedReason
} from '$lib/data/interface/drawing';

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
	clearVote: IClearVote | null;
	clearNotice: IClearNotice | null; // outcome of the last vote, shown briefly
	clearCooldownUntil: number; // epoch ms; no new vote can start before this
	reference: IDrawReference | null; // the shared trace image, if any
	refController: IRefController | null; // who is moving/resizing it right now
	refNotice: { id: number; reason: RefDeniedReason; byName?: string } | null;
}

const initial: DrawingState = {
	connecting: false,
	error: '',
	room: null,
	players: [],
	selfId: '',
	initialStrokes: [],
	syncVersion: 0,
	clearVote: null,
	clearNotice: null,
	clearCooldownUntil: 0,
	reference: null,
	refController: null,
	refNotice: null
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
		initialStrokes: res.strokes ?? [],
		reference: res.reference ?? null,
		refController: res.referenceController ?? null
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
		syncVersion: s.syncVersion + 1,
		clearVote: null,
		reference: res.reference ?? null,
		refController: res.referenceController ?? null
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

	socket.on('draw:clear:vote', (vote: IClearVote) => {
		drawingStore.update((s) => ({ ...s, clearVote: vote }));
	});

	function showNotice(notice: IClearNotice, patch: Partial<DrawingState> = {}) {
		drawingStore.update((s) => ({ ...s, ...patch, clearNotice: notice }));
		setTimeout(() => {
			drawingStore.update((s) => (s.clearNotice?.id === notice.id ? { ...s, clearNotice: null } : s));
		}, 4000);
	}

	socket.on(
		'draw:clear:result',
		({
			status,
			byName,
			cooldownUntil
		}: {
			status: ClearResultStatus;
			byName?: string;
			cooldownUntil?: number;
		}) => {
			showNotice(
				{ id: Date.now(), status, byName },
				{ clearVote: null, clearCooldownUntil: cooldownUntil ?? 0 }
			);
		}
	);

	// The server refused our request: a vote is already running, or the
	// room is in its post-vote cooldown.
	socket.on('draw:clear:denied', ({ reason, retryAt }: { reason: 'busy' | 'cooldown'; retryAt?: number }) => {
		showNotice(
			{
				id: Date.now(),
				status: reason,
				seconds: retryAt ? Math.max(1, Math.ceil((retryAt - Date.now()) / 1000)) : undefined
			},
			retryAt ? { clearCooldownUntil: retryAt } : {}
		);
	});

	socket.on('draw:ref:state', ({ reference }: { reference: IDrawReference | null }) => {
		// Deleting the image also ends any drag on it.
		drawingStore.update((s) => ({
			...s,
			reference,
			refController: reference ? s.refController : null
		}));
	});

	socket.on('draw:ref:control', ({ controller }: { controller: IRefController | null }) => {
		drawingStore.update((s) => ({ ...s, refController: controller }));
	});

	socket.on('draw:ref:denied', ({ reason, byName }: { reason: RefDeniedReason; byName?: string }) => {
		const notice = { id: Date.now(), reason, byName };
		drawingStore.update((s) => ({ ...s, refNotice: notice }));
		setTimeout(() => {
			drawingStore.update((s) => (s.refNotice?.id === notice.id ? { ...s, refNotice: null } : s));
		}, 3000);
	});

	socket.on('draw:room:playerLeft', ({ playerId }: { playerId: string }) => {
		drawingStore.update((s) => ({
			...s,
			players: s.players.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
		}));
	});
}
