import { goto } from '$app/navigation';
import { get, writable } from 'svelte/store';
import { authUserStore } from '$lib/data/stores/authUser';
import GameService from '$lib/data/services/game';
import ImageService from '$lib/data/services/image';

// ── Types ─────────────────────────────────────────────────────────────────────
export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export type ImageSlot = {
	_id: string;
	dbId?: number;
	previewUrl: string;
	uploadedUrl: string;
	uploadedKey: string;
	status: UploadStatus;
	errorMsg: string;
	answer: string;
	hint: string;
	gridSize: number;
	timeLimit: string;
	maxReveal: string;
};

interface GameCreateState {
	gameName: string;
	description: string;
	difficulty: string;
	isPublic: boolean;
	slots: ImageSlot[];
	pendingDeletes: number[];
	loadingEdit: boolean;
	submitting: boolean;
	submitError: string;
	thumbnailPreview: string;
	thumbnailUrl: string;
	thumbnailKey: string;
	thumbnailStatus: UploadStatus;
	thumbnailError: string;
}

// ── Store ──────────────────────────────────────────────────────────────────────
const initial: GameCreateState = {
	gameName: '',
	description: '',
	difficulty: '',
	isPublic: true,
	slots: [],
	pendingDeletes: [],
	loadingEdit: false,
	submitting: false,
	submitError: '',
	thumbnailPreview: '',
	thumbnailUrl: '',
	thumbnailKey: '',
	thumbnailStatus: 'idle',
	thumbnailError: ''
};

export const gameCreateStore = writable<GameCreateState>({
	...initial,
	slots: [],
	pendingDeletes: []
});

export function resetGameCreateStore() {
	gameCreateStore.set({ ...initial, slots: [], pendingDeletes: [] });
}

// ── Load for edit mode ─────────────────────────────────────────────────────────
export async function loadEditData(id: number) {
	gameCreateStore.update((s) => ({ ...s, loadingEdit: true }));
	try {
		const [gameRes, imagesRes] = await Promise.all([
			GameService.getOne(id),
			ImageService.paginate({ gameId: id }, 1, 100)
		]);
		if (gameRes.status === 'success') {
			const g = gameRes.doc;
			gameCreateStore.update((s) => ({
				...s,
				gameName: g.name,
				description: g.description ?? '',
				difficulty: g.difficulty ?? '',
				isPublic: g.isPublic ?? true,
				thumbnailPreview: g.thumbnailUrl ?? '',
				thumbnailUrl: g.thumbnailUrl ?? '',
				thumbnailKey: '',
				thumbnailStatus: g.thumbnailUrl ? 'done' : 'idle',
				thumbnailError: ''
			}));
		}
		if (imagesRes.status === 'success') {
			const slots: ImageSlot[] = imagesRes.docs.map((img) => ({
				_id: crypto.randomUUID(),
				dbId: img.id,
				previewUrl: img.imageUrl,
				uploadedUrl: img.imageUrl,
				uploadedKey: '',
				status: 'done' as UploadStatus,
				errorMsg: '',
				answer: img.answer,
				hint: img.hint ?? '',
				gridSize: img.gridSize,
				timeLimit: img.timeLimit != null ? String(img.timeLimit) : '',
				maxReveal: img.maxReveal != null ? String(img.maxReveal) : ''
			}));
			gameCreateStore.update((s) => ({ ...s, slots }));
		}
	} finally {
		gameCreateStore.update((s) => ({ ...s, loadingEdit: false }));
	}
}

// ── Slot management ────────────────────────────────────────────────────────────
export function addSlot() {
	const newSlot: ImageSlot = {
		_id: crypto.randomUUID(),
		previewUrl: '',
		uploadedUrl: '',
		uploadedKey: '',
		status: 'idle',
		errorMsg: '',
		answer: '',
		hint: '',
		gridSize: 5,
		timeLimit: '',
		maxReveal: ''
	};
	gameCreateStore.update((s) => ({ ...s, slots: [...s.slots, newSlot] }));
}

export function updateSlotField<K extends keyof ImageSlot>(
	slotId: string,
	field: K,
	value: ImageSlot[K]
) {
	gameCreateStore.update((s) => ({
		...s,
		slots: s.slots.map((sl) => (sl._id === slotId ? { ...sl, [field]: value } : sl))
	}));
}

