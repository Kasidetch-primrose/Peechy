<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	interface Artwork {
		id: string;
		title: string;
		description: string | null;
		imageUrl: string;
		canvasRatio: string;
		creatorName: string;
		publishedAt: string;
		collaborators: { displayName: string; role: string }[];
	}

	let art = $state<Artwork | null>(null);
	let loading = $state(true);
	let notFound = $state(false);
	let copied = $state(false);

	onMount(async () => {
		try {
			const res = await fetch(`/api/artworks/${page.params.id}`);
			const data = await res.json();
			if (!res.ok || data.status !== 'success') notFound = true;
			else art = data.doc;
		} catch {
			notFound = true;
		} finally {
			loading = false;
		}
	});

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(location.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard unavailable (plain http) — the URL bar still works */
		}
	}
</script>

<svelte:head>
	<title>{art ? `${art.title} · Peechy` : 'ผลงาน · Peechy'}</title>
</svelte:head>

<div class="mx-auto w-full max-w-[56rem] px-4 py-10">
	<a href="/artworks" class="text-sm text-primary-600 hover:underline">← กลับไปแกลเลอรี</a>

	{#if loading}
		<div class="mt-6 aspect-[4/3] animate-pulse rounded-2xl bg-gray-100"></div>
	{:else if notFound || !art}
		<p class="mt-16 text-center text-sm text-gray-500">ไม่พบผลงานนี้</p>
	{:else}
		<div class="mt-4 overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-md">
			<img src={art.imageUrl} alt={art.title} class="mx-auto max-h-[70vh] w-full object-contain" />
		</div>

		<div class="mt-5 flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<h1 class="text-xl font-bold break-words text-gray-900">{art.title}</h1>
				<p class="mt-1 text-sm text-gray-500">
					โดย {art.creatorName} · {new Date(art.publishedAt).toLocaleDateString('th-TH', {
						dateStyle: 'medium'
					})}
				</p>
			</div>
			<button
				type="button"
				onclick={copyLink}
				class="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-95"
			>
				{copied ? '✓ คัดลอกลิงก์แล้ว' : '🔗 คัดลอกลิงก์'}
			</button>
		</div>

		{#if art.description}
			<p class="mt-3 text-sm leading-relaxed whitespace-pre-line text-gray-700">{art.description}</p>
		{/if}

		{#if art.collaborators.length > 0}
			<div class="mt-5">
				<h2 class="text-sm font-semibold text-gray-900">ผู้ร่วมวาด</h2>
				<ul class="mt-2 flex flex-wrap gap-2">
					{#each art.collaborators as c, i (i)}
						<li class="rounded-full bg-primary-100/60 px-3 py-1 text-xs text-gray-700">
							👤 {c.displayName}{c.role === 'creator' ? ' · ผู้เผยแพร่' : ''}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>
