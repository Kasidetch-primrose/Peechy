<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { fade, fly, scale } from 'svelte/transition';
	import { copyText } from '$lib/utils/clipboard';
	import { uploadReferenceImage } from '$lib/utils/reference-image';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import { connect, drawingStore, joinRoom, leaveRoom } from '$lib/data/stores/drawing';
	import DrawingService from '$lib/data/services/multiplayer/drawing';
	import DrawCanvas from '$lib/components/DrawCanvas.svelte';
	import GuestNameModal from '$lib/components/GuestNameModal.svelte';
	import ClearVotePrompt from '$lib/components/ClearVotePrompt.svelte';
	import { getGuestId, saveGuestName } from '$lib/utils/guest-identity';
	import type { DrawTool, IDrawReference } from '$lib/data/interface/drawing';

	const code = $derived((page.params.code ?? '').toUpperCase());
	const selfId = $derived($drawingStore.selfId);
	let showGuestModal = $state(false);
	let canUndo = $state(false);
	let showClearConfirm = $state(false);

	// ── Trace-image layers (Photoshop-style) ───────────────────────────────
	// Every image is uploaded to the room by someone — its owner — and starts PRIVATE:
	// the server only sends it to the owner. The owner can make it public (everyone
	// sees and can adjust it) or private again, one at a time or via "select all".
	// The drawing is always above all the layers.
	let showRefPanel = $state(false);
	let showHelp = $state(false);
	let confirmLeave = $state(false);
	let refPanelWrap = $state<HTMLElement | null>(null);
	let selectedRefId = $state<string | null>(null); // the layer being adjusted (opacity, rotation, position…)
	let checkedIds = $state<string[]>([]); // tick boxes for the bulk public/private buttons
	let deleteTarget = $state<IDrawReference | null>(null);
	let uploading = $state(false);
	// Images that are still uploading: shown in the layer list with a spinner (local preview).
	let pendingUploads = $state<{ key: number; name: string; preview: string }[]>([]);
	let pendingKey = 0;
	let fileInput = $state<HTMLInputElement>();
	let awaitingNewLayer = $state(false); // select the layer the server is about to add
	let layerCountBefore = 0;

	const layers = $derived($drawingStore.references); // bottom → top, only what this player may see
	const refControllers = $derived($drawingStore.refControllers);
	const refNotice = $derived($drawingStore.refNotice);

	// Eye toggle (Photoshop style): only hides the image on THIS screen, nobody else is affected.
	let hiddenIds = $state<string[]>([]);
	const visibleLayers = $derived(layers.filter((l) => !hiddenIds.includes(l.id)));
	const anyVisible = $derived(visibleLayers.length > 0);
	function toggleHidden(id: string) {
		hiddenIds = hiddenIds.includes(id) ? hiddenIds.filter((x) => x !== id) : [...hiddenIds, id];
		if (selectedRefId === id && hiddenIds.includes(id)) selectedRefId = null;
	}
	// One button: if anything is showing, hide everything first; otherwise show everything.
	function toggleAllHidden() {
		if (anyVisible) {
			hiddenIds = layers.map((l) => l.id);
			selectedRefId = null;
		} else {
			hiddenIds = [];
		}
	}
	$effect(() => {
		const ids = new Set(layers.map((l) => l.id));
		if (hiddenIds.some((id) => !ids.has(id))) hiddenIds = hiddenIds.filter((id) => ids.has(id));
	});
	const layerList = $derived([...layers].reverse()); // panel order: top first
	const canSetVisibility = (layer: IDrawReference) =>
		layer.ownerId === '' || layer.ownerId === selfId;
	const myLayers = $derived(layers.filter(canSetVisibility));
	const checkedMine = $derived(myLayers.filter((l) => checkedIds.includes(l.id)));
	const allMineChecked = $derived(myLayers.length > 0 && checkedMine.length === myLayers.length);
	const selected = $derived(layers.find((l) => l.id === selectedRefId) ?? null);
	const selectedBusy = $derived(
		!!selected && !!refControllers[selected.id] && refControllers[selected.id].playerId !== selfId
	);

	// Selection follows the layers around: deselect when one is deleted or made
	// private by its owner, stop positioning when it gets locked, and picking a
	// drawing tool means "I want to draw now".
	$effect(() => {
		if (selectedRefId && !selected) selectedRefId = null;
	});
	$effect(() => {
		const ids = new Set(myLayers.map((l) => l.id));
		if (checkedIds.some((id) => !ids.has(id))) checkedIds = checkedIds.filter((id) => ids.has(id));
	});
	// The layer we just uploaded shows up when the server sends the new stack:
	// select it and start positioning it.
	$effect(() => {
		if (awaitingNewLayer && layers.length > layerCountBefore) {
			const mine = layers.filter((l) => l.ownerId === selfId);
			if (mine.length === 0) return;
			awaitingNewLayer = false;
			selectedRefId = mine[mine.length - 1].id;
		}
	});

	async function handleRefFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = ''; // let the same file be picked again later
		if (files.length === 0) return;
		uploading = true;
		const queued = files.map((file) => ({
			key: ++pendingKey,
			name: file.name,
			preview: URL.createObjectURL(file)
		}));
		pendingUploads = [...pendingUploads, ...queued];
		try {
			for (const [i, file] of files.entries()) {
				try {
					const image = await uploadReferenceImage(file);
					layerCountBefore = get(drawingStore).references.length;
					awaitingNewLayer = true;
					DrawingService.refAdd(code, image.url, image.aspect, image.name);
				} catch (err) {
					showToast(`${file.name}: ${(err as Error).message}`);
				} finally {
					const done = queued[i];
					pendingUploads = pendingUploads.filter((p) => p.key !== done.key);
					URL.revokeObjectURL(done.preview);
				}
			}
		} finally {
			uploading = false;
		}
	}

	// ── public / private ("who can see this image") ──
	function setVisibility(ids: string[], isPublic: boolean) {
		if (ids.length > 0) DrawingService.refSetVisibility(code, ids, isPublic);
	}

	function toggleChecked(id: string) {
		checkedIds = checkedIds.includes(id) ? checkedIds.filter((c) => c !== id) : [...checkedIds, id];
	}

	// "Select all" covers just the images this player is allowed to change.
	function toggleAllMine() {
		checkedIds = allMineChecked ? [] : myLayers.map((l) => l.id);
	}

	function canMove(layer: IDrawReference, direction: 'up' | 'down'): boolean {
		const index = layers.findIndex((r) => r.id === layer.id);
		return direction === 'up' ? index >= 0 && index < layers.length - 1 : index > 0;
	}

	function moveLayer(layer: IDrawReference, direction: 'up' | 'down') {
		DrawingService.refReorder(code, layer.id, direction);
	}

	// Opacity: at most one update per ~60ms while sliding, plus a final one on release.
	let opacityDraft = $state<{ id: string; value: number } | null>(null);
	let opacityTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingOpacity: { id: string; value: number } | null = null;

	function flushOpacity() {
		clearTimeout(opacityTimer);
		opacityTimer = undefined;
		if (pendingOpacity)
			DrawingService.refPatch(code, pendingOpacity.id, { opacity: pendingOpacity.value });
		pendingOpacity = null;
	}

	function setOpacity(layer: IDrawReference, value: number) {
		opacityDraft = { id: layer.id, value };
		pendingOpacity = { id: layer.id, value };
		if (!opacityTimer) opacityTimer = setTimeout(flushOpacity, 60);
	}

	function commitOpacity() {
		flushOpacity();
		opacityDraft = null;
	}

	function shownOpacity(layer: IDrawReference): number {
		return opacityDraft && opacityDraft.id === layer.id ? opacityDraft.value : layer.opacity;
	}

	// Rotation (degrees, clockwise, -180..180): same routing as opacity, but the
	// server refuses it while the layer is locked or someone else is dragging it.
	let rotationDraft = $state<{ id: string; value: number } | null>(null);
	let rotationTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingRotation: { id: string; value: number } | null = null;

	const normalizeAngle = (deg: number) => {
		const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
		return wrapped === -180 ? 180 : wrapped;
	};

	function flushRotation() {
		clearTimeout(rotationTimer);
		rotationTimer = undefined;
		if (pendingRotation)
			DrawingService.refPatch(code, pendingRotation.id, { rotation: pendingRotation.value });
		pendingRotation = null;
	}

	function setRotation(layer: IDrawReference, degrees: number) {
		const value = normalizeAngle(degrees);
		rotationDraft = { id: layer.id, value };
		pendingRotation = { id: layer.id, value };
		if (!rotationTimer) rotationTimer = setTimeout(flushRotation, 60);
	}

	function commitRotation() {
		flushRotation();
		rotationDraft = null;
	}

	function shownRotation(layer: IDrawReference): number {
		return rotationDraft && rotationDraft.id === layer.id ? rotationDraft.value : layer.rotation;
	}

	// Buttons: a single, immediate change (no draft/throttle needed).
	function rotateBy(layer: IDrawReference, deltaDegrees: number | null) {
		const value = deltaDegrees === null ? 0 : normalizeAngle(layer.rotation + deltaDegrees);
		DrawingService.refPatch(code, layer.id, { rotation: value });
	}

	function toggleLock(layer: IDrawReference) {
		DrawingService.refPatch(code, layer.id, { locked: !layer.locked });
	}

	function confirmDeleteLayer() {
		const layer = deleteTarget;
		deleteTarget = null;
		if (layer) DrawingService.refDelete(code, layer.id);
	}

	const refNoticeText = $derived.by(() => {
		if (!refNotice) return '';
		if (refNotice.reason === 'busy') return `${refNotice.byName ?? 'เพื่อน'} กำลังจัดรูปอยู่`;
		if (refNotice.reason === 'locked') return '🔒 รูปนี้ถูกล็อกอยู่ ปลดล็อกก่อนถึงจะแก้ได้';
		if (refNotice.reason === 'limit') return 'อัปโหลดรูปต้นแบบได้สูงสุดคนละ 8 รูป';
		return 'รูปนี้ใช้ไม่ได้';
	});
	// The server refused an edit (someone else is dragging / layer is locked / too many).
	$effect(() => {
		if (refNotice) showToast(refNoticeText);
	});

	// Someone else's vote started while this dialog was open — it's moot now.
	$effect(() => {
		if ($drawingStore.clearVote) showClearConfirm = false;
	});

	// Rapid taps on the canvas make iOS select the nearest text (highlight
	// handles + magnifier loupe), and that text can be in the navbar, outside
	// this page's root. Nothing on the drawing screen needs selecting, so turn
	// selection off for the whole document while this page is open.
	$effect(() => {
		document.body.classList.add('no-text-select');

		// CSS alone doesn't stop iOS's selection loupe on rapid taps; vetoing the
		// selection at its source does. Form fields (the nickname box) still work.
		const blockSelection = (e: Event) => {
			const el =
				e.target instanceof Node ? (e.target.parentElement ?? (e.target as Element)) : null;
			if (el instanceof Element && el.closest('input, textarea')) return;
			e.preventDefault();
		};
		document.addEventListener('selectstart', blockSelection);

		return () => {
			document.body.classList.remove('no-text-select');
			document.removeEventListener('selectstart', blockSelection);
		};
	});

	// The navbar's height varies with screen width / login state, so measure it.
	let navHeight = $state(52);
	$effect(() => {
		const header = document.querySelector('header');
		if (!header) return;
		const observer = new ResizeObserver(
			() => (navHeight = Math.round(header.getBoundingClientRect().height))
		);
		observer.observe(header);
		return () => observer.disconnect();
	});

	let now = $state(Date.now());
	$effect(() => {
		const ticker = setInterval(() => (now = Date.now()), 500);
		return () => clearInterval(ticker);
	});
	const cooldownSeconds = $derived(
		Math.max(0, Math.ceil(($drawingStore.clearCooldownUntil - now) / 1000))
	);

	const reduceMotion =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const motion = (ms: number) => (reduceMotion ? 0 : ms);

	const PEN_COLORS = [
		'#1f2937',
		'#ff9b73',
		'#ffaab0',
		'#ffe4a0',
		'#a8edcc',
		'#a8d8ff',
		'#d4b8ff',
		'#ffffff'
	];
	let tool = $state<DrawTool>('pen');
	let color = $state(PEN_COLORS[0]);
	let strokeWidth = $state(6);

	// Same guard pattern as the guess-game lobby: only join once per code,
	// and don't read $drawingStore here or joinRoom()'s own writes would
	// re-trigger this effect and open a second socket connection.
	let joinedCode = $state('');

	$effect(() => {
		if (joinedCode === code) return;

		// Already connected this session (came from the create/join page) —
		// reuse that identity. Read via get() so joinRoom()'s own store
		// writes don't re-trigger this effect.
		if (get(drawingStore).selfId) {
			joinedCode = code;
			joinRoom(code);
			return;
		}

		const user = $authUserStore.user;
		if (user) {
			joinedCode = code;
			connect(String(user.id), user.username);
			joinRoom(code);
			return;
		}

		// Opened an invite link directly as a guest: ask for a nickname first.
		showGuestModal = true;
	});

	function handleGuestConfirm(name: string) {
		saveGuestName(name);
		showGuestModal = false;
		joinedCode = code;
		connect(getGuestId(), name);
		joinRoom(code);
	}

	function handleUndo() {
		if (canUndo) DrawingService.undo(code);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && confirmLeave) {
			confirmLeave = false;
			return;
		}
		if (e.key === 'Escape' && showHelp) {
			showHelp = false;
			return;
		}
		if (e.key === 'Escape' && showRefPanel && !deleteTarget) showRefPanel = false;
		if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
		const target = e.target as HTMLElement | null;
		if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
		e.preventDefault();
		handleUndo();
	}

	function handleLeave() {
		leaveRoom();
		goto('/game/draw');
	}

	function confirmClearRequest() {
		showClearConfirm = false;
		DrawingService.requestClear(code);
	}

	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	function showToast(text: string) {
		toast = text;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 2200);
	}
	onDestroy(() => clearTimeout(toastTimer));

	async function copyCode() {
		showToast(
			(await copyText(code))
				? `📋 คัดลอกรหัสห้องแล้ว (${code})`
				: `คัดลอกไม่สำเร็จ — รหัสห้องคือ ${code}`
		);
	}

	let canvasRef = $state<DrawCanvas>();
	let saving = $state(false);

	async function handleSave() {
		if (saving) return;
		saving = true;
		try {
			const blob = await canvasRef?.exportPng();
			if (!blob) {
				showToast('บันทึกรูปไม่สำเร็จ');
				return;
			}
			const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
			const file = new File([blob], `peechy-${code}-${stamp}.png`, { type: 'image/png' });

			// On phones the share sheet is the way to reach "Save Image"/Photos.
			// It only exists over HTTPS; elsewhere fall through to a download.
			const isTouch = matchMedia('(pointer: coarse)').matches;
			if (isTouch && navigator.canShare?.({ files: [file] })) {
				try {
					await navigator.share({ files: [file] });
					return;
				} catch (e) {
					if ((e as Error).name === 'AbortError') return; // user closed the sheet
				}
			}

			const url = URL.createObjectURL(file);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.name;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
			showToast('💾 บันทึกรูปแล้ว');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window
	onkeydown={handleKeydown}
	onpointerdown={(e) => {
		// Click / tap anywhere outside the layers panel (and its delete dialog) closes it.
		if (!showRefPanel || deleteTarget) return;
		if (refPanelWrap && !refPanelWrap.contains(e.target as Node)) showRefPanel = false;
	}}
/>

<GuestNameModal
	bind:open={showGuestModal}
	onConfirm={handleGuestConfirm}
	onCancel={() => goto('/game/draw')}
/>

{#if $drawingStore.room}
	<ClearVotePrompt {code} {selfId} />
{/if}

{#if toast}
	<div
		in:fly={{ y: -14, duration: motion(220) }}
		out:fade={{ duration: motion(160) }}
		class="pointer-events-none fixed top-20 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-gray-900/90 px-4 py-3 text-center text-sm text-white shadow-xl"
		role="status"
	>
		{toast}
	</div>
{/if}

{#if confirmLeave}
	<div
		transition:fade={{ duration: motion(180) }}
		class="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onpointerdown={(e) => {
			if (e.target === e.currentTarget) confirmLeave = false;
		}}
	>
		<div
			transition:scale={{ start: 0.94, duration: motion(200) }}
			class="mx-4 w-full max-w-[26rem] rounded-2xl bg-white p-6 shadow-xl"
		>
			<h3 class="text-base font-semibold text-gray-900">ออกจากห้องนี้?</h3>
			<p class="mt-1 text-sm text-gray-500">คุณจะออกจากห้องและกลับไปหน้าแรก ถ้าอยากกลับมาต้องใช้รหัสห้องเดิมเพื่อเข้าใหม่</p>
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={() => (confirmLeave = false)}
					class="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95"
				>
					อยู่ต่อ
				</button>
				<button
					type="button"
					onclick={() => {
						confirmLeave = false;
						handleLeave();
					}}
					class="flex-1 cursor-pointer rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400 hover:shadow-md active:scale-95"
				>
					ออกจากห้อง
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showHelp}
	<div
		transition:fade={{ duration: motion(180) }}
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="วิธีเล่น"
		tabindex="-1"
		onpointerdown={(e) => {
			if (e.target === e.currentTarget) showHelp = false;
		}}
	>
		<div
			transition:scale={{ start: 0.94, duration: motion(200) }}
			class="flex max-h-[85vh] w-full max-w-[34rem] flex-col rounded-2xl bg-white shadow-xl"
		>
			<div class="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
				<h3 class="text-base font-semibold text-gray-900">วิธีเล่น &amp; คำอธิบายปุ่ม</h3>
				<button
					type="button"
					onclick={() => (showHelp = false)}
					aria-label="ปิด"
					class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-all hover:bg-gray-100 active:scale-90"
				>
					✕
				</button>
			</div>
			<div class="space-y-5 overflow-y-auto px-6 py-4">
				<section>
					<h4 class="text-sm font-semibold text-gray-900">🎨 วาดด้วยกัน</h4>
					<ul class="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-gray-600">
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ทุกคนในห้องวาดบนกระดาษผืนเดียวกันแบบเรียลไทม์ เห็นเส้นของกันและกันทันที</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ชวนเพื่อนด้วยการกดปุ่มคัดลอกข้างรหัสห้อง แล้วให้เพื่อนใส่รหัสในช่อง “รหัสห้อง”
								หรือเปิดลิงก์เดียวกัน (ไม่ต้องล็อกอินก็เล่นได้)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>บนมือถือ: ใช้นิ้วเดียววาด ใช้สองนิ้วซูม/เลื่อนกระดาษ (สองนิ้วจะไม่ลากเส้น)</span
							>
						</li>
					</ul>
				</section>
				<section>
					<h4 class="text-sm font-semibold text-gray-900">🖌 เครื่องมือด้านล่าง</h4>
					<ul class="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-gray-600">
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span>ปากกา — วาดเส้นตามสีและขนาดที่เลือก</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ยางลบ — ลบเส้นที่วาด (ไม่ลบรูปที่อัปโหลด)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span>ถังสี — แตะพื้นที่ปิดเพื่อเทสีลงไป</span>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>จานสี — เลือกสี, แถบเลื่อน “ขนาดปากกา” — ปรับความหนาของปากกา/ยางลบ
								(วงกลมบนกระดาษคือขนาดจริง)</span
							>
						</li>
					</ul>
				</section>
				<section>
					<h4 class="text-sm font-semibold text-gray-900">⚙️ ปุ่มด้านบน</h4>
					<ul class="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-gray-600">
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ย้อนกลับ (Ctrl+Z) — ย้อนเส้นล่าสุดของ “คุณ” เท่านั้น ไม่กระทบเส้นของคนอื่น</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ล้างกระดาษ — ต้องให้ทุกคนในห้องโหวต “ตกลง” ภายใน 30 วินาที และมีคูลดาวน์ 10 วินาที
								เพื่อกันการกดพร้อมกัน</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>บันทึกรูป — ดาวน์โหลดภาพที่วาดเป็น PNG (ไม่รวมรูปที่อัปโหลดไว้ ลอกลาย)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ออกจากห้อง — ออกจากห้องนี้แล้วกลับหน้าแรก</span
							>
						</li>
					</ul>
				</section>
				<section>
					<h4 class="text-sm font-semibold text-gray-900">อัปโหลดรูป (สำหรับ ลอกลาย)</h4>
					<ul class="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-gray-600">
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>กดปุ่ม “อัปโหลดรูป” ด้านล่าง → “＋ เพิ่มรูป” เลือกได้หลายไฟล์ (PNG/JPEG/WebP
								ไม่เกิน 5 MB) รูปจะอยู่ใต้เส้นที่วาดเสมอ</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>รูปที่ยังไม่ล็อก: คลิกเพื่อเลือก ลากตัวรูปเพื่อย้าย ลากมุมเพื่อย่อ/ขยาย ลากปุ่ม ↻
								เพื่อหมุน (รูปที่ยังไม่ล็อกจะบังการวาด)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>หลังเลือกรูป การคลิกบนกระดาษครั้งแรกจะแค่ยกเลิกการเลือก ครั้งถัดไปถึงจะวาด</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ปรับความทึบและมุมหมุนได้ในแผง หรือกดปุ่ม ↺ −90° / ↻ +90° / รีเซ็ต</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>▲ ▼ — เลื่อนลำดับซ้อนของรูป (บนสุดอยู่หน้าสุด แต่เส้นวาดอยู่เหนือทุกรูปเสมอ)</span
							>
						</li>
					</ul>
				</section>
				<section>
					<h4 class="text-sm font-semibold text-gray-900">🔒 สถานะของรูป</h4>
					<ul class="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-gray-600">
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>🔒 ล็อก (ลอกลาย) — รูปนิ่ง ย้าย/ย่อขยาย/หมุน/ลบไม่ได้ แต่วาดทับได้เต็มที่ กด
								“ปลดล็อก” เพื่อแก้ไขอีกครั้ง (ใช้ปุ่ม “🔒 ล็อก” ที่ลอยบนรูปได้เลย)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>🌐 สาธารณะ — ทุกคนในห้องเห็นและช่วยกันจัดรูปได้ (รูปที่อัปโหลดใหม่เป็นแบบนี้)</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>😎 ส่วนตัว — เห็นแค่เจ้าของรูป ใช้ ลอกลาย คนเดียวโดยไม่ให้คนอื่นเห็น
								เฉพาะเจ้าของเท่านั้นที่เปลี่ยนสถานะได้</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>“เลือกทั้งหมด” + ปุ่มเปิดสาธารณะ/ตั้งเป็นส่วนตัว — เปลี่ยนสถานะหลายรูปพร้อมกัน</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>👁 ปุ่มตา — ซ่อน/แสดงรูปบนหน้าจอของคุณเท่านั้น (คนอื่นไม่ได้รับผล) ปุ่ม
								“ซ่อนทั้งหมด/แสดงทั้งหมด” ที่หัวแผงทำงานเป็นปุ่มเดียว:
								ถ้ามีรูปที่แสดงอยู่จะซ่อนทั้งหมดก่อน กดอีกครั้งจึงแสดงทั้งหมด</span
							>
						</li>
						<li class="flex gap-2">
							<span class="text-primary-400">•</span><span
								>ถ้ามีคนอื่นกำลังลากรูปอยู่ จะขึ้นป้าย “กำลังจัดรูป” รอให้เขาปล่อยก่อนถึงจะจับได้</span
							>
						</li>
					</ul>
				</section>
			</div>
			<div class="border-t border-gray-100 px-6 py-3">
				<button
					type="button"
					onclick={() => (showHelp = false)}
					class="w-full cursor-pointer rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-400 hover:shadow-md active:scale-95"
				>
					เข้าใจแล้ว
				</button>
			</div>
		</div>
	</div>
{/if}

{#if deleteTarget}
	<div
		transition:fade={{ duration: motion(180) }}
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div
			transition:scale={{ start: 0.94, duration: motion(200) }}
			class="mx-4 w-full max-w-[26rem] rounded-2xl bg-white p-6 shadow-xl"
		>
			<h3 class="text-base font-semibold text-gray-900">ลบรูป "{deleteTarget.name}"?</h3>
			<p class="mt-1 text-sm text-gray-500">
				{#if deleteTarget.isPublic}
					รูปนี้จะหายไปจากหน้าจอของทุกคนในห้อง (เส้นที่วาดไว้แล้วไม่ถูกลบ)
				{:else}
					รูปนี้จะถูกลบออกจากห้อง (เส้นที่วาดไว้แล้วไม่ถูกลบ)
				{/if}
			</p>
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={() => (deleteTarget = null)}
					class="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95"
				>
					ยกเลิก
				</button>
				<button
					type="button"
					onclick={confirmDeleteLayer}
					class="flex-1 cursor-pointer rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400 hover:shadow-md active:scale-95"
				>
					ลบรูป
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showClearConfirm}
	<div
		transition:fade={{ duration: motion(180) }}
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div
			transition:scale={{ start: 0.94, duration: motion(200) }}
			class="mx-4 w-full max-w-[26rem] rounded-2xl bg-white p-6 shadow-xl"
		>
			<h3 class="text-base font-semibold text-gray-900">ขอล้างกระดาษ?</h3>
			<p class="mt-1 text-sm text-gray-500">
				ระบบจะให้ทุกคนในห้องโหวต ต้องเห็นด้วยครบทุกคนจึงจะล้าง ถ้ามีคนไม่เห็นด้วยหรือหมดเวลา 30
				วินาที กระดาษจะไม่ถูกล้าง
			</p>
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={() => (showClearConfirm = false)}
					class="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95"
				>
					ยกเลิก
				</button>
				<button
					type="button"
					onclick={confirmClearRequest}
					class="flex-1 cursor-pointer rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-400 hover:shadow-md active:scale-95 active:bg-primary-600"
				>
					ขอล้างกระดาษ
				</button>
			</div>
		</div>
	</div>
{/if}

{#if !$drawingStore.room && !$drawingStore.error}
	<div class="flex min-h-screen items-center justify-center">
		<span class="text-sm text-gray-400">กำลังเข้าร่วมห้อง...</span>
	</div>
{:else if $drawingStore.error && !$drawingStore.room}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4">
		<p class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{$drawingStore.error}</p>
		<a href="/game/draw" class="text-sm font-medium text-primary-500 hover:underline"
			>กลับไปหน้าห้องวาดรูป</a
		>
	</div>
{:else}
	<!-- One screen tall (viewport minus the measured navbar height) so the tool bar never
	     scrolls out of view. The min-h is only a fallback for very short windows. -->
	<div
		class="flex min-h-[26rem] flex-col gap-2 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 p-2 select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] sm:p-3 [&_button:not(:disabled)]:cursor-pointer"
		style="height: calc(100dvh - {navHeight}px);"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-gray-400">รหัสห้อง</span>
				<button
					type="button"
					onclick={copyCode}
					title="แตะเพื่อคัดลอกรหัสห้อง"
					aria-label="คัดลอกรหัสห้อง {code}"
					class="group flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-0.5 text-base font-bold tracking-widest text-primary-500 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95"
				>
					{code}
					<svg
						class="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<rect x="9" y="9" width="11" height="11" rx="2" />
						<path d="M5 15V6a2 2 0 0 1 2-2h9" />
					</svg>
				</button>
				{#if $drawingStore.room}
					<span
						class="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-gray-500 shadow-sm"
					>
						{$drawingStore.room.ratio}
					</span>
					<button
						type="button"
						onclick={() => (showHelp = true)}
						title="วิธีเล่นและคำอธิบายปุ่มต่างๆ"
						aria-label="วิธีเล่นและคำอธิบายปุ่มต่างๆ"
						class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/80 text-xs font-bold text-primary-600 shadow-sm transition-all hover:bg-white hover:shadow active:scale-90"
					>
						?
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<div class="flex -space-x-2">
					{#each $drawingStore.players as player (player.id)}
						<span
							title={player.name}
							class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-sm {player.connected
								? 'bg-primary-500'
								: 'bg-gray-300'}"
						>
							{player.name.slice(0, 1).toUpperCase()}
						</span>
					{/each}
				</div>
				<span class="text-xs text-gray-400">{$drawingStore.players.length} คน</span>
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={handleUndo}
					disabled={!canUndo}
					title="ย้อนกลับเส้นล่าสุดของคุณ (Ctrl+Z)"
					class="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
				>
					↶ ย้อนกลับ
				</button>
				<button
					type="button"
					onclick={() => (showClearConfirm = true)}
					disabled={!!$drawingStore.clearVote || cooldownSeconds > 0}
					class="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
				>
					ล้างกระดาษ{cooldownSeconds > 0 && !$drawingStore.clearVote ? ` (${cooldownSeconds})` : ''}
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={saving}
					title="บันทึกรูปกระดาษเป็นไฟล์ PNG"
					class="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
				>
					💾 บันทึกรูป
				</button>
				<button
					type="button"
					onclick={() => (confirmLeave = true)}
					class="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
				>
					ออกจากห้อง
				</button>
			</div>
		</div>

		<div
			class="relative min-h-[8rem] min-w-0 flex-1 overflow-hidden rounded-2xl border border-primary-100 bg-primary-100/30 shadow-sm"
		>
			{#if $drawingStore.room}
				<DrawCanvas
					bind:this={canvasRef}
					{code}
					{selfId}
					ratio={$drawingStore.room.ratio}
					initialStrokes={$drawingStore.initialStrokes}
					{tool}
					{color}
					{strokeWidth}
					bind:canUndo
					syncVersion={$drawingStore.syncVersion}
					layers={visibleLayers}
					{refControllers}
					selectedId={selectedRefId}
					blockDraw={showRefPanel}
					onSelect={(id) => (selectedRefId = id)}
					onLock={(id) => {
						const l = layers.find((x) => x.id === id);
						if (l) toggleLock(l);
						selectedRefId = null;
					}}
				/>
			{/if}
		</div>

		<div
			class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-primary-100 bg-white/80 px-3 py-2 shadow-sm"
		>
			<div
				class="flex items-center gap-1 rounded-full bg-gray-100 p-1"
				role="radiogroup"
				aria-label="เครื่องมือ"
			>
				<button
					type="button"
					role="radio"
					aria-checked={tool === 'pen'}
					onclick={() => (tool = 'pen')}
					class="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 {tool ===
					'pen'
						? 'bg-primary-500 text-white shadow-sm hover:bg-primary-400'
						: 'text-gray-600 hover:bg-white hover:shadow-sm'}"
				>
					✏️ ปากกา
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={tool === 'eraser'}
					onclick={() => (tool = 'eraser')}
					class="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 {tool ===
					'eraser'
						? 'bg-primary-500 text-white shadow-sm hover:bg-primary-400'
						: 'text-gray-600 hover:bg-white hover:shadow-sm'}"
				>
					🧽 ยางลบ
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={tool === 'bucket'}
					onclick={() => (tool = 'bucket')}
					class="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 {tool ===
					'bucket'
						? 'bg-primary-500 text-white shadow-sm hover:bg-primary-400'
						: 'text-gray-600 hover:bg-white hover:shadow-sm'}"
				>
					🪣 ถังสี
				</button>
			</div>

			<div class="flex items-center gap-2 {tool === 'eraser' ? 'opacity-40' : ''}">
				{#each PEN_COLORS as c (c)}
					<button
						type="button"
						aria-label="เลือกสี"
						onclick={() => {
							color = c;
							if (tool === 'eraser') tool = 'pen';
						}}
						class="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 {color ===
							c && tool !== 'eraser'
							? 'scale-110 border-primary-500'
							: 'border-gray-200 hover:border-primary-300'}"
						style="background-color: {c};"
					></button>
				{/each}
				<input
					type="color"
					bind:value={color}
					oninput={() => {
						if (tool === 'eraser') tool = 'pen';
					}}
					class="h-7 w-7 cursor-pointer rounded-full border border-gray-200 transition-transform hover:scale-110 hover:border-primary-300"
				/>
			</div>

			<div class="flex items-center gap-2 {tool === 'bucket' ? 'opacity-40' : ''}">
				<span class="text-xs text-gray-400">{tool === 'eraser' ? 'ขนาดยางลบ' : 'ขนาดปากกา'}</span>
				<input
					type="range"
					min="2"
					max="24"
					bind:value={strokeWidth}
					disabled={tool === 'bucket'}
					class="w-28 cursor-pointer accent-primary-500 disabled:cursor-not-allowed"
				/>
				<span
					class="inline-block rounded-full bg-gray-700"
					style="width: {Math.min(strokeWidth, 20)}px; height: {Math.min(strokeWidth, 20)}px;"
				></span>
			</div>

			<!-- Trace-image layers -->
			<div class="relative" bind:this={refPanelWrap}>
				<button
					type="button"
					onclick={() => (showRefPanel = !showRefPanel)}
					aria-expanded={showRefPanel}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95 {showRefPanel
						? 'border-primary-500 bg-primary-100/60 text-primary-600'
						: 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100'}"
				>
					{#if uploading}
						<span
							class="h-3 w-3 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500"
							aria-label="กำลังอัปโหลดรูป"
						></span>
					{/if}
					อัปโหลดรูป
					{#if layers.length > 0}
						<span class="rounded-full bg-primary-500 px-1.5 text-[10px] leading-4 text-white"
							>{layers.length}</span
						>
					{/if}
				</button>

				{#if showRefPanel}
					<div
						transition:fly={{ y: 10, duration: motion(180) }}
						class="absolute right-0 bottom-full z-40 mb-2 flex max-h-[min(34rem,70vh)] w-[min(21rem,calc(100vw-1.5rem))] flex-col overflow-y-auto rounded-2xl border border-primary-100 bg-white p-4 shadow-xl"
					>
						<input
							bind:this={fileInput}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							multiple
							class="hidden"
							onchange={handleRefFiles}
						/>

						<div class="flex items-center justify-between gap-2">
							<!-- <p class="text-sm font-semibold text-gray-900">📷 อัปโหลดรูป</p> -->
							<div class="flex items-center gap-2">
								<p class="text-[11px] text-gray-400">
									รูปของฉัน {myLayers.length} · รูปทั้งหมดที่เห็น {layers.length}
								</p>
								{#if layers.length > 0}
									<button
										type="button"
										onclick={toggleAllHidden}
										title={anyVisible ? 'ซ่อนรูปทั้งหมด' : 'แสดงรูปทั้งหมด'}
										aria-label={anyVisible ? 'ซ่อนรูปทั้งหมด' : 'แสดงรูปทั้งหมด'}
										class="flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-gray-200 px-2 text-[11px] font-medium text-gray-600 transition-all hover:bg-gray-100 active:scale-95"
									>
										{anyVisible ? '😎 ซ่อนทั้งหมด' : '👁 แสดงทั้งหมด'}
									</button>
								{/if}
							</div>
						</div>

						<!-- Add images: they start private (only the uploader sees them) -->
						<div class="mt-3 rounded-xl border border-primary-100 bg-primary-50/50 p-2">
							<p class="text-[11px] leading-snug text-gray-500">
								🌐 รูปที่เพิ่มจะ<b>ทุกคนเห็น</b>ทันที กดตั้งเป็นส่วนตัวได้ถ้าอยากใช้ ลอกลาย คนเดียว
							</p>
							<button
								type="button"
								onclick={() => fileInput?.click()}
								disabled={uploading}
								class="mt-2 w-full rounded-lg bg-primary-500 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
							>
								{uploading ? 'กำลังอัปโหลด...' : '＋ เพิ่มรูป (เลือกได้หลายไฟล์)'}
							</button>
						</div>

						<!-- Select all / bulk public-private, for the images this player owns -->
						{#if myLayers.length > 0}
							<div class="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-2">
								<label
									class="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700"
								>
									<input
										type="checkbox"
										checked={allMineChecked}
										onchange={toggleAllMine}
										class="h-4 w-4 cursor-pointer accent-primary-500"
									/>
									เลือกทั้งหมด
									<span class="font-normal text-gray-400"
										>({checkedMine.length}/{myLayers.length})</span
									>
								</label>
								<div class="mt-2 grid grid-cols-2 gap-2">
									<button
										type="button"
										onclick={() =>
											setVisibility(
												checkedMine.map((l) => l.id),
												true
											)}
										disabled={checkedMine.length === 0}
										class="rounded-lg border border-primary-300 bg-white px-2 py-1.5 text-xs font-medium text-primary-600 transition-all hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
									>
										🌐 เปิดสาธารณะ
									</button>
									<button
										type="button"
										onclick={() =>
											setVisibility(
												checkedMine.map((l) => l.id),
												false
											)}
										disabled={checkedMine.length === 0}
										class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
									>
										😎 ตั้งเป็นส่วนตัว
									</button>
								</div>
							</div>
						{/if}

						<!-- Layer stack, top first (like Photoshop) -->
						<ul class="mt-3 flex flex-col gap-1" aria-label="รายการรูป">
							<li
								class="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-500"
							>
								<span class="w-6 text-center">✏️</span>
								<span class="flex-1"
									>เส้นวาด <span class="text-gray-400">· อยู่บนสุดเสมอ</span></span
								>
							</li>
							{#each pendingUploads as pend (pend.key)}
								<li
									class="flex items-center gap-2 rounded-lg border border-dashed border-primary-200 bg-primary-50/40 px-2 py-1"
									aria-busy="true"
								>
									<span
										class="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-gray-200 bg-white"
									>
										<img
											src={pend.preview}
											alt=""
											draggable="false"
											class="h-full w-full object-cover opacity-50"
										/>
										<span class="absolute inset-0 flex items-center justify-center bg-white/40">
											<span
												class="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500"
											></span>
										</span>
									</span>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-xs font-medium text-gray-700">{pend.name}</span
										>
										<span class="block text-[10px] text-primary-500">กำลังอัปโหลด...</span>
									</span>
								</li>
							{/each}
							{#each layerList as layer (layer.id)}
								{@const mine = canSetVisibility(layer)}
								{@const hidden = hiddenIds.includes(layer.id)}
								<li
									class="flex items-center gap-1 rounded-lg border px-1 py-1 transition-colors {selectedRefId ===
									layer.id
										? 'border-primary-300 bg-primary-100/50'
										: 'border-transparent hover:bg-gray-50'}"
								>
									<button
										type="button"
										onclick={() => toggleHidden(layer.id)}
										title={hidden ? 'แสดงรูปนี้' : 'ซ่อนรูปนี้ (เฉพาะหน้าจอคุณ)'}
										aria-label={hidden ? 'แสดงรูปนี้' : 'ซ่อนรูปนี้'}
										aria-pressed={!hidden}
										class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-gray-200 active:scale-90 {hidden
											? 'text-gray-300'
											: 'text-gray-700'}"
									>
										<svg
											viewBox="0 0 24 24"
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
											<circle cx="12" cy="12" r="3" />
											{#if hidden}<path d="M4 4l16 16" />{/if}
										</svg>
									</button>
									{#if mine}
										<input
											type="checkbox"
											checked={checkedIds.includes(layer.id)}
											onchange={() => toggleChecked(layer.id)}
											aria-label="เลือกรูป {layer.name}"
											class="ml-1 h-4 w-4 shrink-0 cursor-pointer accent-primary-500"
										/>
									{:else}
										<span class="ml-1 h-4 w-4 shrink-0" aria-hidden="true"></span>
									{/if}
									<button
										type="button"
										onclick={() => (selectedRefId = layer.id)}
										class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left"
									>
										<img
											src={layer.url}
											alt=""
											draggable="false"
											class="h-8 w-8 shrink-0 rounded border border-gray-200 bg-white object-cover {hidden
												? 'opacity-40'
												: ''}"
										/>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-xs font-medium text-gray-800"
												>{layer.name}</span
											>
											<span class="block truncate text-[10px] text-gray-400">
												{layer.isPublic ? '🌐 สาธารณะ' : '😎 เห็นคนเดียว'} · {layer.ownerId ===
												selfId
													? 'ของคุณ'
													: layer.ownerName
														? `โดย ${layer.ownerName}`
														: 'ไม่ทราบเจ้าของ'}{layer.locked ? ' · 🔒' : ''}
												{#if refControllers[layer.id] && refControllers[layer.id].playerId !== selfId}
													· {refControllers[layer.id].name} กำลังจัด
												{/if}
											</span>
										</span>
									</button>
									{#if mine}
										<button
											type="button"
											onclick={() => setVisibility([layer.id], !layer.isPublic)}
											title={layer.isPublic
												? 'ตอนนี้ทุกคนเห็น — กดเพื่อให้เห็นแค่คุณ'
												: 'ตอนนี้เห็นแค่คุณ — กดเพื่อเปิดให้ทุกคนเห็น'}
											aria-label={layer.isPublic ? 'ตั้งเป็นส่วนตัว' : 'เปิดสาธารณะ'}
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm transition-all hover:bg-gray-200 active:scale-90"
										>
											{layer.isPublic ? '🌐' : '😎'}
										</button>
									{/if}
									<span class="flex shrink-0 flex-col">
										<button
											type="button"
											onclick={() => moveLayer(layer, 'up')}
											disabled={!canMove(layer, 'up')}
											aria-label="เลื่อนรูปขึ้น"
											class="h-4 w-6 rounded text-[10px] leading-none text-gray-500 transition-all hover:bg-gray-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
										>
											▲
										</button>
										<button
											type="button"
											onclick={() => moveLayer(layer, 'down')}
											disabled={!canMove(layer, 'down')}
											aria-label="เลื่อนรูปลง"
											class="h-4 w-6 rounded text-[10px] leading-none text-gray-500 transition-all hover:bg-gray-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
										>
											▼
										</button>
									</span>
								</li>
							{/each}
						</ul>
						{#if layers.length === 0}
							<p
								class="mt-2 rounded-lg bg-gray-50 px-3 py-3 text-center text-[11px] leading-snug text-gray-400"
							>
								ยังไม่มีรูปต้นแบบ เพิ่มรูปแล้ววาดทับเพื่อ ลอกลาย ได้
							</p>
						{:else}
							<p class="mt-1.5 text-[10px] text-gray-400">
								คนอื่นไม่เห็นรูป "เห็นคนเดียว" ของคุณเลย · รูปสาธารณะทุกคนช่วยกันจัดได้
							</p>
						{/if}

						<!-- Selected layer -->
						{#if selected}
							<div class="mt-3 border-t border-gray-100 pt-3">
								<p class="truncate text-xs font-semibold text-gray-800">{selected.name}</p>

								{#if canSetVisibility(selected)}
									<div
										class="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1"
										role="radiogroup"
										aria-label="ใครเห็นรูปนี้"
									>
										<button
											type="button"
											role="radio"
											aria-checked={!selected.isPublic}
											onclick={() => setVisibility([selected.id], false)}
											class="rounded-md px-2 py-1 text-xs font-medium transition-all active:scale-95 {!selected.isPublic
												? 'bg-white text-primary-600 shadow-sm'
												: 'text-gray-500 hover:bg-white/60'}"
										>
											😎 เห็นคนเดียว
										</button>
										<button
											type="button"
											role="radio"
											aria-checked={selected.isPublic}
											onclick={() => setVisibility([selected.id], true)}
											class="rounded-md px-2 py-1 text-xs font-medium transition-all active:scale-95 {selected.isPublic
												? 'bg-white text-primary-600 shadow-sm'
												: 'text-gray-500 hover:bg-white/60'}"
										>
											🌐 สาธารณะ
										</button>
									</div>
								{:else}
									<p class="mt-1 text-[11px] text-gray-400">
										อัปโหลดโดย {selected.ownerName || 'ผู้เล่นอื่น'} — เฉพาะเจ้าของเปลี่ยนการมองเห็นได้
									</p>
								{/if}

								<label class="mt-2 block">
									<span class="flex items-center justify-between text-xs text-gray-500">
										ความทึบของรูป
										<span class="font-medium text-gray-700"
											>{Math.round(shownOpacity(selected) * 100)}%</span
										>
									</span>
									<input
										type="range"
										min="5"
										max="100"
										step="1"
										value={Math.round(shownOpacity(selected) * 100)}
										oninput={(e) => setOpacity(selected, Number(e.currentTarget.value) / 100)}
										onchange={commitOpacity}
										class="mt-1 w-full cursor-pointer accent-primary-500"
									/>
								</label>

								<label class="mt-2 block">
									<span class="flex items-center justify-between text-xs text-gray-500">
										หมุนรูป
										<span class="font-medium text-gray-700"
											>{Math.round(shownRotation(selected))}°</span
										>
									</span>
									<input
										type="range"
										min="-180"
										max="180"
										step="1"
										value={Math.round(shownRotation(selected))}
										disabled={selected.locked || selectedBusy}
										oninput={(e) => setRotation(selected, Number(e.currentTarget.value))}
										onchange={commitRotation}
										class="mt-1 w-full cursor-pointer accent-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
									/>
								</label>
								<div class="mt-1 grid grid-cols-3 gap-1">
									<button
										type="button"
										onclick={() => rotateBy(selected, -90)}
										disabled={selected.locked || selectedBusy}
										class="rounded-lg border border-gray-200 py-1 text-[11px] font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
									>
										↺ −90°
									</button>
									<button
										type="button"
										onclick={() => rotateBy(selected, null)}
										disabled={selected.locked || selectedBusy || selected.rotation === 0}
										class="rounded-lg border border-gray-200 py-1 text-[11px] font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
									>
										รีเซ็ต 0°
									</button>
									<button
										type="button"
										onclick={() => rotateBy(selected, 90)}
										disabled={selected.locked || selectedBusy}
										class="rounded-lg border border-gray-200 py-1 text-[11px] font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
									>
										↻ +90°
									</button>
								</div>

								<button
									type="button"
									onclick={() => toggleLock(selected)}
									class="mt-2 w-full rounded-xl border px-2 py-2 text-xs font-medium transition-all active:scale-95 {selected.locked
										? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
										: 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'}"
								>
									{selected.locked ? '🔓 ปลดล็อก' : '🔒 ล็อก (ลอกลาย)'}
								</button>
								<button
									type="button"
									onclick={() => (deleteTarget = selected)}
									disabled={selected.locked || selectedBusy}
									class="mt-2 w-full rounded-xl border border-red-200 py-2 text-xs font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
								>
									🗑 ลบรูปนี้
								</button>

								<p class="mt-2 text-[11px] leading-snug text-gray-400">
									{#if selected.locked}
										ล็อกอยู่: วาดทับได้ แต่ขยับ/ย่อขยาย/หมุน/ลบไม่ได้ (ปรับความทึบได้)
									{:else if selectedBusy}
										{refControllers[selected.id]?.name ?? 'เพื่อน'} กำลังจัดรูปนี้อยู่ รอสักครู่
									{:else}
										ลากรูปบนกระดาษได้เลย ลากมุมเพื่อย่อขยาย ลากปุ่ม ↻ เพื่อหมุน แล้วกด "ล็อก"
										เพื่อเริ่ม ลอกลาย (รูปที่ยังไม่ล็อกจะบังการวาด)
									{/if}
								</p>
							</div>
						{:else if layers.length > 0}
							<p class="mt-3 border-t border-gray-100 pt-3 text-center text-[11px] text-gray-400">
								เลือกรูปเพื่อปรับความทึบ หมุน หรือล็อก
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
