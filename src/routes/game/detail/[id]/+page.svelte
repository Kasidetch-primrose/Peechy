<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		gameDetailStore,
		isCreatorStore,
		loadGame,
		resetGameDetailStore,
		setActiveImage,
		difficultyLabel,
		difficultyBg
	} from '$lib/data/stores/game-detail';

	$effect(() => {
		const id = Number(page.params.id);
		loadGame(id);
		return () => resetGameDetailStore();
	});
</script>

{#if $gameDetailStore.loading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
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
{:else if $gameDetailStore.error}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
		<span class="text-5xl">😕</span>
		<p class="text-base font-medium text-gray-700">{$gameDetailStore.error}</p>
		<button
			onclick={() => history.back()}
			class="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white hover:bg-primary-400"
		>
			ย้อนกลับ
		</button>
	</div>
{:else if $gameDetailStore.game}
	{@const game = $gameDetailStore.game}
	{@const images = $gameDetailStore.images}
	<div class="min-h-screen bg-gray-50">
		<!-- ! ── Hero ──────────────────────────────────────────────────────────── -->
		<div class="bg-white shadow-sm">
			<div class="mx-auto max-w-4xl px-4 py-6">
				<!-- ! Back + actions row -->
				<div class="mb-4 flex items-center justify-between">
					<button
						onclick={() => history.back()}
						class="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
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
						ย้อนกลับ
					</button>

					{#if $isCreatorStore}
						<a
							href="/game/create?id={game.id}"
							class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-600"
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
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
									d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
								/>
							</svg>
							แก้ไขเกม
						</a>
					{/if}
				</div>

				<!-- ! Title + badges -->
				<div class="flex flex-col gap-3">
					<div class="flex flex-wrap items-start gap-2">
						<h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">{game.name}</h1>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						{#if game.difficulty}
							<span
								class="rounded-full px-3 py-0.5 text-xs font-semibold {difficultyBg[
									game.difficulty
								] ?? 'bg-gray-200 text-gray-700'}"
							>
								{difficultyLabel[game.difficulty] ?? game.difficulty}
							</span>
						{/if}

						<span
							class="flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium {game.isPublic
								? 'bg-secondary-green/20 text-secondary-green'
								: 'bg-gray-200 text-gray-500'}"
						>
							{#if game.isPublic}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path
										d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
									/>
								</svg>
								สาธารณะ
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path
										d="M7 11V7a5 5 0 0 1 10 0v4"
									/>
								</svg>
								ส่วนตัว
							{/if}
						</span>

						<span class="text-xs text-gray-400">
							{images.length} รูป
						</span>
					</div>

					{#if game.description}
						<p class="max-w-2xl text-sm leading-relaxed text-gray-600">{game.description}</p>
					{/if}
				</div>

				<!-- ! Stats row -->
				<div class="mt-4 flex flex-wrap gap-5 border-t border-gray-100 pt-4">
					<div class="flex items-center gap-1.5 text-sm text-gray-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
							/>
						</svg>
						{(game.likes ?? 0).toLocaleString()} ถูกใจ
					</div>
					<div class="flex items-center gap-1.5 text-sm text-gray-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
						{(game.playCount ?? 0).toLocaleString()} ครั้งที่เล่น
					</div>
					<div class="flex items-center gap-1.5 text-sm text-gray-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
								x1="16"
								y1="2"
								x2="16"
								y2="6"
							/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						{new Date(game.createdAt).toLocaleDateString('th-TH', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})}
					</div>
				</div>

				<!-- ! Play button -->
				<div class="mt-5">
					<button
						onclick={() => goto(`/game/${game!.id}/play`)}
						disabled={images.length === 0}
						class="rounded-xl bg-primary-500 px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
					>
						{images.length === 0 ? 'ยังไม่มีรูปภาพ' : '▶ เริ่มเล่น'}
					</button>
				</div>
			</div>
		</div>

		<!-- ! ── Image gallery ─────────────────────────────────────────────────── -->
		{#if images.length > 0}
			<div class="mx-auto max-w-4xl px-4 py-8">
				<h2 class="mb-4 text-base font-semibold text-gray-800">
					รูปภาพทั้งหมด
					<span class="ml-1 text-sm font-normal text-gray-400">({images.length} รูป)</span>
				</h2>

				<!-- ! Spotlight preview -->
				<div class="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
					<div class="relative aspect-video w-full bg-gray-100">
						<img
							src={images[$gameDetailStore.activeImageIdx]?.imageUrl}
							alt="รูปที่ {$gameDetailStore.activeImageIdx + 1}"
							class="h-full w-full object-contain"
						/>
						<!-- ! Order badge -->
						<span
							class="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white shadow"
						>
							{$gameDetailStore.activeImageIdx + 1}
						</span>
					</div>

					<!-- ! Active image meta -->
					<div class="flex flex-wrap items-start justify-between gap-4 p-4">
						<div class="flex flex-col gap-1">
							<span class="text-xs font-medium text-gray-400">คำตอบ</span>
							<span class="text-lg font-bold text-gray-900"
								>{images[$gameDetailStore.activeImageIdx]?.answer}</span
							>
							{#if images[$gameDetailStore.activeImageIdx]?.hint}
								<span class="text-sm text-gray-500"
									>💡 {images[$gameDetailStore.activeImageIdx].hint}</span
								>
							{/if}
						</div>
						<div class="flex flex-wrap gap-3 text-center">
							<div class="flex flex-col items-center rounded-lg bg-gray-50 px-4 py-2">
								<span class="text-base font-bold text-gray-800"
									>{images[$gameDetailStore.activeImageIdx]?.gridSize}×{images[
										$gameDetailStore.activeImageIdx
									]?.gridSize}</span
								>
								<span class="text-xs text-gray-400">ตาราง</span>
							</div>
							{#if images[$gameDetailStore.activeImageIdx]?.timeLimit}
								<div class="flex flex-col items-center rounded-lg bg-gray-50 px-4 py-2">
									<span class="text-base font-bold text-gray-800"
										>{images[$gameDetailStore.activeImageIdx].timeLimit}s</span
									>
									<span class="text-xs text-gray-400">จำกัดเวลา</span>
								</div>
							{/if}
							{#if images[$gameDetailStore.activeImageIdx]?.maxReveal}
								<div class="flex flex-col items-center rounded-lg bg-gray-50 px-4 py-2">
									<span class="text-base font-bold text-gray-800"
										>{images[$gameDetailStore.activeImageIdx].maxReveal}</span
									>
									<span class="text-xs text-gray-400">เปิดสูงสุด</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- ! Prev / Next -->
					{#if images.length > 1}
						<div class="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<button
								onclick={() => setActiveImage(Math.max(0, $gameDetailStore.activeImageIdx - 1))}
								disabled={$gameDetailStore.activeImageIdx === 0}
								class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
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
									<path d="m15 18-6-6 6-6" />
								</svg>
								ก่อนหน้า
							</button>
							<span class="text-sm text-gray-400"
								>{$gameDetailStore.activeImageIdx + 1} / {images.length}</span
							>
							<button
								onclick={() =>
									setActiveImage(Math.min(images.length - 1, $gameDetailStore.activeImageIdx + 1))}
								disabled={$gameDetailStore.activeImageIdx === images.length - 1}
								class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
							>
								ถัดไป
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
						</div>
					{/if}
				</div>

				<!-- ! Thumbnail strip -->
				<div class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
					{#each images as img, i (img.id)}
						<button
							type="button"
							onclick={() => setActiveImage(i)}
							class="group relative aspect-square overflow-hidden rounded-xl border-2 transition-all {i ===
							$gameDetailStore.activeImageIdx
								? 'border-primary-500 shadow-md'
								: 'hover:border-primary-200 border-transparent'}"
						>
							<img
								src={img.imageUrl}
								alt="รูปที่ {i + 1}"
								class="h-full w-full object-cover transition-transform group-hover:scale-105"
							/>
							<span
								class="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shadow {i ===
								$gameDetailStore.activeImageIdx
									? 'bg-primary-500 text-white'
									: 'bg-white/90 text-gray-700'}"
							>
								{i + 1}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mx-auto max-w-4xl px-4 py-16 text-center">
				<span class="text-5xl">🖼️</span>
				<p class="mt-3 text-sm text-gray-400">เกมนี้ยังไม่มีรูปภาพ</p>
				{#if $isCreatorStore}
					<a
						href="/game/create?id={game.id}"
						class="mt-4 inline-block rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white hover:bg-primary-400"
					>
						เพิ่มรูปภาพ
					</a>
				{/if}
			</div>
		{/if}
	</div>
{/if}