export async function handleDropFiles(files: FileList | File[]) {
	const fileArr = Array.from(files).filter((f) => f.type.startsWith('image/'));
	if (!fileArr.length) return;

	const newSlots: ImageSlot[] = fileArr.map((file) => ({
		_id: crypto.randomUUID(),
		previewUrl: URL.createObjectURL(file),
		uploadedUrl: '',
		uploadedKey: '',
		status: 'uploading' as UploadStatus,
		errorMsg: '',
		answer: '',
		hint: '',
		gridSize: 5,
		timeLimit: '',
		maxReveal: ''
	}));

	gameCreateStore.update((s) => ({ ...s, slots: [...s.slots, ...newSlots] }));

	await Promise.all(
		fileArr.map(async (file, i) => {
			const slotId = newSlots[i]._id;
			try {
				const fd = new FormData();
				fd.append('file', file);
				const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
				const data: { status: string; key?: string; url?: string; error?: string } =
					await res.json();
				if (data.status !== 'success') throw new Error(data.error ?? 'อัพโหลดล้มเหลว');
				gameCreateStore.update((s) => ({
					...s,
					slots: s.slots.map((sl) =>
						sl._id === slotId
							? {
									...sl,
									uploadedUrl: data.url!,
									uploadedKey: data.key!,
									status: 'done' as UploadStatus
								}
							: sl
					)
				}));
			} catch (err) {
				gameCreateStore.update((s) => ({
					...s,
					slots: s.slots.map((sl) =>
						sl._id === slotId
							? { ...sl, status: 'error' as UploadStatus, errorMsg: (err as Error).message }
							: sl
					)
				}));
			}
		})
	);
}

export async function handleFilePick(slotId: string, e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	const slot = get(gameCreateStore).slots.find((s) => s._id === slotId);
	if (!slot) return;

	if (slot.previewUrl.startsWith('blob:')) URL.revokeObjectURL(slot.previewUrl);
	const previewUrl = URL.createObjectURL(file);

	gameCreateStore.update((s) => ({
		...s,
		slots: s.slots.map((sl) =>
			sl._id === slotId
				? { ...sl, previewUrl, status: 'uploading' as UploadStatus, errorMsg: '' }
				: sl
		)
	}));

	try {
		const fd = new FormData();
		fd.append('file', file);
		const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
		const data: { status: string; key?: string; url?: string; error?: string } = await res.json();
		if (data.status !== 'success') throw new Error(data.error ?? 'อัพโหลดล้มเหลว');
		gameCreateStore.update((s) => ({
			...s,
			slots: s.slots.map((sl) =>
				sl._id === slotId
					? {
							...sl,
							uploadedUrl: data.url!,
							uploadedKey: data.key!,
							status: 'done' as UploadStatus
						}
					: sl
			)
		}));
	} catch (err) {
		gameCreateStore.update((s) => ({
			...s,
			slots: s.slots.map((sl) =>
				sl._id === slotId
					? { ...sl, status: 'error' as UploadStatus, errorMsg: (err as Error).message }
					: sl
			)
		}));
	}
}

