<script lang="ts">
	import { goto } from '$app/navigation';

	export interface Game {
		id: string;
		title: string;
		description: string;
		category: string;
		playerCount: number;
		coverColor: string;
		emoji: string;
	}

	let { game }: { game: Game } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onclick={() => goto(`/game/detail/${game.id}`)}>
	<article
		class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm
         transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
	>
		<!-- ! Cover -->
		<div
			class="flex h-36 items-center justify-center text-5xl"
			style="background-color: {game.coverColor};"
		>
			{game.emoji}
		</div>

		<!-- ! Body -->
		<div class="flex flex-1 flex-col gap-xs p-md">
			<!-- ! Category badge -->
			<span
				class="w-fit rounded-full bg-primary-100 px-sm py-2xs text-xs font-medium text-primary-600"
			>
				{game.category}
			</span>

			<h3 class="text-base leading-snug font-semibold text-gray-900 group-hover:text-primary-600">
				{game.title}
			</h3>

			<p class="line-clamp-2 flex-1 text-sm leading-normal text-gray-700">
				{game.description}
			</p>

			<!-- ! Footer -->
			<div class="mt-xs flex items-center justify-between border-t border-gray-200 pt-sm">
				<span class="flex items-center gap-xs text-xs text-gray-400">
					<!-- ! person icon -->
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
						aria-hidden="true"
					>
						<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					{game.playerCount.toLocaleString()} ผู้เล่น
				</span>

				<button
					class="rounded-lg bg-primary-500 px-md py-xs text-xs font-medium text-white
                       transition-colors hover:bg-primary-400 focus-visible:ring-2
                       focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary-600"
				>
					เล่นเลย
				</button>
			</div>
		</div>
	</article>
</div>
