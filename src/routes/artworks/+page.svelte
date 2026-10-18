<script lang="ts">
	import { onMount } from 'svelte';
	import PageBanner from '$lib/components/PageBanner.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ArtworkCard, { type IArtworkCard } from '$lib/components/ArtworkCard.svelte';
	import ArtworkCardSkeleton from '$lib/components/ArtworkCardSkeleton.svelte';

	const LIMIT = 24;
	let items = $state<IArtworkCard[]>([]);
	let page = $state(0); // last page loaded
	let pages = $state(1);
	let loading = $state(false);
	let error = $state('');
	let sentinel = $state<HTMLDivElement | null>(null);
	let total = $state(0);

	// Search: `searchInput` is what's typed, `activeSearch` is what was submitted.
	let searchInput = $state('');
	let activeSearch = $state('');
	// Bumped on every new search so late responses from an older query are ignored.
	let requestId = 0;

	const hasMore = $derived(page < pages);
	const initialLoading = $derived(loading && items.length === 0);

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		error = '';
		const next = page + 1;
		const myRequest = requestId;
		try {
			const params = new URLSearchParams({ page: String(next), limit: String(LIMIT) });
			if (activeSearch) params.set('search', activeSearch);
			const res = await fetch(`/api/artworks?${params}`);
			const data = await res.json();
			if (myRequest !== requestId) return; // a newer search replaced this one
			if (!res.ok || data.status !== 'success') throw new Error(data.error ?? 'load failed');
			const seen = new Set(items.map((a) => a.id));
			items = [...items, ...(data.docs as IArtworkCard[]).filter((a) => !seen.has(a.id))];
			page = next;
			pages = data.pages;
			total = data.total ?? items.length;
		} catch {
			if (myRequest === requestId) error = 'โหลดแกลเลอรีไม่สำเร็จ';
		} finally {
			if (myRequest === requestId) loading = false;
		}
	}

	// Triggered by the search button or Enter.
	function runSearch() {
		activeSearch = searchInput.trim();
		requestId++;
		items = [];
		page = 0;
		pages = 1;
		total = 0;
		error = '';
		loading = false;
		void loadMore();
	}

	function clearSearch() {
		searchInput = '';
		runSearch();
	}

	onMount(() => void loadMore());

	// Lazy loading: observe the sentinel near the bottom. The observer is re-created after
	// every load (reading `loading` / `page`) so a sentinel that is still on screen keeps
	// triggering the next page until the viewport is filled or there are no more pages.
	$effect(() => {
		if (!sentinel || loading || error || !hasMore) return;
		void page;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) void loadMore();
			},
			{ rootMargin: '300px 0px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>แกลเลอรี · Peechy</title>
</svelte:head>

{#snippet artworkSkeleton()}
	<li aria-hidden="true"><ArtworkCardSkeleton /></li>
{/snippet}

<main class="min-h-screen animate-game-enter bg-transparent">
	<section class="mx-auto max-w-6xl px-lg py-2xl">
		<PageBanner
			title="วาดรูปด้วยกัน"
			subtitle={activeSearch && !loading
				? `พบ ${total} ผลงานที่ตรงกับ “${activeSearch}”`
				: 'ผลงานที่ทุกคนช่วยกันวาด'}
			href="/game/draw"
			cta="ไปวาดด้วยกัน"
			ctaIcon="🎨"
			bgIcon="🎨"
		/>

		<SearchBar
			bind:value={searchInput}
			placeholder="ค้นหาชื่อผลงาน..."
			disabled={loading && items.length === 0}
			onsearch={runSearch}
		/>

		{#if initialLoading}
			<ul class="mt-lg grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each { length: 8 } as _}
					{@render artworkSkeleton()}
				{/each}
			</ul>
		{:else if error && items.length === 0}
			<div class="flex flex-col items-center gap-sm py-2xl text-center">
				<p class="text-sm text-red-500">{error}</p>
				<button
					type="button"
					onclick={loadMore}
					class="rounded-full bg-primary-500 px-lg py-sm text-sm font-medium text-white transition-colors hover:bg-primary-400"
				>
					ลองอีกครั้ง
				</button>
			</div>
		{:else if !loading && items.length === 0}
			<div class="mt-lg flex flex-col items-center gap-md py-2xl text-center">
				<span class="text-5xl">🔍</span>
				{#if activeSearch}
					<p class="text-gray-700">ไม่พบผลงานที่ชื่อ “{activeSearch}”</p>
					<button
						type="button"
						onclick={clearSearch}
						class="rounded-full border border-primary-300 bg-primary-100 px-lg py-sm text-sm text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-600"
					>
						ล้างการค้นหา
					</button>
				{:else}
					<p class="text-gray-400">ยังไม่มีผลงานที่เผยแพร่ — เป็นคนแรกเลย!</p>
				{/if}
			</div>
		{:else}
			<ul class="mt-lg grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each items as art (art.id)}
					<li><ArtworkCard {art} /></li>
				{/each}
				{#if loading}
					{#each { length: 4 } as _}
						{@render artworkSkeleton()}
					{/each}
				{/if}
			</ul>

			{#if error}
				<div class="flex flex-col items-center gap-sm py-xl text-center">
					<p class="text-sm text-red-500">{error}</p>
					<button
						type="button"
						onclick={loadMore}
						class="rounded-full bg-primary-500 px-lg py-sm text-sm font-medium text-white transition-colors hover:bg-primary-400"
					>
						ลองอีกครั้ง
					</button>
				</div>
			{:else if !hasMore && items.length > 0}
				<p class="py-xl text-center text-sm text-gray-500">{activeSearch ? 'แสดงครบทุกผลการค้นหาแล้ว' : 'แสดงครบทุกผลงานแล้ว'} 🎨</p>
			{/if}
		{/if}

		<!-- Sentinel for lazy loading -->
		<div bind:this={sentinel} class="h-1" aria-hidden="true"></div>
	</section>
</main>