export async function handleThumbnailPick(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	const { thumbnailPreview } = get(gameCreateStore);
	if (thumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(thumbnailPreview);
	const previewUrl = URL.createObjectURL(file);

	gameCreateStore.update((s) => ({
		...s,
		thumbnailPreview: previewUrl,
		thumbnailStatus: 'uploading',
		thumbnailError: ''
	}));

	try {
		const fd = new FormData();
		fd.append('file', file);
		const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
		const data: { status: string; key?: string; url?: string; error?: string } = await res.json();
		if (data.status !== 'success') throw new Error(data.error ?? 'อัพโหลดล้มเหลว');
		gameCreateStore.update((s) => ({
			...s,
			thumbnailUrl: data.url!,
			thumbnailKey: data.key!,
			thumbnailStatus: 'done'
		}));
	} catch (err) {
		gameCreateStore.update((s) => ({
			...s,
			thumbnailStatus: 'error',
			thumbnailError: (err as Error).message
		}));
	}
}

export function removeThumbnail() {
	const { thumbnailPreview } = get(gameCreateStore);
	if (thumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(thumbnailPreview);
	gameCreateStore.update((s) => ({
		...s,
		thumbnailPreview: '',
		thumbnailUrl: '',
		thumbnailKey: '',
		thumbnailStatus: 'idle',
		thumbnailError: ''
	}));
}

export function moveUp(idx: number) {
	const { slots } = get(gameCreateStore);
	if (idx === 0) return;
	const arr = slots.map((s) => ({ ...s }));
	[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
	gameCreateStore.update((s) => ({ ...s, slots: arr }));
}

export function moveDown(idx: number) {
	const { slots } = get(gameCreateStore);
	if (idx >= slots.length - 1) return;
	const arr = slots.map((s) => ({ ...s }));
	[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
	gameCreateStore.update((s) => ({ ...s, slots: arr }));
}

export function removeSlot(slotId: string) {
	const slot = get(gameCreateStore).slots.find((s) => s._id === slotId);
	if (!slot) return;
	if (slot.previewUrl.startsWith('blob:')) URL.revokeObjectURL(slot.previewUrl);
	gameCreateStore.update((s) => ({
		...s,
		slots: s.slots.filter((sl) => sl._id !== slotId),
		pendingDeletes: slot.dbId !== undefined ? [...s.pendingDeletes, slot.dbId] : s.pendingDeletes
	}));
}

// ── Submit ─────────────────────────────────────────────────────────────────────
export async function handleSubmit(e: SubmitEvent, editId: number | null) {
	e.preventDefault();
	gameCreateStore.update((s) => ({ ...s, submitError: '' }));

	const { gameName, description, difficulty, isPublic, slots, pendingDeletes, thumbnailUrl } =
		get(gameCreateStore);
	const user = get(authUserStore).user;

	if (!gameName.trim()) {
		gameCreateStore.update((s) => ({ ...s, submitError: 'กรุณากรอกชื่อเกม' }));
		return;
	}
	if (slots.length === 0) {
		gameCreateStore.update((s) => ({ ...s, submitError: 'กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูป' }));
		return;
	}
	for (const slot of slots) {
		if (slot.status === 'uploading') {
			gameCreateStore.update((s) => ({ ...s, submitError: 'กรุณารอให้อัพโหลดรูปเสร็จก่อน' }));
			return;
		}
		if (slot.status !== 'done') {
			gameCreateStore.update((s) => ({
				...s,
				submitError: 'รูปภาพบางรูปยังไม่ได้อัพโหลด กรุณาเลือกรูปอีกครั้ง'
			}));
			return;
		}
		if (!slot.answer.trim()) {
			gameCreateStore.update((s) => ({
				...s,
				submitError: 'กรุณากรอกคำตอบสำหรับทุกรูปภาพ'
			}));
			return;
		}
	}

	gameCreateStore.update((s) => ({ ...s, submitting: true }));
	try {
		let gameId: number;

		if (editId) {
			const res = await GameService.update(editId, {
				name: gameName.trim(),
				description: description.trim() || undefined,
				difficulty: difficulty || undefined,
				isPublic,
				thumbnailUrl: thumbnailUrl || undefined
			});
			if (res.status !== 'success') throw new Error(res.error ?? 'ไม่สามารถบันทึกเกมได้');
			gameId = editId;
		} else {
			const res = await GameService.create({
				name: gameName.trim(),
				description: description.trim() || undefined,
				creatorId: user?.id ?? null,
				difficulty: difficulty || undefined,
				isPublic,
				thumbnailUrl: thumbnailUrl || undefined
			});
			if (res.status !== 'success') throw new Error(res.error ?? 'ไม่สามารถสร้างเกมได้');
			gameId = res.doc.id;
		}

		if (pendingDeletes.length > 0) await ImageService.deleteMany(pendingDeletes);

		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i];
			const payload = {
				gameId,
				imageUrl: slot.uploadedUrl,
				answer: slot.answer.trim(),
				hint: slot.hint.trim() || undefined,
				gridSize: slot.gridSize,
				orderIndex: i,
				timeLimit: slot.timeLimit ? parseInt(slot.timeLimit) : undefined,
				maxReveal: slot.maxReveal ? parseInt(slot.maxReveal) : undefined
			};
			if (slot.dbId !== undefined) {
				await ImageService.update(slot.dbId, payload);
			} else {
				await ImageService.create(payload);
			}
		}

		goto(`/game/detail/${gameId}`);
	} catch (err) {
		gameCreateStore.update((s) => ({ ...s, submitError: (err as Error).message }));
	} finally {
		gameCreateStore.update((s) => ({ ...s, submitting: false }));
	}
}
