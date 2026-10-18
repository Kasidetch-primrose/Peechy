<script lang="ts">
	import { onMount } from 'svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameCardSkeleton from '$lib/components/GameCardSkeleton.svelte';
	import ArtworkCard, { type IArtworkCard } from '$lib/components/ArtworkCard.svelte';
	import ArtworkCardSkeleton from '$lib/components/ArtworkCardSkeleton.svelte';
	import HomeHeader from '$lib/components/HomeHeader.svelte';
	import HomeAnnouncements from '$lib/components/announcement/HomeAnnouncements.svelte';
	import GameService from '$lib/data/services/game';
	import type { IGame } from '$lib/data/interface/game';
	import { authUserStore } from '$lib/data/stores/authUser';
	import type { IHomeSectionLimit } from '$lib/data/interface/settings';

	let { data } = $props();

	// Most recent items per section; how many is set in the CMS (/admin) separately for PC
	// (lg and up, 3 per row) and tablet/phone (2 per row). One fetch covers the larger count.
	const fetchCount = (s: IHomeSectionLimit) => Math.max(s.desktop, s.mobile);
	const gamesLimit = $derived(data.home.games);
	const artworksLimit = $derived(data.home.artworks);

	let gamesLoading = $state(true);
	let games = $state<IGame[]>([]);

	let artworksLoading = $state(true);
	let artworksError = $state(false);
	let artworks = $state<IArtworkCard[]>([]);

	// Which screen sizes item i shows on.
	function visibility(i: number, s: IHomeSectionLimit) {
		const onMobile = i < s.mobile;
		const onDesktop = i < s.desktop;
		if (onMobile && onDesktop) return '';
		return onMobile ? 'lg:hidden' : 'hidden lg:block';
	}

	// A count of 0 hides the whole section on that screen size.
	function sectionVisibility(s: IHomeSectionLimit) {
		if (s.desktop === 0) return 'lg:hidden';
		if (s.mobile === 0) return 'hidden lg:block';
		return '';
	}

	$effect(() => {
		const limit = fetchCount(gamesLimit);
		if (limit === 0) return;
		gamesLoading = true;
		GameService.paginate({ viewerUserId: $authUserStore.user?.id }, 1, limit)
			.then((res) => {
				if (res.status === 'success') {
					games = res.docs;
				}
			})
			.finally(() => {
				gamesLoading = false;
			});
	});

	onMount(async () => {
		const limit = fetchCount(artworksLimit);
		if (limit === 0) return;
		try {
			const res = await fetch(`/api/artworks?page=1&limit=${limit}`);
			const data = await res.json();
			if (!res.ok || data.status !== 'success') throw new Error(data.error ?? 'load failed');
			artworks = data.docs;
		} catch {
			artworksError = true;
		} finally {
			artworksLoading = false;
		}
	});
</script>

{#snippet sectionHeader(title: string, href: string)}
	<div class="mb-lg flex items-center justify-between gap-md">
		<h2 class="text-2xl font-semibold text-gray-900">{title}</h2>
		<a
			{href}
			class="group flex shrink-0 items-center gap-1 text-sm font-medium text-primary-600 transition-colors hover:text-primary-500"
		>
			ดูทั้งหมด
			<span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
		</a>
	</div>
{/snippet}

<main class="animate-game-enter min-h-screen bg-transparent">
	<!-- ! ! HomeHeader -->
	<!-- ! ! <HomeHeader /> -->

	<!-- ! ! Announcements (managed in /admin) -->
	<HomeAnnouncements />

	<!-- ! ! Games section -->
	{#if fetchCount(gamesLimit) > 0}
		<section id="games" class="mx-auto max-w-6xl px-lg pt-2xl pb-xl {sectionVisibility(gamesLimit)}">
			{@render sectionHeader('เปิดป้ายทายภาพ', '/games')}

			{#if gamesLoading}
				<div class="grid grid-cols-2 gap-3 sm:gap-lg lg:grid-cols-3">
					{#each { length: fetchCount(gamesLimit) } as _, i}
						<div class={visibility(i, gamesLimit)}><GameCardSkeleton /></div>
					{/each}
				</div>
			{:else if games.length === 0}
				<div class="flex flex-col items-center gap-md py-2xl text-center">
					<span class="text-5xl">🖼️</span>
					<p class="text-gray-700">ยังไม่มีเกม</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:gap-lg lg:grid-cols-3">
					{#each games as game, i (game.id)}
						<div class={visibility(i, gamesLimit)}><GameCard {game} compact /></div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- ! ! Artworks section -->
	{#if fetchCount(artworksLimit) > 0}
		<section id="artworks" class="mx-auto max-w-6xl px-lg pt-xl pb-2xl {sectionVisibility(artworksLimit)}">
			{@render sectionHeader('วาดรูปด้วยกัน', '/artworks')}

			{#if artworksLoading}
				<div class="grid grid-cols-2 gap-3 sm:gap-lg lg:grid-cols-3">
					{#each { length: fetchCount(artworksLimit) } as _, i}
						<div class={visibility(i, artworksLimit)}><ArtworkCardSkeleton /></div>
					{/each}
				</div>
			{:else if artworksError}
				<p class="py-2xl text-center text-sm text-red-500">โหลดผลงานไม่สำเร็จ</p>
			{:else if artworks.length === 0}
				<div class="flex flex-col items-center gap-md py-2xl text-center">
					<span class="text-5xl">🎨</span>
					<p class="text-gray-700">ยังไม่มีผลงานที่เผยแพร่ — เป็นคนแรกเลย!</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:gap-lg lg:grid-cols-3">
					{#each artworks as art, i (art.id)}
						<div class={visibility(i, artworksLimit)}><ArtworkCard {art} /></div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</main>
