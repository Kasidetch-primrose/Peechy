<script lang="ts">
	import GameCard from '$lib/components/GameCard.svelte';
	import GameCardSkeleton from '$lib/components/GameCardSkeleton.svelte';
	import HomeHeader from '$lib/components/HomeHeader.svelte';
	import GameService from '$lib/data/services/game';
	import type { IGame } from '$lib/data/interface/game';
	import { authUserStore } from '$lib/data/stores/authUser';

	let loading = $state(true);
	let games = $state<IGame[]>([]);

	// Categories derived from the fetched games' difficulty field
	const categories = $derived(['ทั้งหมด', ...new Set(games.map((g) => g.difficulty ?? 'ทั่วไป'))]);

	let activeCategory = $state('ทั้งหมด');
	let searchQuery = $state('');

	let filtered = $derived(
		games.filter((g) => {
			const matchCat =
				activeCategory === 'ทั้งหมด' || (g.difficulty ?? 'ทั่วไป') === activeCategory;
			const matchSearch =
				g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(g.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
			return matchCat && matchSearch;
		})
	);

	$effect(() => {
		loading = true;
		GameService.paginate({ viewerUserId: $authUserStore.user?.id }, 1, 50)
			.then((res) => {
				if (res.status === 'success') {
					games = res.docs;
				}
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

<main class="animate-game-enter min-h-screen bg-transparent">
	<!-- ! ! HomeHeader -->
	<!-- ! ! <HomeHeader /> -->

	<!-- ! ! Games section -->
	<section id="games" class="mx-auto max-w-6xl px-lg py-2xl">
		<!-- ! ! Section header -->
		<div class="mb-lg flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-2xl font-semibold text-gray-900">เกมยอดนิยม</h2>
				<p class="mt-xs text-sm text-gray-700">เลือกเกมที่เหมาะกับคุณ</p>
			</div>

			<!-- ! ! Search -->
			<div class="relative w-full sm:w-auto">
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
					class="absolute top-1/2 left-sm -translate-y-1/2 text-gray-400"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
				<input
					type="search"
					placeholder="ค้นหาเกม..."
					bind:value={searchQuery}
					class="border-primary-300 w-full rounded-lg border bg-primary-100 py-sm pr-md pl-lg text-sm text-gray-900
                           placeholder:text-gray-400
                           focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
				/>
			</div>
		</div>

		<!-- ! ! Category filter -->
		<!-- <div class="mb-lg flex flex-wrap gap-sm">
			{#each categories as cat}
				<button
					onclick={() => (activeCategory = cat)}
					class="rounded-full px-md py-xs text-sm font-medium transition-colors
                           focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none
                           {activeCategory === cat
						? 'bg-primary-500 text-white'
						: 'border-primary-300 border bg-primary-100 text-gray-700 hover:border-primary-400 hover:text-primary-600'}"
				>
					{cat}
				</button>
			{/each}
		</div> -->

		<!-- ! ! Grid -->
		{#if loading}
			<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
				{#each { length: 6 } as _}
					<GameCardSkeleton />
				{/each}
			</div>
		{:else if filtered.length === 0}
			<div class="flex flex-col items-center gap-md py-2xl text-center">
				<span class="text-5xl">🔍</span>
				<p class="text-gray-700">ไม่พบเกมที่คุณค้นหา</p>
				<button
					onclick={() => {
						searchQuery = '';
						activeCategory = 'ทั้งหมด';
					}}
					class="border-primary-300 rounded-lg border bg-primary-100 px-lg py-sm text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600"
				>
					ล้างการค้นหา
				</button>
			</div>
		{:else}
			<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as game (game.id)}
					<GameCard {game} />
				{/each}
			</div>
		{/if}
	</section>
</main>
