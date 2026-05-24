<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import GameService from '$lib/data/services/game';
	import {
		gamePlayStore,
		loadGame,
		resetGamePlayStore,
		revealTile,
		undoReveal,
		setGuess,
		submitGuess,
		nextImage
	} from '$lib/data/stores/game-play';

	const gameId = $derived(Number(page.params.id));
	let finishing = $state(false);

	$effect(() => {
		const id = gameId;
		loadGame(id);
		return () => resetGamePlayStore();
	});

	async function handleFinish() {
		if (finishing) return;
		finishing = true;
		try {
			await GameService.incrementPlayCount(gameId);
		} finally {
			finishing = false;
			goto(`/game/detail/${gameId}`);
		}
	}

	// Keyboard shortcut: Enter to submit
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submitGuess();
	}

	// Track container size and natural image dimensions to align tile grid
	let containerW = $state(0);
	let containerH = $state(0);
	let imgNatW = $state(0);
	let imgNatH = $state(0);

	// Isolate imageIdx so the reset effect only fires when the image actually changes
	const currentImageIdx = $derived($gamePlayStore.imageIdx);

	// Reset natural dimensions when the displayed image changes
	$effect(() => {
		void currentImageIdx;
		imgNatW = 0;
		imgNatH = 0;
	});

	function onImgLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		imgNatW = img.naturalWidth;
		imgNatH = img.naturalHeight;
	}

	// Compute the pixel rect of the rendered image inside the object-contain container
	const imageAreaStyle = $derived.by(() => {
		if (!imgNatW || !imgNatH || !containerW || !containerH) {
			return 'top:0;left:0;right:0;bottom:0;';
		}
		const cRatio = containerW / containerH;
		const iRatio = imgNatW / imgNatH;
		let w: number, h: number, x: number, y: number;
		if (iRatio > cRatio) {
			// image wider than container ratio → constrained by width
			w = containerW;
			h = containerW / iRatio;
			x = 0;
			y = (containerH - h) / 2;
		} else {
			// image taller than container ratio → constrained by height
			h = containerH;
			w = containerH * iRatio;
			x = (containerW - w) / 2;
			y = 0;
		}
		return `top:${y}px;left:${x}px;width:${w}px;height:${h}px;`;
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if $gamePlayStore.loading}
	<!-- ── Loading ─────────────────────────────────────────────────────────── -->
	<div class="flex min-h-screen items-center justify-center">
		<div class="flex flex-col items-center gap-3 text-gray-400">
			<svg
				class="h-8 w-8 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm">กำลังโหลดเกม...</span>
		</div>
	</div>
{:else if $gamePlayStore.error}
	<!-- ── Error ──────────────────────────────────────────────────────────── -->
	<div class="flex min-h-screen flex-col items-center justify-center gap-4">
		<span class="text-5xl">😕</span>
		<p class="text-base font-medium">{$gamePlayStore.error}</p>
		<button
			onclick={() => history.back()}
			class="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium hover:bg-primary-400"
		>
			ย้อนกลับ
		</button>
	</div>
{:else if $gamePlayStore.finished}
	<!-- ── Finished screen ───────────────────────────────────────────────── -->
	<div class="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
		<div class="flex flex-col items-center gap-2">
			<span class="text-6xl">🎉</span>
			<h1 class="text-3xl font-bold">จบเกมแล้ว!</h1>
			<p class="text-gray-400">{$gamePlayStore.game?.name}</p>
		</div>

		<div class="flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-12 py-6">
			<span class="text-sm text-gray-400">คะแนนรวม</span>
			<span class="text-5xl font-bold text-primary-400">{$gamePlayStore.score}</span>
			<span class="text-xs text-gray-500">จาก {$gamePlayStore.images.length} รูป</span>
		</div>

		<div class="flex gap-3">
			<button
				onclick={handleFinish}
				disabled={finishing}
				class="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium transition-colors hover:bg-white/10"
			>
				{finishing ? 'กำลังบันทึก...' : 'เสร็จสิ้น'}
			</button>
			<!-- <button
				onclick={() => loadGame(gameId)}
				class="rounded-xl bg-primary-500 px-6 py-3 text-sm font-medium  transition-colors hover:bg-primary-400"
			>
				เล่นอีกครั้ง
			</button> -->
		</div>
	</div>
{:else}
	{@const image = $gamePlayStore.images[$gamePlayStore.imageIdx]}
	{@const total = image.gridSize * image.gridSize}
	{@const revealed = $gamePlayStore.revealedTiles}
	{@const status = $gamePlayStore.status}
	{@const maxReveal = image.maxReveal}

	<div class="flex h-screen flex-col">
		<!-- ── Top bar ──────────────────────────────────────────────────────── -->
		<div class="flex items-center justify-between px-4 py-3">
			<button
				onclick={() => goto(`/game/detail/${gameId}`)}
				class="flex items-center gap-1.5 text-sm text-gray-400 transition-colors"
				aria-label="ออกจากเกม"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
				ออก
			</button>

			<div class="flex items-center gap-4">
				<!-- Progress -->
				<span class="text-sm text-gray-400">
					{$gamePlayStore.imageIdx + 1} / {$gamePlayStore.images.length}
				</span>
				<!-- Score -->
				<span class="text-sm font-semibold text-primary-400">
					{$gamePlayStore.score} คะแนน
				</span>
			</div>
		</div>

		<!-- ── Progress bar ─────────────────────────────────────────────────── -->
		<div class="h-1 w-full bg-white/10">
			<div
				class="h-full bg-primary-500 transition-all duration-300"
				style="width: {($gamePlayStore.imageIdx / $gamePlayStore.images.length) * 100}%"
			></div>
		</div>

		<!-- ── Main content ─────────────────────────────────────────────────── -->
		<div
			class="flex min-h-0 flex-1 flex-col items-center gap-4 px-4 py-4 sm:px-8 md:px-16 lg:px-32 xl:px-48 2xl:px-64"
		>
			<!-- Timer + tiles revealed counter -->
			<div class="flex w-full shrink-0 items-center justify-between text-sm">
				{#if $gamePlayStore.timeLeft !== null}
					<div
						class="flex items-center gap-1.5 font-mono font-semibold tabular-nums {$gamePlayStore.timeLeft <=
						5
							? 'text-error'
							: 'text-gray-300'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
						</svg>
						{$gamePlayStore.timeLeft}s
					</div>
				{:else}
					<span></span>
				{/if}

				<span class="text-gray-500">
					เปิดแล้ว {revealed.length}{maxReveal !== null ? ` / ${maxReveal}` : ''} ช่อง
				</span>
			</div>
			<!-- <pre>{JSON.stringify(containerW, null, 2)}</pre>
			<pre>{JSON.stringify(containerH, null, 2)}</pre>
			<pre>{JSON.stringify(imgNatW, null, 2)}</pre>
			<pre>{JSON.stringify(imgNatH, null, 2)}</pre> -->

			<!-- ── Tile grid ─────────────────────────────────────────────────── -->
			<!-- พื้นหลัง -->
			<div
				class="relative min-h-0 w-full flex-1 overflow-hidden bg-transparent shadow-lg"
				bind:clientWidth={containerW}
				bind:clientHeight={containerH}
			>
				<!-- Image fills container, object-contain shows full image without cropping -->
				<img
					src={image.imageUrl}
					alt="รูปที่ {$gamePlayStore.imageIdx + 1}"
					class="absolute inset-0 h-full w-full object-contain"
					onload={onImgLoad}
				/>

				<!-- Tile overlay grid — covers only the rendered image area -->
				<div
					class="absolute grid"
					style="{imageAreaStyle} grid-template-columns: repeat({image.gridSize}, 1fr); grid-template-rows: repeat({image.gridSize}, 1fr);"
				>
					{#each Array(total) as _, i (i)}
						{@const isRevealed = revealed.includes(i)}
						{@const isInteractive =
							status === 'playing' &&
							!isRevealed &&
							(maxReveal === null || revealed.length < maxReveal)}
						<button
							type="button"
							onclick={() => revealTile(i)}
							disabled={!isInteractive}
							class="flex items-center justify-center border border-gray-800/60 transition-all duration-200 {isRevealed
								? 'bg-transparent'
								: 'bg-gray-950 hover:bg-gray-800'} {isInteractive
								? 'cursor-pointer'
								: 'cursor-default'}"
							aria-label="เปิดช่อง {i + 1}"
						>
							{#if !isRevealed}
								<span class="text-xs font-medium text-gray-400/60 select-none">{i + 1}</span>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Status overlay: correct / timeout / revealed -->
				{#if status === 'correct'}
					<div
						class="absolute flex flex-col items-center justify-center gap-2 rounded-2xl bg-success/20 backdrop-blur-[2px]"
						style={imageAreaStyle}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#6BCB77"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" /><polyline points="9 11 12 14 22 4" />
						</svg>
						<span class="text-lg font-bold text-success">ถูกต้อง!</span>
					</div>
				{:else if status === 'timeout'}
					<div
						class="absolute flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/60 backdrop-blur-[2px]"
						style={imageAreaStyle}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#FF6B6B"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
						</svg>
						<span class="text-lg font-bold text-error">หมดเวลา</span>
						<span class="text-sm text-gray-300"
							>คำตอบ: <span class="font-semibold">{image.answer}</span></span
						>
					</div>
				{:else if status === 'revealed'}
					<div
						class="absolute flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/50 backdrop-blur-[2px]"
						style={imageAreaStyle}
					>
						<span class="text-base text-gray-300"
							>คำตอบ: <span class="font-bold">{image.answer}</span></span
						>
					</div>
				{/if}
			</div>

			<!-- ── Hint ────────────────────────────────────────────────────── -->
			{#if image.hint && status === 'playing'}
				<p class="shrink-0 text-sm text-gray-400">💡 {image.hint}</p>
			{/if}

			<!-- ── Answer input ─────────────────────────────────────────────── -->
			{#if status === 'playing' || status === 'revealed'}
				<div class="flex w-full shrink-0 flex-col gap-2">
					<div
						class="flex overflow-hidden rounded-xl border transition-colors {$gamePlayStore.wrongShake
							? 'animate-shake border-error'
							: ' border-gray-700 focus-within:border-primary-400'}"
					>
						<input
							type="text"
							value={$gamePlayStore.guess}
							oninput={(e) => setGuess((e.target as HTMLInputElement).value)}
							placeholder="พิมพ์คำตอบที่นี่..."
							autocomplete="off"
							autocorrect="off"
							spellcheck={false}
							class="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-600"
						/>
						<button
							type="button"
							onclick={submitGuess}
							class="bg-primary-500 px-5 py-3 text-sm font-semibold transition-colors hover:bg-primary-400 active:bg-primary-600"
						>
							ส่ง
						</button>
					</div>
					<p class="text-center text-xs text-gray-600">Enter เพื่อส่งคำตอบ</p>
				</div>
			{/if}

			<!-- ── Action buttons ────────────────────────────────────────────── -->
			<div class="flex w-full shrink-0 gap-3">
				{#if status === 'playing'}
					<button
						type="button"
						onclick={undoReveal}
						disabled={$gamePlayStore.undoStack.length === 0}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-30"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
						</svg>
						เลิกทำ
					</button>
				{/if}

				{#if status !== 'playing'}
					<button
						type="button"
						onclick={nextImage}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-3 text-sm font-semibold transition-colors hover:bg-primary-400 active:bg-primary-600"
					>
						{$gamePlayStore.imageIdx + 1 >= $gamePlayStore.images.length ? 'ดูผลลัพธ์' : 'รูปถัดไป'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-6px);
		}
		40% {
			transform: translateX(6px);
		}
		60% {
			transform: translateX(-4px);
		}
		80% {
			transform: translateX(4px);
		}
	}
	.animate-shake {
		animation: shake 0.5s ease-in-out;
	}
</style>
