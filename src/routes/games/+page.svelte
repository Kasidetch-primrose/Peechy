<script lang="ts">
	import { onMount } from 'svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameCardSkeleton from '$lib/components/GameCardSkeleton.svelte';
	import PageBanner from '$lib/components/PageBanner.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import GameService from '$lib/data/services/game';
	import type { IGame } from '$lib/data/interface/game';
	import { authUserStore } from '$lib/data/stores/authUser';

	const PAGE_SIZE = 20;

	let games = $state<IGame[]>([]);
	let page = $state(0); // last page loaded
	let totalPages = $state(1);
	let total = $state(0);
	let loading = $state(false);
	let errored = $state(false);
	let sentinel = $state<HTMLDivElement | null>(null);

	// Search: `searchInput` is what's typed, `activeSearch` is what was submitted.
	let searchInput = $state('');
	let activeSearch = $state('');
	// Bumped on every new search so late responses from an older query are ignored.
	let requestId = 0;

	const hasMore = $derived(page < totalPages);
	const initialLoading = $derived(loading && games.length === 0);

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		errored = false;
		const next = page + 1;
		const myRequest = requestId;
		try {
			const res = await GameService.paginate(
				{ viewerUserId: $authUserStore.user?.id, search: activeSearch || undefined },
				next,
				PAGE_SIZE
			);
			if (myRequest !== requestId) return; // a newer search replaced this one
			if (res.status === 'success') {
				// de-dupe in case new games were created between page loads
				const seen = new Set(games.map((g) => g.id));
				games = [...games, ...res.docs.filter((g) => !seen.has(g.id))];
				page = next;
				totalPages = res.pages;
				total = res.total;
			} else {
				errored = true;
			}
		} catch {
			if (myRequest === requestId) errored = true;
		} finally {
			if (myRequest === requestId) loading = false;
		}
	}

	// Triggered by the search button or Enter (form submit).
	function runSearch(e?: Event) {
		e?.preventDefault();
		activeSearch = searchInput.trim();
		requestId++;
		games = [];
		page = 0;
		totalPages = 1;
		total = 0;
		errored = false;
		loading = false;
		loadMore();
	}

	function clearSearch() {
		searchInput = '';
		runSearch();
	}

	onMount(() => {
		loadMore();
	});

	// Observe the sentinel; fire when it gets close to the viewport.
	// An observer only reports on intersection *changes*, so if the sentinel is
	// still on screen after a page finishes loading (short content / big screen)
	// nothing would trigger the next load. Reading `loading` and `page` here
	// re-creates the observer after every load, and a fresh observer always
	// reports the current state once — which keeps loading until the viewport
	// is filled or there are no more pages.
	$effect(() => {
		if (!sentinel || loading || errored || !hasMore) return;
		void page;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore();
			},
			{ rootMargin: '300px 0px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>เปิดป้ายทายภาพ | Peechy</title>
</svelte:head>

<main class="min-h-screen animate-game-enter bg-transparent">
	<section class="mx-auto max-w-6xl px-lg py-2xl">
		<PageBanner
			title="เปิดป้ายทายภาพ"
			subtitle={activeSearch && !loading
				? `พบ ${total} เกมที่ตรงกับ “${activeSearch}”`
				: 'เลือกเกมที่คุณอยากเล่น หรือสร้างเกมของคุณเอง'}
			href="/game/create"
			cta="สร้างเกม"
			ctaIcon="🎮"
			bgIcon="🖼️"
		/>

		<SearchBar
			bind:value={searchInput}
			placeholder="ค้นหาชื่อเกม..."
			disabled={loading && games.length === 0}
			onsearch={runSearch}
		/>

		{#if initialLoading}
			<div class="mt-lg grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
				{#each { length: PAGE_SIZE } as _}
					<GameCardSkeleton />
				{/each}
			</div>
		{:else if games.length === 0 && !errored}
			<div class="mt-lg flex flex-col items-center gap-md py-2xl text-center">
				<span class="text-5xl">🔍</span>
				{#if activeSearch}
					<p class="text-gray-700">ไม่พบเกมที่ชื่อ “{activeSearch}”</p>
					<button
						type="button"
						onclick={clearSearch}
						class="rounded-full border border-primary-300 bg-primary-100 px-lg py-sm text-sm text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-600"
					>
						ล้างการค้นหา
					</button>
				{:else}
					<p class="text-gray-700">ยังไม่มีเกม</p>
				{/if}
			</div>
		{:else}
			<div class="mt-lg grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
				{#each games as game (game.id)}
					<GameCard {game} />
				{/each}

				{#if loading}
					{#each { length: 3 } as _}
						<GameCardSkeleton />
					{/each}
				{/if}
			</div>
		{/if}

		{#if errored}
			<div class="flex flex-col items-center gap-sm py-xl text-center">
				<p class="text-sm text-gray-700">โหลดเกมไม่สำเร็จ</p>
				<button
					type="button"
					onclick={loadMore}
					class="rounded-full bg-primary-500 px-lg py-sm text-sm font-medium text-white transition-colors hover:bg-primary-400"
				>
					ลองอีกครั้ง
				</button>
			</div>
		{:else if !hasMore && games.length > 0}
			<p class="py-xl text-center text-sm text-gray-500">{activeSearch ? 'แสดงครบทุกผลการค้นหาแล้ว' : 'แสดงครบทุกเกมแล้ว'} 🍑</p>
		{/if}

		<!-- Sentinel for lazy loading -->
		<div bind:this={sentinel} class="h-1" aria-hidden="true"></div>
	</section>
</main>
