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
	IPublishNotice,
	IPublishVote,
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
	publishVote: IPublishVote | null;
	publishNotice: IPublishNotice | null;
	// One-time ticket the server gives ONLY the player who asked, once everyone agreed;
	// the room page redeems it by uploading the PNG.
	publishTicket: string | null;
	// Trace layers this player may see, bottom → top: every public one plus their own
	// private ones (the server never sends anyone else's private layers).
	references: IDrawReference[];
	refControllers: Record<string, IRefController>; // imageId -> who is moving/resizing it right now
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
	publishVote: null,
	publishNotice: null,
	publishTicket: null,
	references: [],
	refControllers: {},
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
		references: res.references ?? [],
		refControllers: res.referenceControllers ?? {}
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
		publishVote: null,
		references: res.references ?? [],
		refControllers: res.referenceControllers ?? {}
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

	// ── Publish vote (same shape as the clear vote) ──
	function showPublishNotice(notice: IPublishNotice, patch: Partial<DrawingState> = {}, ms = 4000) {
		drawingStore.update((s) => ({ ...s, ...patch, publishNotice: notice }));
		setTimeout(() => {
			drawingStore.update((s) => (s.publishNotice?.id === notice.id ? { ...s, publishNotice: null } : s));
		}, ms);
	}

	socket.on('draw:publish:vote', (vote: IPublishVote) => {
		drawingStore.update((s) => ({ ...s, publishVote: vote }));
	});

	socket.on('draw:publish:approved', ({ ticket }: { ticket: string }) => {
		drawingStore.update((s) => ({ ...s, publishTicket: ticket }));
	});

	socket.on(
		'draw:publish:result',
		({ status, byName, initiatorId }: { status: IPublishNotice['status']; byName?: string; initiatorId: string }) => {
			// "Approved" is followed by the real outcome (published / failed), so skip a notice for it.
			if (status === 'approved') {
				drawingStore.update((s) => ({ ...s, publishVote: null }));
				return;
			}
			void initiatorId;
			showPublishNotice({ id: Date.now(), status, byName }, { publishVote: null });
		}
	);

	socket.on('draw:publish:denied', ({ reason, retryAt }: { reason: 'busy' | 'cooldown' | 'invalid'; retryAt?: number }) => {
		showPublishNotice({
			id: Date.now(),
			status: reason,
			seconds: retryAt ? Math.max(1, Math.ceil((retryAt - Date.now()) / 1000)) : undefined
		});
	});

	socket.on('draw:publish:published', ({ artworkId, title }: { artworkId: string; title: string }) => {
		showPublishNotice({ id: Date.now(), status: 'published', artworkId, title }, {}, 20000);
	});

	socket.on('draw:ref:state', ({ references }: { references: IDrawReference[] }) => {
		drawingStore.update((s) => ({ ...s, references }));
	});

	// Live position updates from whoever is dragging a shared layer.
	socket.on(
		'draw:ref:moved',
		({ id, x, y, width, rotation }: { id: string; x: number; y: number; width: number; rotation: number }) => {
			drawingStore.update((s) => ({
				...s,
				references: s.references.map((r) => (r.id === id ? { ...r, x, y, width, rotation } : r))
			}));
		}
	);

	socket.on('draw:ref:control', ({ controllers }: { controllers: Record<string, IRefController> }) => {
		drawingStore.update((s) => ({ ...s, refControllers: controllers }));
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
