<script lang="ts">
	import { onMount } from 'svelte';

	interface ArtworkCard {
		id: string;
		title: string;
		imageUrl: string;
		thumbnailUrl: string | null;
		canvasRatio: string;
		creatorName: string;
		publishedAt: string;
		collaborators: number;
	}

	const LIMIT = 24;
	let items = $state<ArtworkCard[]>([]);
	let page = $state(1);
	let pages = $state(1);
	let loading = $state(true);
	let error = $state('');

	async function load(next: number) {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/artworks?page=${next}&limit=${LIMIT}`);
			const data = await res.json();
			if (!res.ok || data.status !== 'success') throw new Error(data.error ?? 'load failed');
			items = next === 1 ? data.docs : [...items, ...data.docs];
			page = next;
			pages = data.pages;
		} catch {
			error = 'โหลดแกลเลอรีไม่สำเร็จ';
		} finally {
			loading = false;
		}
	}

	onMount(() => void load(1));

	const byline = (a: ArtworkCard) =>
		a.collaborators > 1 ? `${a.creatorName} + ${a.collaborators - 1} คน` : a.creatorName;
</script>

<svelte:head>
	<title>แกลเลอรี · Peechy</title>
</svelte:head>

<div class="mx-auto w-full max-w-[72rem] px-4 py-10">
	<!-- Big, hard-to-miss CTA: this is the actual entry point into Draw Together,
	     the gallery page is just the front door now that the navbar points here. -->
	<div
		class="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border border-primary-200 bg-linear-to-br from-primary-100 via-primary-50 to-white px-6 py-8 text-center shadow-md sm:flex-row sm:justify-between sm:text-left md:px-10 md:py-10"
	>
		<div
			class="pointer-events-none absolute -top-10 -right-10 text-[9rem] leading-none opacity-10 select-none"
			aria-hidden="true"
		>
			🎨
		</div>
		<div class="relative">
			<h1 class="text-2xl font-bold text-gray-900 md:text-3xl">แกลเลอรีผลงาน</h1>
			<p class="mt-1.5 text-sm text-gray-500 md:text-base">ผลงานที่ทุกคนช่วยกันวาดใน “วาดรูปด้วยกัน”</p>
		</div>
		<a
			href="/game/draw"
			class="group relative flex shrink-0 items-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-300/50 transition-all hover:-translate-y-0.5 hover:bg-primary-400 hover:shadow-xl hover:shadow-primary-300/60 active:scale-95"
		>
			<span class="absolute inset-0 -z-10 animate-ping rounded-full bg-primary-400/60"></span>
			🎨 ไปวาดด้วยกัน
			<span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
		</a>
	</div>

	{#if error}
		<p class="mt-10 text-center text-sm text-red-500">{error}</p>
	{:else if !loading && items.length === 0}
		<p class="mt-16 text-center text-sm text-gray-400">ยังไม่มีผลงานที่เผยแพร่ — เป็นคนแรกเลย!</p>
	{:else}
		<ul class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
			{#each items as art (art.id)}
				<li>
					<a
						href="/artworks/{art.id}"
						class="group block overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
					>
						<div class="flex aspect-[4/3] items-center justify-center bg-gray-50">
							<img
								src={art.thumbnailUrl ?? art.imageUrl}
								alt={art.title}
								loading="lazy"
								class="h-full w-full object-contain"
							/>
						</div>
						<div class="px-3 py-2">
							<p class="truncate text-sm font-semibold text-gray-900">{art.title}</p>
							<p class="truncate text-xs text-gray-500">
								{art.collaborators > 1 ? '👥' : '👤'}
								{byline(art)}
							</p>
						</div>
					</a>
				</li>
			{/each}
			{#if loading}
				{#each Array(4) as _, i (i)}
					<li class="aspect-[4/3] animate-pulse rounded-2xl bg-gray-100"></li>
				{/each}
			{/if}
		</ul>

		{#if !loading && page < pages}
			<div class="mt-8 text-center">
				<button
					type="button"
					onclick={() => load(page + 1)}
					class="cursor-pointer rounded-full border border-primary-300 px-5 py-2 text-sm font-medium text-primary-600 transition-all hover:bg-primary-100/50 active:scale-95"
				>
					โหลดเพิ่ม
				</button>
			</div>
		{/if}
	{/if}
</div>
