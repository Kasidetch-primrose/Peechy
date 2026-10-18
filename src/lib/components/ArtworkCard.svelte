<script lang="ts" module>
	export interface IArtworkCard {
		id: string;
		title: string;
		imageUrl: string;
		thumbnailUrl: string | null;
		canvasRatio: string;
		creatorName: string;
		publishedAt: string;
		collaborators: number;
	}
</script>

<script lang="ts">
	let { art }: { art: IArtworkCard } = $props();

	const byline = $derived(
		art.collaborators > 1 ? `${art.creatorName} + ${art.collaborators - 1} คน` : art.creatorName
	);
</script>

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
			{byline}
		</p>
	</div>
</a>
