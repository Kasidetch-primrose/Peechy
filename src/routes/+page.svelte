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

	// Most recent items per section. PC shows all 6 (3 x 2); tablet and phone show the first 4 (2 x 2).
	const LIMIT = 6;
	const SMALL_SCREEN_COUNT = 4;

	let gamesLoading = $state(true);
	let games = $state<IGame[]>([]);

	let artworksLoading = $state(true);
	let artworksError = $state(false);
	let artworks = $state<IArtworkCard[]>([]);

	// Items past the first 4 only show on PC (lg and up).
	const visibility = (i: number) => (i >= SMALL_SCREEN_COUNT ? 'hidden lg:block' : '');

	$effect(() => {
		gamesLoading = true;
		GameService.paginate({ viewerUserId: $authUserStore.user?.id }, 1, LIMIT)
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
		try {
			const res = await fetch(`/api/artworks?page=1&limit=${LIMIT}`);
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
	<section id="games" class="mx-auto max-w-6xl px-lg pt-2xl pb-xl">
		{@render sectionHeader('เปิดป้ายทายภาพ', '/games')}

		{#if gamesLoading}
			<div class="grid grid-cols-2 gap-3 sm:gap-lg lg:grid-cols-3">
				{#each { length: LIMIT } as _, i}
					<div class={visibility(i)}><GameCardSkeleton /></div>
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
					<div class={visibility(i)}><GameCard {game} compact /></div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ! ! Artworks section -->
	<section id="artworks" class="mx-auto max-w-6xl px-lg pt-xl pb-2xl">
		{@render sectionHeader('วาดรูปด้วยกัน', '/artworks')}

		{#if artworksLoading}
			<div class="grid grid-cols-2 gap-3 sm:gap-lg lg:grid-cols-3">
				{#each { length: LIMIT } as _, i}
					<div class={visibility(i)}><ArtworkCardSkeleton /></div>
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
					<div class={visibility(i)}><ArtworkCard {art} /></div>
				{/each}
			</div>
		{/if}
	</section>
</main>
