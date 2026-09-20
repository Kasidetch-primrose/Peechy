<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { fade, fly, scale } from 'svelte/transition';
	import { copyText } from '$lib/utils/clipboard';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import { connect, joinRoom, leaveRoom, drawingStore } from '$lib/data/stores/drawing';
	import DrawingService from '$lib/data/services/multiplayer/drawing';
	import DrawCanvas from '$lib/components/DrawCanvas.svelte';
	import GuestNameModal from '$lib/components/GuestNameModal.svelte';
	import ClearVotePrompt from '$lib/components/ClearVotePrompt.svelte';
	import { getGuestId, saveGuestName } from '$lib/utils/guest-identity';
	import type { DrawTool } from '$lib/data/interface/drawing';

	const code = $derived(page.params.code ?? '');
	const selfId = $derived($drawingStore.selfId);
	let showGuestModal = $state(false);
	let canUndo = $state(false);
	let showClearConfirm = $state(false);

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
			const el = e.target instanceof Node ? (e.target.parentElement ?? (e.target as Element)) : null;
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
		const observer = new ResizeObserver(() => (navHeight = Math.round(header.getBoundingClientRect().height)));
		observer.observe(header);
		return () => observer.disconnect();
	});

	let now = $state(Date.now());
	$effect(() => {
		const ticker = setInterval(() => (now = Date.now()), 500);
		return () => clearInterval(ticker);
	});
	const cooldownSeconds = $derived(Math.max(0, Math.ceil(($drawingStore.clearCooldownUntil - now) / 1000)));

	const reduceMotion =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const motion = (ms: number) => (reduceMotion ? 0 : ms);

	const PEN_COLORS = ['#1f2937', '#ff9b73', '#ffaab0', '#ffe4a0', '#a8edcc', '#a8d8ff', '#d4b8ff', '#ffffff'];
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
		showToast((await copyText(code)) ? `📋 คัดลอกรหัสห้องแล้ว (${code})` : `คัดลอกไม่สำเร็จ — รหัสห้องคือ ${code}`);
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

<svelte:window onkeydown={handleKeydown} />

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
				ระบบจะให้ทุกคนในห้องโหวต ต้องเห็นด้วยครบทุกคนจึงจะล้าง ถ้ามีคนไม่เห็นด้วยหรือหมดเวลา 30 วินาที กระดาษจะไม่ถูกล้าง
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
		<a href="/game/draw" class="text-sm font-medium text-primary-500 hover:underline">กลับไปหน้าห้องวาดรูป</a>
	</div>
{:else}
	<!-- One screen tall (viewport minus the measured navbar height) so the tool bar never
	     scrolls out of view. The min-h is only a fallback for very short windows. -->
	<div
		class="flex min-h-[26rem] flex-col gap-2 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 p-2 select-none sm:p-3 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [&_button:not(:disabled)]:cursor-pointer"
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
					<span class="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
						{$drawingStore.room.ratio}
					</span>
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
					onclick={handleLeave}
					class="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
				>
					ออกจากห้อง
				</button>
			</div>
		</div>

		<div class="relative min-h-[8rem] min-w-0 flex-1 overflow-hidden rounded-2xl border border-primary-100 bg-primary-100/30 shadow-sm">
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
				/>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-primary-100 bg-white/80 px-3 py-2 shadow-sm">
			<div class="flex items-center gap-1 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="เครื่องมือ">
				<button
					type="button"
					role="radio"
					aria-checked={tool === 'pen'}
					onclick={() => (tool = 'pen')}
					class="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 {tool === 'pen'
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
					class="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 {tool === 'eraser'
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
					class="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 {tool === 'bucket'
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
						class="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 {color === c && tool !== 'eraser'
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
		</div>
	</div>
{/if}
