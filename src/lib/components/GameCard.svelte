<script lang="ts">
	import GameService from '$lib/data/services/game';
	import { authUserStore } from '$lib/data/stores/authUser';
	import type { IGame } from '$lib/data/interface/game';

	const COVER_COLORS = [
		'linear-gradient(135deg, #FFD4A8 0%, #FFAAB0 100%)',
		'linear-gradient(135deg, #FFE4A0 0%, #A8EDCC 100%)',
		'linear-gradient(135deg, #A8D8FF 0%, #D4B8FF 100%)',
		'linear-gradient(135deg, #D4B8FF 0%, #FFE4A0 100%)',
		'linear-gradient(135deg, #FFAAB0 0%, #FFE5DC 100%)',
		'linear-gradient(135deg, #A8EDCC 0%, #A8D8FF 100%)',
		'linear-gradient(135deg, #FFE5DC 0%, #FFD4A8 100%)',
		'linear-gradient(135deg, #A8F0E0 0%, #D4B8FF 100%)'
	];
	const EMOJIS = ['🎮', '🧩', '⚡', '🃏', '🏆', '📝', '🌍', '🎯', '🔥', '💡'];

	const DIFFICULTY_LABEL: Record<string, string> = {
		easy: 'ง่าย',
		medium: 'ปานกลาง',
		hard: 'ยาก'
	};
	const DIFFICULTY_COLOR: Record<string, string> = {
		easy: '#6BCB77',
		medium: '#FFD166',
		hard: '#FF6B6B'
	};

	let { game }: { game: IGame } = $props();
	let likeLoading = $state(false);
	let liked = $state(false);
	let likes = $state(0);

	const coverGradient = $derived(COVER_COLORS[game.id % COVER_COLORS.length]);
	const emoji = $derived(EMOJIS[game.id % EMOJIS.length]);
	const difficultyKey = $derived((game.difficulty ?? '').toLowerCase());

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

<div class="relative block">
	<a
		href={`/game/detail/${game.id}`}
		class="group relative block h-76 overflow-hidden rounded-2xl [box-shadow:0_4px_16px_-2px_rgba(255,155,115,0.18),0_1px_4px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-350 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] will-change-transform hover:-translate-y-1.5 hover:scale-[1.02] hover:[box-shadow:0_20px_40px_-8px_rgba(255,155,115,0.3),0_4px_12px_rgba(0,0,0,0.08)]"
		aria-label={`เปิดรายละเอียดเกม ${game.name}`}
	>
		<!-- Full-bleed cover -->
		<div class="absolute inset-0 overflow-hidden">
			{#if game.thumbnailUrl}
				<img
					src={game.thumbnailUrl}
					alt={game.name}
					class="h-full w-full scale-100 object-cover transition-transform duration-550 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.08]"
					style="object-position: {game.thumbnailPositionX ?? 50}% {game.thumbnailPositionY ?? 50}%"
				/>
			{:else}
				<div
					class="flex h-full w-full scale-100 items-center justify-center transition-transform duration-550 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.08]"
					style="background: {coverGradient};"
				>
					<span class="text-5xl [filter:drop-shadow(0_4px_10px_rgba(0,0,0,0.15))]">{emoji}</span>
				</div>
			{/if}
		</div>

		<!-- Soft edge-fade just above the glass panel -->
		<div
			class="absolute inset-x-0 bottom-[7.2rem] z-1 h-16 bg-gradient-to-b from-transparent to-black/28"
		></div>

		<!-- Difficulty badge -->
		{#if game.difficulty}
			<span
				class="absolute top-3 left-3 z-10 rounded-full px-[0.6rem] py-[0.2rem] text-[0.68rem] font-bold tracking-wide backdrop-blur-md"
				style="background: {DIFFICULTY_COLOR[difficultyKey] ??
					'#9ca3af'}22; color: {DIFFICULTY_COLOR[difficultyKey] ??
					'#6b7280'}; border: 1px solid {DIFFICULTY_COLOR[difficultyKey] ?? '#9ca3af'}55;"
			>
				{DIFFICULTY_LABEL[difficultyKey] ?? game.difficulty}
			</span>
		{/if}

		<!-- Glass panel -->
		<div
			class="absolute inset-x-0 bottom-0 z-10 flex h-[7.2rem] flex-col gap-[0.28rem] border-t border-white/35 bg-white/18 px-4 pt-[0.85rem] pb-[0.9rem] [backdrop-filter:blur(20px)_saturate(200%)_brightness(1.1)]"
		>
			<h3
				class="m-0 animate-rise overflow-hidden text-base leading-tight font-bold text-ellipsis whitespace-nowrap text-gray-900 [animation-delay:0.04s]"
			>
				{game.name}
			</h3>

			{#if game.description}
				<p
					class="m-0 line-clamp-1 animate-rise text-[0.76rem] leading-snug text-gray-900/75 [animation-delay:0.09s]"
				>
					{game.description}
				</p>
			{/if}

			<div class="mt-auto flex animate-rise items-center justify-between [animation-delay:0.14s]">
				<span class="flex items-center gap-1.5 text-[0.73rem] text-gray-900/60">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="13"
						height="13"
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

				<span
					class="inline-block rounded-full bg-primary-500 px-[1.1rem] py-[0.4rem] text-[0.73rem] tracking-wide text-gray-900 shadow-[0_2px_8px_rgba(255,155,115,0.4)] transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-primary-400"
				>
					เล่นเลย →
				</span>
			</div>
		</div>
	</a>

	<!-- Like button -->
	{#if $authUserStore.user}
		<button
			type="button"
			onclick={handleToggleLike}
			aria-label={liked ? `ยกเลิกถูกใจเกม ${game.name}` : `ถูกใจเกม ${game.name}`}
			disabled={likeLoading}
			class="absolute top-[0.7rem] right-[0.7rem] z-20 flex items-center gap-1 rounded-full border-none bg-white/85 px-[0.55rem] py-[0.32rem] text-gray-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[color,transform] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.14] hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 {liked
				? 'text-red-500'
				: ''}"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill={liked ? 'currentColor' : 'none'}
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
				/>
			</svg>
			{#if likes > 0}
				<span class="text-[0.68rem] font-semibold text-inherit">{likes.toLocaleString()}</span>
			{/if}
		</button>
	{/if}
</div>
