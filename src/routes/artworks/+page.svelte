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
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">แกลเลอรีผลงาน</h1>
			<p class="mt-1 text-sm text-gray-500">ผลงานที่ทุกคนช่วยกันวาดใน “วาดรูปด้วยกัน”</p>
		</div>
		<a
			href="/game/draw"
			class="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-400 active:scale-95"
		>
			🎨 ไปวาดด้วยกัน
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
