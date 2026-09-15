<script lang="ts">
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import {
		multiplayerStore,
		connect,
		revealTile,
		submitGuess,
		useHint,
		leaveRoom
	} from '$lib/data/stores/multiplayer';

	const code = $derived(page.params.code ?? '');
	const selfId = $derived($multiplayerStore.selfId);
	const isMyTurn = $derived($multiplayerStore.currentTurnPlayerId === selfId);

	let guessInput = $state('');
	let timeLeft = $state<number | null>(null);
	let timerHandle: ReturnType<typeof setInterval> | null = null;
	let breakLeft = $state<number | null>(null);
	let breakTimerHandle: ReturnType<typeof setInterval> | null = null;

	let hintOpen = $state(false);
	let hintContainer: HTMLDivElement | undefined;

	$effect(() => {
		if (!hintOpen) return;
		const handle = (e: PointerEvent) => {
			if (!hintContainer?.contains(e.target as Node)) hintOpen = false;
		};
		document.addEventListener('pointerdown', handle, true);
		return () => document.removeEventListener('pointerdown', handle, true);
	});

	function handleHintToggle() {
		hintOpen = !hintOpen;
	}

	function handleRevealHint() {
		if (!isMyTurn) return;
		useHint();
	}

	const hintPenalty = $derived.by(() => {
		const image = $multiplayerStore.currentImage;
		if (!image) return 0;
		return Math.round(100 / (image.gridSize * image.gridSize));
	});

	// Track container size and natural image dimensions to align the tile
	// grid to the actually-rendered (object-contain) image rect, same as singleplayer.
	let containerW = $state(0);
	let containerH = $state(0);
	let imgNatW = $state(0);
	let imgNatH = $state(0);

	const currentImageId = $derived($multiplayerStore.currentImage?.id);

	$effect(() => {
		void currentImageId;
		imgNatW = 0;
		imgNatH = 0;
	});

	function onImgLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		imgNatW = img.naturalWidth;
		imgNatH = img.naturalHeight;
	}

	const imageAreaStyle = $derived.by(() => {
		if (!imgNatW || !imgNatH || !containerW || !containerH) {
			return 'top:0;left:0;right:0;bottom:0;';
		}
		const cRatio = containerW / containerH;
		const iRatio = imgNatW / imgNatH;
		let w: number, h: number, x: number, y: number;
		if (iRatio > cRatio) {
			w = containerW;
			h = containerW / iRatio;
			x = 0;
			y = (containerH - h) / 2;
		} else {
			h = containerH;
			w = containerH * iRatio;
			x = (containerW - w) / 2;
			y = 0;
		}
		return `top:${y}px;left:${x}px;width:${w}px;height:${h}px;`;
	});

	$effect(() => {
		// Already connected (the normal path — arrived here from the lobby).
		if (get(multiplayerStore).selfId) return;

		const user = $authUserStore.user;
		if (user) {
			connect(String(user.id), user.username);
			return;
		}

		// Guest with no active session (e.g. hard refresh mid-game) — the
		// lobby handles reconnecting/prompting, and will bounce straight
		// back here once the room's status comes back as "playing".
		goto(`/game/multiplayer/lobby/${code}`);
	});

	// Drive the countdown locally off the server-authoritative startedAt.
	$effect(() => {
		const startedAt = $multiplayerStore.turnStartedAt;
		const duration = $multiplayerStore.turnDurationSec;
		if (timerHandle) clearInterval(timerHandle);
		if (startedAt === null) {
			timeLeft = null;
			return;
		}
		const update = () => {
			const elapsed = (Date.now() - startedAt) / 1000;
			timeLeft = Math.max(0, Math.ceil(duration - elapsed));
		};
		update();
		timerHandle = setInterval(update, 250);
		return () => {
			if (timerHandle) clearInterval(timerHandle);
		};
	});

	$effect(() => {
		if ($multiplayerStore.finished) {
			goto(`/game/multiplayer/result/${code}`);
		}
	});

	// Drive the break countdown (reveal-answer / prepare-next-player phases)
	// off the server-authoritative roundBreakStartedAt.
	$effect(() => {
		const startedAt = $multiplayerStore.roundBreakStartedAt;
		const duration = $multiplayerStore.roundBreakSec;
		if (breakTimerHandle) clearInterval(breakTimerHandle);
		if (startedAt === null) {
			breakLeft = null;
			return;
		}
		const update = () => {
			const elapsed = (Date.now() - startedAt) / 1000;
			breakLeft = Math.max(0, Math.ceil(duration - elapsed));
		};
		update();
		breakTimerHandle = setInterval(update, 250);
		return () => {
			if (breakTimerHandle) clearInterval(breakTimerHandle);
		};
	});

	function handleSubmit() {
		if (!guessInput.trim() || !isMyTurn) return;
		submitGuess(guessInput);
		guessInput = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSubmit();
	}

	function handleLeave() {
		leaveRoom();
		goto('/');
	}

	const sortedPlayers = $derived([...$multiplayerStore.players].sort((a, b) => b.score - a.score));
