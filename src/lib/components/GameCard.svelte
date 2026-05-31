<script lang="ts">
	import GameService from '$lib/data/services/game';
	import { authUserStore } from '$lib/data/stores/authUser';
	import type { IGame } from '$lib/data/interface/game';

	const COVER_COLORS = [
		'#FFE5DC',
		'#E8F4FF',
		'#F0FFF4',
		'#FFFBEA',
		'#F5F3FF',
		'#E6F7FF',
		'#FFF0F6',
		'#F0F9FF'
	];
	const EMOJIS = ['🎮', '🧩', '⚡', '🃏', '🏆', '📝', '🌍', '🎯', '🔥', '💡'];

	let { game }: { game: IGame } = $props();
	let likeLoading = $state(false);
	let liked = $state(false);
	let likes = $state(0);

	const coverColor = $derived(COVER_COLORS[game.id % COVER_COLORS.length]);
	const emoji = $derived(EMOJIS[game.id % EMOJIS.length]);

	$effect(() => {
		liked = Boolean(game.isLiked);
		likes = game.likes ?? 0;
	});

	async function handleToggleLike(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const userId = $authUserStore.user?.id;
		if (!userId || likeLoading) return;

		likeLoading = true;
		const prevLiked = liked;
		const prevLikes = likes;
		liked = !liked;
		likes = Math.max(0, likes + (liked ? 1 : -1));

		try {
			const res = await GameService.toggleLike(game.id, userId);
			if (res.status === 'success') {
				liked = Boolean(res.liked);
				likes = res.likes ?? likes;
			} else {
				liked = prevLiked;
				likes = prevLikes;
			}
		} catch {
			liked = prevLiked;
			likes = prevLikes;
		} finally {
			likeLoading = false;
		}
	}
</script>

<div class="relative">
	{#if $authUserStore.user}
		<button
			type="button"
			onclick={handleToggleLike}
			aria-label={liked ? `ยกเลิกถูกใจเกม ${game.name}` : `ถูกใจเกม ${game.name}`}
			disabled={likeLoading}
			class="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur transition-colors hover:text-red-500 disabled:opacity-50"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill={liked ? 'currentColor' : 'none'}
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class={liked ? 'text-red-500' : ''}
			>
				<path
					d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
				/>
			</svg>
		</button>
	{/if}

	<a href={`/game/detail/${game.id}`} class="block" aria-label={`เปิดรายละเอียดเกม ${game.name}`}>
		<article
			class="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-primary-100/60 bg-white/85 shadow-sm
         transition-all duration-200 hover:-translate-y-1.5 hover:border-primary-400/30 hover:shadow-lg"
		>
			<!-- ! Cover -->
			{#if game.thumbnailUrl}
				<div class="h-36 w-full overflow-hidden">
					<img src={game.thumbnailUrl} alt={game.name} class="h-full w-full object-cover" />
				</div>
			{:else}
				<div
					class="flex h-36 items-center justify-center text-5xl"
					style="background-color: {coverColor};"
				>
					{emoji}
				</div>
			{/if}

			<!-- ! Body -->
			<div class="flex flex-1 flex-col gap-xs p-md">
				<!-- ! Category badge -->
				<span
					class="w-fit rounded-full bg-primary-100 px-sm py-2xs text-xs font-medium text-primary-600"
				>
					{game.difficulty ?? 'ทั่วไป'}
				</span>

				<h3 class="text-base leading-snug font-semibold text-gray-900 group-hover:text-primary-600">
					{game.name}
				</h3>

				<p class="line-clamp-2 flex-1 text-sm leading-normal text-gray-700">
					{game.description}
				</p>

				<!-- ! Footer -->
				<div class="mt-xs flex items-center justify-between border-t border-primary-100/60 pt-sm">
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
						{game.playCount?.toLocaleString() ?? 0} ผู้เล่น
					</span>

					<div class="flex items-center gap-2">
						<span class="text-xs text-gray-400">{likes.toLocaleString()}</span>

						<span
							class="rounded-lg bg-primary-500 px-md py-xs text-xs font-medium text-white
                       transition-colors hover:bg-primary-400 focus-visible:ring-2
                       focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary-600"
						>
							เล่นเลย
						</span>
					</div>
				</div>
			</div>
		</article>
	</a>
</div>
