<script lang="ts">
	import type { IAvatarCrop } from '$lib/data/interface/user';
	import Avatar from '$lib/components/Avatar.svelte';
	import {
		AVATAR_MAX_ZOOM,
		AVATAR_MIN_ZOOM,
		avatarImageSize,
		avatarImageStyle,
		clampAvatarCrop
	} from '$lib/utils/avatar';

	// Facebook-style picker: the picture sits behind a fixed circle; drag to move it,
	// scroll / pinch / slider to zoom. Everything outside the circle is dimmed.
	let {
		src,
		initialCrop = null,
		title = 'ปรับรูปโปรไฟล์',
		saving = false,
		error = '',
		onSave,
		onCancel,
		onPickNew
	}: {
		src: string;
		initialCrop?: IAvatarCrop | null;
		title?: string;
		saving?: boolean;
		error?: string;
		onSave: (crop: IAvatarCrop, img: HTMLImageElement) => void;
		onCancel: () => void;
		onPickNew?: () => void;
	} = $props();

	let img = $state<HTMLImageElement>();
	let frame = $state<HTMLDivElement>();
	let circleSize = $state(0);
	let crop = $state<IAvatarCrop | null>(null);
	let loadError = $state(false);
	let dragging = $state(false);

	// New picture → wait for it to load before showing the circle.
	$effect(() => {
		void src;
		crop = null;
		loadError = false;
		// A cached picture may have finished loading before the reset above.
		if (img?.complete && img.naturalWidth) handleLoad();
	});

	function handleLoad() {
		if (!img) return;
		const aspect = img.naturalWidth / img.naturalHeight || 1;
		crop = clampAvatarCrop(
			initialCrop ? { ...initialCrop, aspect } : { x: 0.5, y: 0.5, zoom: 1, aspect }
		);
	}

	function setCrop(next: Partial<IAvatarCrop>) {
		if (!crop) return;
		crop = clampAvatarCrop({ ...crop, ...next });
	}

	/** Moves the picture by a pixel delta (picture follows the pointer, so the centre moves the other way). */
	function pan(dx: number, dy: number) {
		if (!crop || circleSize <= 0) return;
		const { w, h } = avatarImageSize(crop);
		setCrop({ x: crop.x - dx / (w * circleSize), y: crop.y - dy / (h * circleSize) });
	}

	// ── Pointer drag + two-finger pinch ─────────────────────────────────────────
	const pointers = new Map<number, { x: number; y: number }>();
	let pinchDistance = 0;

	const distance = () => {
		const [a, b] = [...pointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y);
	};

	function handlePointerDown(e: PointerEvent) {
		if (!crop || saving) return;
		frame?.setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 2) pinchDistance = distance();
		dragging = true;
	}

	function handlePointerMove(e: PointerEvent) {
		const prev = pointers.get(e.pointerId);
		if (!prev || !crop) return;
		const dx = e.clientX - prev.x;
		const dy = e.clientY - prev.y;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (pointers.size === 1) {
			pan(dx, dy);
		} else if (pointers.size === 2) {
			const d = distance();
			if (pinchDistance > 0) setCrop({ zoom: crop.zoom * (d / pinchDistance) });
			pinchDistance = d;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		pointers.delete(e.pointerId);
		pinchDistance = pointers.size === 2 ? distance() : 0;
		dragging = pointers.size > 0;
	}

	// Wheel zoom needs a non-passive listener so the page doesn't scroll underneath.
	$effect(() => {
		if (!frame) return;
		const onWheel = (e: WheelEvent) => {
			if (!crop || saving) return;
			e.preventDefault();
			setCrop({ zoom: crop.zoom * Math.exp(-e.deltaY * 0.0015) });
		};
		frame.addEventListener('wheel', onWheel, { passive: false });
		return () => frame?.removeEventListener('wheel', onWheel);
	});

	function handleFrameKey(e: KeyboardEvent) {
		if (!crop) return;
		const step = circleSize * 0.03;
		const actions: Record<string, () => void> = {
			ArrowLeft: () => pan(step, 0),
			ArrowRight: () => pan(-step, 0),
			ArrowUp: () => pan(0, step),
			ArrowDown: () => pan(0, -step),
			'+': () => setCrop({ zoom: crop!.zoom * 1.1 }),
			'=': () => setCrop({ zoom: crop!.zoom * 1.1 }),
			'-': () => setCrop({ zoom: crop!.zoom / 1.1 })
		};
		const action = actions[e.key];
		if (action) {
			e.preventDefault();
			action();
		}
	}

	function handleWindowKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && !saving) onCancel();
	}

	function save() {
		if (crop && img && !saving) onSave(crop, img);
	}