</script>

<svelte:window onkeydown={onKeydown} />

{#if $multiplayerStore.currentImage}
	{@const image = $multiplayerStore.currentImage}
	{@const total = image.gridSize * image.gridSize}
	{@const revealed = $multiplayerStore.revealedTiles}

	<div
		class="flex h-screen flex-col bg-linear-to-br from-primary-100/40 via-white to-primary-100/20"
	>
		<!-- ── Top bar: scoreboard + leave ───────────────────────────────────── -->
		<div
			class="flex items-center justify-between border-b border-primary-100/60 bg-white/50 px-4 py-3 backdrop-blur-sm"
		>
			<button
				type="button"
				onclick={handleLeave}
				class="text-sm text-gray-600 transition-colors hover:text-primary-500"
			>
				ออกจากเกม
			</button>

			<!-- ── Hint popup (top center) ─────────────────────────────────────── -->
			<div class="relative" bind:this={hintContainer}>
				<button
					type="button"
					onclick={handleHintToggle}
					aria-expanded={hintOpen}
					aria-haspopup="true"
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
						{hintOpen ? 'bg-warning/10 text-warning' : 'text-gray-600 hover:bg-primary-100/60 hover:text-primary-600'}"
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
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4" />
						<path d="M12 8h.01" />
					</svg>
					คำใบ้
				</button>

				{#if hintOpen}
					<div
						class="absolute top-full left-1/2 z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-primary-100/60 bg-white/95 shadow-xl backdrop-blur-sm"
					>
						<div class="border-b border-gray-100 px-4 py-2.5">
							<span class="text-xs font-semibold tracking-wide text-gray-500 uppercase">คำใบ้</span>
						</div>
						<div class="px-4 py-4">
							{#if !$multiplayerStore.currentImage || $multiplayerStore.currentImage.hintCount === 0}
								<p class="text-center text-sm text-gray-400">ไม่มีคำใบ้สำหรับรูปนี้</p>
							{:else}
								<ul class="flex flex-col gap-2">
									{#each Array($multiplayerStore.currentImage.hintCount) as _, i (i)}
										{@const revealed = $multiplayerStore.revealedHints.find((h) => h.orderIndex === i)}
										{@const isNext = i === $multiplayerStore.revealedHints.length}
										<li>
											{#if revealed}
												<p class="text-sm leading-relaxed text-gray-700">💡 {revealed.hint}</p>
											{:else if isNext && isMyTurn}
												<button
													type="button"
													onclick={handleRevealHint}
													class="flex w-full items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
												>
													<span>🔒 เปิดคำใบ้ #{i + 1}</span>
													<span class="text-xs">-{hintPenalty} คะแนน</span>
												</button>
											{:else if isNext}
												<p class="text-center text-sm text-gray-400">รอตาคุณเพื่อเปิดคำใบ้ #{i + 1}</p>
											{:else}
												<p class="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-300">🔒 คำใบ้ #{i + 1}</p>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2 overflow-x-auto">
				{#each sortedPlayers as player (player.id)}
					<span
						class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {player.id ===
						$multiplayerStore.currentTurnPlayerId
							? 'bg-primary-500 text-white'
							: 'bg-primary-100/60 text-gray-600'}"
					>
						{player.name}
						<span class="font-bold">{player.score}</span>
					</span>
				{/each}
			</div>
		</div>

		<!-- ── Turn indicator + timer ───────────────────────────────────────── -->
		<div
			class="flex items-center justify-between px-4 py-2 text-sm transition-colors duration-300 {isMyTurn
				? 'bg-success/15'
				: ''}"
		>
			<span class={isMyTurn ? 'font-semibold text-success' : 'text-gray-500'}>
				{isMyTurn
					? '🟢 ตาคุณ!'
					: `ตาของ ${$multiplayerStore.players.find((p) => p.id === $multiplayerStore.currentTurnPlayerId)?.name ?? '...'}`}
			</span>
			{#if timeLeft !== null && $multiplayerStore.roundPhase === 'none'}
				<span
					class="font-mono font-semibold tabular-nums {timeLeft <= 5
						? 'text-error'
						: 'text-gray-700'}"
				>
					{timeLeft}s
				</span>
			{/if}
		</div>

		<!-- ── Tile grid ─────────────────────────────────────────────────────── -->
		<div
			class="flex min-h-0 flex-1 flex-col items-center gap-4 px-4 py-2 sm:px-8 md:px-16 lg:px-32"
		>
			<div
				class="relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl bg-primary-100/10 shadow-sm"
				bind:clientWidth={containerW}
				bind:clientHeight={containerH}
			>
				<img
					src={image.imageUrl}
					alt="ภาพปริศนา"
					class="absolute inset-0 h-full w-full object-contain"
					onload={onImgLoad}
				/>
				{#if $multiplayerStore.roundPhase !== 'answer'}
					<div
						class="absolute grid"
						style="{imageAreaStyle} grid-template-columns: repeat({image.gridSize}, 1fr); grid-template-rows: repeat({image.gridSize}, 1fr);"
					>
						{#each Array(total) as _, i (i)}
							{@const isRevealed = revealed.includes(i)}
							<button
								type="button"
								onclick={() => revealTile(i)}
								disabled={!isMyTurn || isRevealed}
								class="flex items-center justify-center border border-primary-400/20 transition-all duration-200 {isRevealed
									? 'bg-transparent'
									: 'bg-primary-100 hover:bg-primary-400 hover:shadow-sm'} {isMyTurn && !isRevealed
									? 'cursor-pointer'
									: 'cursor-default'}"
								aria-label="เปิดช่อง {i + 1}"
							>
								{#if !isRevealed}
									<span class="text-xs font-medium text-primary-500/70 select-none">{i + 1}</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				{#if $multiplayerStore.roundPhase === 'answer' && $multiplayerStore.revealedAnswer}
					<div class="pointer-events-none absolute inset-0 flex items-start justify-center pt-3">
						<span
							class="rounded-full border border-white/60 bg-white/95 px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-sm"
						>
							คำตอบ: {$multiplayerStore.revealedAnswer}
							{#if breakLeft !== null}<span class="ml-1 text-gray-400">({breakLeft}s)</span>{/if}
						</span>
					</div>
				{/if}

				{#if $multiplayerStore.roundPhase === 'prepare'}
					{@const nextPlayer = $multiplayerStore.players.find(
						(p) => p.id === $multiplayerStore.nextPlayerId
					)}
					{@const isNextMe = $multiplayerStore.nextPlayerId === selfId}
					<div
						class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30"
					>
						<span
							class="{isNextMe
								? 'animate-pulse bg-green-300'
								: 'bg-white/95'} rounded-2xl px-6 py-3 text-center text-base font-semibold text-gray-700 shadow-lg"
						>
							{isNextMe
								? 'เตรียมตัวให้พร้อม! ตาคุณ'
								: `เตรียมตัวให้พร้อม! ตาของ ${nextPlayer?.name ?? '...'}`}
							{#if breakLeft !== null}<br /><span class="text-sm font-normal text-gray-500"
									>ใน {breakLeft} วินาที</span
								>{/if}
						</span>
					</div>
				{/if}
			</div>

			<!-- ── Answer bubbles ───────────────────────────────────────────── -->
			<div class="flex min-h-8 w-full flex-wrap items-center justify-center gap-2">
				{#each $multiplayerStore.bubbles as bubble (bubble)}
					{@const player = $multiplayerStore.players.find((p) => p.id === bubble.playerId)}
					<span
						class="rounded-full px-3 py-1 text-xs font-medium shadow-sm {bubble.result === 'correct'
							? 'bg-success/90 text-black'
							: bubble.result === 'close'
								? 'bg-warning/90 text-black'
								: 'bg-error/90 text-white'}"
					>
						{player?.name}: {bubble.guessText}
					</span>
				{/each}
			</div>

			<!-- ── Answer input ─────────────────────────────────────────────── -->
			<div class="flex w-full shrink-0 flex-col gap-2">
				<div
					class="flex overflow-hidden rounded-xl border border-primary-400/40 bg-white/80 backdrop-blur-sm transition-all focus-within:border-primary-400 focus-within:shadow-sm"
				>
					<input
						type="text"
						bind:value={guessInput}
						disabled={!isMyTurn}
						placeholder={isMyTurn ? 'พิมพ์คำตอบที่นี่...' : 'รอตาคุณ...'}
						autocomplete="off"
						autocorrect="off"
						spellcheck={false}
						class="flex-1 bg-transparent px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
					/>
					<button
						type="button"
						onclick={handleSubmit}
						disabled={!isMyTurn}
						class="bg-primary-500 px-5 py-3 text-sm font-semibold transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
					>
						ส่ง
					</button>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<span class="text-sm text-gray-400">กำลังโหลดเกม...</span>
	</div>
{/if}
