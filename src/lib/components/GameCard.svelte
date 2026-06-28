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
		'linear-gradient(135deg, #A8F0E0 0%, #D4B8FF 100%)',
	];
	const EMOJIS = ['🎮', '🧩', '⚡', '🃏', '🏆', '📝', '🌍', '🎯', '🔥', '💡'];

	const DIFFICULTY_LABEL: Record<string, string> = {
		easy: 'ง่าย',
		medium: 'ปานกลาง',
		hard: 'ยาก',
	};
	const DIFFICULTY_COLOR: Record<string, string> = {
		easy: '#6BCB77',
		medium: '#FFD166',
		hard: '#FF6B6B',
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

<div class="card-root">
	<a
		href={`/game/detail/${game.id}`}
		class="card"
		aria-label={`เปิดรายละเอียดเกม ${game.name}`}
	>
		<!-- Full-bleed cover -->
		<div class="cover">
			{#if game.thumbnailUrl}
				<img src={game.thumbnailUrl} alt={game.name} class="cover-img" />
			{:else}
				<div class="cover-fallback" style="background: {coverGradient};">
					<span class="cover-emoji">{emoji}</span>
				</div>
			{/if}
		</div>

		<!-- Soft edge-fade just above the glass panel -->
		<div class="fade-edge"></div>

		<!-- Difficulty badge -->
		{#if game.difficulty}
			<span
				class="badge"
				style="background: {DIFFICULTY_COLOR[difficultyKey] ?? '#9ca3af'}22; color: {DIFFICULTY_COLOR[difficultyKey] ?? '#6b7280'}; border: 1px solid {DIFFICULTY_COLOR[difficultyKey] ?? '#9ca3af'}55;"
			>
				{DIFFICULTY_LABEL[difficultyKey] ?? game.difficulty}
			</span>
		{/if}

		<!-- Glass panel -->
		<div class="glass-panel">
			<h3 class="game-name">{game.name}</h3>

			{#if game.description}
				<p class="game-desc">{game.description}</p>
			{/if}

			<div class="footer">
				<span class="play-count">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
						fill="none" stroke="currentColor" stroke-width="2"
						stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					{game.playCount?.toLocaleString() ?? 0} ผู้เล่น
				</span>

				<span class="play-btn">เล่นเลย →</span>
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
			class="like-btn {liked ? 'liked' : ''}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
				fill={liked ? 'currentColor' : 'none'}
				stroke="currentColor" stroke-width="2"
				stroke-linecap="round" stroke-linejoin="round">
				<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
			</svg>
			{#if likes > 0}
				<span class="like-count">{likes.toLocaleString()}</span>
			{/if}
		</button>
	{/if}
</div>

<style>
	.card-root {
		position: relative;
		display: block;
	}

	/* ── Card ─────────────────────────────────────────────────────────────── */
	.card {
		display: block;
		position: relative;
		width: 100%;
		height: 19rem;
		border-radius: 1.5rem;
		overflow: hidden;
		cursor: pointer;
		text-decoration: none;
		box-shadow:
			0 4px 16px -2px rgba(255, 155, 115, 0.18),
			0 1px 4px rgba(0,0,0,0.06);
		transform: translateY(0) scale(1);
		transition:
			transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.35s ease;
		will-change: transform;
	}

	.card:hover {
		transform: translateY(-6px) scale(1.02);
		box-shadow:
			0 20px 40px -8px rgba(255, 155, 115, 0.3),
			0 4px 12px rgba(0,0,0,0.08);
	}

	/* ── Cover ────────────────────────────────────────────────────────────── */
	.cover {
		position: absolute;
		inset: 0; /* full bleed — glass panel blurs what's underneath */
		overflow: hidden;
	}

	.cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scale(1);
		transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.card:hover .cover-img {
		transform: scale(1.08);
	}

	.cover-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: scale(1);
		transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.card:hover .cover-fallback {
		transform: scale(1.08);
	}

	.cover-emoji {
		font-size: 3.5rem;
		filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));
	}

	/* Soft dark gradient above the glass panel for text legibility */
	.fade-edge {
		position: absolute;
		left: 0; right: 0;
		bottom: 7.2rem;
		height: 4rem;
		background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.28) 100%);
		z-index: 1;
	}

	/* ── Difficulty badge ─────────────────────────────────────────────────── */
	.badge {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 10;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		backdrop-filter: blur(6px);
	}

	/* ── Glass panel ──────────────────────────────────────────────────────── */
	.glass-panel {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		height: 7.2rem;
		z-index: 10;
		padding: 0.85rem 1rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.28rem;

		/* frosted glass */
		background: rgba(255, 255, 255, 0.18);
		backdrop-filter: blur(20px) saturate(200%) brightness(1.1);
		-webkit-backdrop-filter: blur(20px) saturate(200%) brightness(1.1);
		border-top: 1px solid rgba(255,255,255,0.35);
	}

	.game-name {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		line-height: 1.25;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		animation: rise 0.45s cubic-bezier(0.34, 1.2, 0.64, 1) both;
		animation-delay: 0.04s;
	}

	.game-desc {
		font-size: 0.76rem;
		color: rgba(255,255,255,0.75);
		line-height: 1.4;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		animation: rise 0.45s cubic-bezier(0.34, 1.2, 0.64, 1) both;
		animation-delay: 0.09s;
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		animation: rise 0.45s cubic-bezier(0.34, 1.2, 0.64, 1) both;
		animation-delay: 0.14s;
	}

	.play-count {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.73rem;
		color: rgba(255,255,255,0.6);
	}

	.play-btn {
		padding: 0.4rem 1.1rem;
		border-radius: 9999px;
		background: #FF9B73;
		color: #fff;
		font-size: 0.73rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		transition: background 0.2s ease, transform 0.15s ease;
		display: inline-block;
		box-shadow: 0 2px 8px rgba(255, 155, 115, 0.4);
	}

	.card:hover .play-btn {
		background: #FFB199;
		transform: scale(1.05);
	}

	/* ── Like button ──────────────────────────────────────────────────────── */
	.like-btn {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.32rem 0.55rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.85);
		backdrop-filter: blur(8px);
		border: none;
		cursor: pointer;
		color: #9ca3af;
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		transition: color 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.like-btn:hover {
		transform: scale(1.14);
		color: #ef4444;
	}

	.like-btn.liked { color: #ef4444; }

	.like-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.like-count {
		font-size: 0.68rem;
		font-weight: 600;
		color: inherit;
	}

	/* ── Entrance ─────────────────────────────────────────────────────────── */
	@keyframes rise {
		from { opacity: 0; transform: translateY(10px); filter: blur(3px); }
		to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
	}
</style>
