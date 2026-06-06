<script lang="ts">
	import { gamePlayStore, revealHint } from '$lib/data/stores/game-play';

	let open = $state(false);

	const currentImage = $derived($gamePlayStore.images[$gamePlayStore.imageIdx]);
	const hints = $derived(
		[...(currentImage?.hints ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
	);
	const revealedIds = $derived($gamePlayStore.revealedHintIds);
	const status = $derived($gamePlayStore.status);
	const penalty = $derived(
		currentImage ? Math.round(100 / (currentImage.gridSize * currentImage.gridSize)) : 0
	);
	const revealedCount = $derived(hints.filter((h) => revealedIds.includes(h.id)).length);
</script>

<div class="relative">
	<!-- Toggle button -->
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-haspopup="true"
		class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
			{open
			? 'bg-warning/10 text-warning'
			: 'text-gray-600 hover:bg-primary-100/60 hover:text-primary-600'}"
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
		{#if hints.length > 0}
			<span
				class="rounded-full px-1.5 py-0.5 text-xs font-semibold
					{revealedCount > 0 ? 'bg-warning/20 text-warning' : 'bg-gray-100 text-gray-500'}"
			>
				{revealedCount}/{hints.length}
			</span>
		{/if}
	</button>

	{#if open}
		<!-- Click-outside backdrop -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-40" role="presentation" onclick={() => (open = false)}></div>

		<!-- Floating card -->
		<div
			class="absolute top-full left-1/2 z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-primary-100/60 bg-white/95 shadow-xl backdrop-blur-sm"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
				<span class="text-xs font-semibold tracking-wide text-gray-500 uppercase">คำใบ้</span>
				{#if hints.length > 0}
					<span class="text-xs text-gray-400">หักคะแนน {penalty} ต่อคำใบ้</span>
				{/if}
			</div>

			<!-- Hint list -->
			{#if hints.length === 0}
				<div class="px-4 py-8 text-center text-sm text-gray-400">ไม่มีคำใบ้สำหรับรูปนี้</div>
			{:else}
				<ul class="divide-y divide-gray-50">
					{#each hints as hint (hint.id)}
						{@const isRevealed = revealedIds.includes(hint.id)}
						<li class="flex items-start gap-3 px-4 py-3">
							<!-- Order badge -->
							<span
								class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold
									{isRevealed ? 'bg-warning/15 text-warning' : 'bg-gray-100 text-gray-400'}"
							>
								{hint.orderIndex + 1}
							</span>

							<div class="min-w-0 flex-1">
								{#if isRevealed}
									<!-- Revealed hint text -->
									<p class="text-sm leading-relaxed text-gray-700">{hint.hint}</p>
								{:else}
									<!-- Locked hint -->
									<button
										type="button"
										onclick={() => {
											if (status === 'playing') {
												revealHint(hint.id);
											}
										}}
										disabled={status !== 'playing'}
										class="group flex w-full items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 text-left text-xs transition-all
											{status === 'playing'
											? 'cursor-pointer border-gray-200 bg-gray-50 text-gray-400 hover:border-warning/50 hover:bg-warning/5 hover:text-warning'
											: 'cursor-not-allowed border-gray-100 bg-gray-50/50 text-gray-300'}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="shrink-0"
										>
											<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
											<path d="M7 11V7a5 5 0 0 1 10 0v4" />
										</svg>
										<span class="flex-1">เปิดคำใบ้</span>
										<span
											class="rounded px-1 py-0.5 text-xs font-semibold
												{status === 'playing'
												? 'bg-warning/10 text-warning group-hover:bg-warning/20'
												: 'bg-gray-100 text-gray-300'}"
										>
											-{penalty}
										</span>
									</button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>

				<!-- Footer score summary -->
				{#if revealedCount > 0}
					<div class="border-t border-gray-100 bg-warning/5 px-4 py-2">
						<p class="text-center text-xs text-warning">
							ใช้คำใบ้ไปแล้ว {revealedCount} ข้อ · หักไปแล้ว {revealedCount * penalty} คะแนน
						</p>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
