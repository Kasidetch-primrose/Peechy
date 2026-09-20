<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import { connect, joinRoom, leaveRoom, drawingStore } from '$lib/data/stores/drawing';
	import DrawingService from '$lib/data/services/multiplayer/drawing';
	import DrawCanvas from '$lib/components/DrawCanvas.svelte';
	import type { DrawTool } from '$lib/data/interface/drawing';

	const code = $derived(page.params.code ?? '');
	const selfId = $derived(String($authUserStore.user?.id ?? ''));

	const PEN_COLORS = ['#1f2937', '#ff9b73', '#ffaab0', '#ffe4a0', '#a8edcc', '#a8d8ff', '#d4b8ff', '#ffffff'];
	let tool = $state<DrawTool>('pen');
	let color = $state(PEN_COLORS[0]);
	let strokeWidth = $state(6);

	// Same guard pattern as the guess-game lobby: only join once per code,
	// and don't read $drawingStore here or joinRoom()'s own writes would
	// re-trigger this effect and open a second socket connection.
	let joinedCode = $state('');

	$effect(() => {
		if (!$authUserStore.user) {
			goto('/auth/login');
			return;
		}
		if (joinedCode === code) return;
		joinedCode = code;

		const user = $authUserStore.user;
		connect(String(user.id), user.username);
		joinRoom(code);
	});

	function handleLeave() {
		leaveRoom();
		goto('/game/draw');
	}

	function handleClear() {
		if (confirm('ล้างกระดาษทั้งหมด? ทุกคนในห้องจะเห็นกระดาษว่างเปล่า')) {
			DrawingService.clear(code);
		}
	}

	function copyCode() {
		navigator.clipboard?.writeText(code);
	}
</script>

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
	<div class="flex min-h-screen flex-col gap-4 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 p-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-gray-400">รหัสห้อง</span>
				<button
					type="button"
					onclick={copyCode}
					title="คัดลอกรหัสห้อง"
					class="rounded-full bg-white/80 px-4 py-1.5 text-lg font-bold tracking-widest text-primary-500 shadow-sm"
				>
					{code}
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
					onclick={handleClear}
					class="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
				>
					ล้างกระดาษ
				</button>
				<button
					type="button"
					onclick={handleLeave}
					class="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
				>
					ออกจากห้อง
				</button>
			</div>
		</div>

		<div class="relative min-h-[16rem] min-w-0 flex-1 overflow-hidden rounded-2xl border border-primary-100 bg-primary-100/30 shadow-sm">
			{#if $drawingStore.room}
				<DrawCanvas
					{code}
					{selfId}
					ratio={$drawingStore.room.ratio}
					initialStrokes={$drawingStore.initialStrokes}
					{tool}
					{color}
					{strokeWidth}
				/>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-primary-100 bg-white/80 px-4 py-3 shadow-sm">
			<div class="flex items-center gap-1 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="เครื่องมือ">
				<button
					type="button"
					role="radio"
					aria-checked={tool === 'pen'}
					onclick={() => (tool = 'pen')}
					class="rounded-full px-3 py-1 text-xs font-medium transition-colors {tool === 'pen'
						? 'bg-primary-500 text-white shadow-sm'
						: 'text-gray-600 hover:bg-white'}"
				>
					✏️ ปากกา
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={tool === 'eraser'}
					onclick={() => (tool = 'eraser')}
					class="rounded-full px-3 py-1 text-xs font-medium transition-colors {tool === 'eraser'
						? 'bg-primary-500 text-white shadow-sm'
						: 'text-gray-600 hover:bg-white'}"
				>
					🧽 ยางลบ
				</button>
			</div>

			<div class="flex items-center gap-2 {tool === 'eraser' ? 'opacity-40' : ''}">
				{#each PEN_COLORS as c (c)}
					<button
						type="button"
						aria-label="เลือกสี"
						onclick={() => {
							color = c;
							tool = 'pen';
						}}
						class="h-7 w-7 rounded-full border-2 transition-transform {color === c && tool === 'pen'
							? 'scale-110 border-primary-500'
							: 'border-gray-200'}"
						style="background-color: {c};"
					></button>
				{/each}
				<input
					type="color"
					bind:value={color}
					oninput={() => (tool = 'pen')}
					class="h-7 w-7 cursor-pointer rounded-full border border-gray-200"
				/>
			</div>

			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-400">{tool === 'eraser' ? 'ขนาดยางลบ' : 'ขนาดปากกา'}</span>
				<input type="range" min="2" max="24" bind:value={strokeWidth} class="w-28 accent-primary-500" />
				<span
					class="inline-block rounded-full bg-gray-700"
					style="width: {Math.min(strokeWidth, 20)}px; height: {Math.min(strokeWidth, 20)}px;"
				></span>
			</div>
		</div>
	</div>
{/if}