</script>

<svelte:window onkeydown={handleWindowKey} />

<div
	class="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-labelledby="avatar-crop-title"
>
	<div class="w-full max-w-[26rem] rounded-2xl bg-white p-5 shadow-xl sm:p-6">
		<div class="flex items-center justify-between gap-3">
			<h3 id="avatar-crop-title" class="text-base font-semibold text-gray-900">{title}</h3>
			<button
				type="button"
				onclick={onCancel}
				disabled={saving}
				aria-label="ปิด"
				class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
			>
				<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Crop frame: the circle box sits at 10% inset; the picture is laid out relative to it -->
		<div
			bind:this={frame}
			role="slider"
			tabindex="0"
			aria-label="ตำแหน่งรูปในวงกลม (ใช้ลูกศรเพื่อเลื่อน, + / - เพื่อซูม)"
			aria-valuemin={AVATAR_MIN_ZOOM}
			aria-valuemax={AVATAR_MAX_ZOOM}
			aria-valuenow={crop?.zoom ?? 1}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			onkeydown={handleFrameKey}
			class="relative mt-4 aspect-square w-full touch-none overflow-hidden rounded-2xl bg-gray-900 select-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none {crop
				? dragging
					? 'cursor-grabbing'
					: 'cursor-grab'
				: ''}"
		>
			<div class="absolute inset-[10%]" bind:clientWidth={circleSize}>
				<img
					bind:this={img}
					{src}
					alt="รูปที่เลือก"
					draggable="false"
					onload={handleLoad}
					onerror={() => (loadError = true)}
					class="pointer-events-none select-none {crop ? '' : 'invisible'}"
					style={crop ? avatarImageStyle(crop) : 'position:absolute;width:1px;height:1px;'}
				/>
				<!-- Dim everything outside the circle -->
				<div
					class="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(20,12,10,0.55)] ring-2 ring-white/90"
				></div>
			</div>

			{#if !crop}
				<div class="absolute inset-0 flex items-center justify-center text-sm text-white/80">
					{loadError ? 'โหลดรูปไม่สำเร็จ' : 'กำลังโหลดรูป…'}
				</div>
			{/if}
		</div>

		<p class="mt-2 text-center text-xs text-gray-400">ลากรูปเพื่อเลือกส่วนที่จะแสดงในวงกลม</p>

		<!-- Zoom -->
		<div class="mt-3 flex items-center gap-3">
			<button
				type="button"
				onclick={() => crop && setCrop({ zoom: crop.zoom / 1.2 })}
				disabled={!crop || saving}
				aria-label="ซูมออก"
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40"
			>
				<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
			</button>
			<input
				type="range"
				min={AVATAR_MIN_ZOOM}
				max={AVATAR_MAX_ZOOM}
				step="0.01"
				value={crop?.zoom ?? 1}
				oninput={(e) => setCrop({ zoom: Number(e.currentTarget.value) })}
				disabled={!crop || saving}
				aria-label="ซูม"
				class="h-2 flex-1 cursor-pointer accent-primary-500 disabled:cursor-not-allowed"
			/>
			<button
				type="button"
				onclick={() => crop && setCrop({ zoom: crop.zoom * 1.2 })}
				disabled={!crop || saving}
				aria-label="ซูมเข้า"
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40"
			>
				<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
			</button>
		</div>

		<!-- Live preview at the sizes it's shown around the site -->
		{#if crop}
			<div class="mt-4 flex items-center justify-center gap-4 rounded-xl bg-primary-50/70 py-3">
				<span class="text-xs text-gray-500">ตัวอย่าง</span>
				<Avatar url={src} {crop} class="h-14 w-14" />
				<Avatar url={src} {crop} class="h-8 w-8" />
				<Avatar url={src} {crop} class="h-5 w-5" />
			</div>
		{/if}

		{#if error}
			<p class="mt-3 text-center text-sm text-red-500">{error}</p>
		{/if}

		<div class="mt-5 flex flex-wrap gap-3">
			{#if onPickNew}
				<button
					type="button"
					onclick={onPickNew}
					disabled={saving}
					class="w-full rounded-xl border border-primary-200 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50"
				>
					เลือกรูปอื่น
				</button>
			{/if}
			<button
				type="button"
				onclick={onCancel}
				disabled={saving}
				class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
			>
				ยกเลิก
			</button>
			<button
				type="button"
				onclick={save}
				disabled={!crop || saving}
				class="flex-1 rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{saving ? 'กำลังบันทึก…' : 'บันทึก'}
			</button>
		</div>
	</div>
</div>
