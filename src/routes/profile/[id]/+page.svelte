<script lang="ts">
	import { page } from '$app/state';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameCardSkeleton from '$lib/components/GameCardSkeleton.svelte';
	import { authUserStore } from '$lib/data/stores/authUser';
	import {
		profileStore,
		profileInitialsStore,
		profileStatsStore,
		resetProfileStore,
		loadGames,
		logout
	} from '$lib/data/stores/profile';

	const profileId = $derived(Number(page.params.id));
	const isOwner = $derived($authUserStore.user?.id === profileId);

	$effect(() => {
		resetProfileStore();
		loadGames(profileId);
	});
</script>

<main class="min-h-screen bg-transparent">
	<div class="mx-auto max-w-6xl px-lg py-2xl">
		<!-- Profile hero -->
		<div class="mb-2xl rounded-2xl border border-primary-100/60 bg-white/85 p-xl shadow-sm">
			<div class="flex flex-col items-center gap-lg sm:flex-row sm:items-start">
				<!-- Avatar -->
				<div
					class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-500 text-2xl font-bold text-white shadow-sm"
				>
					{#if isOwner}
						{$profileInitialsStore}
					{:else}
						{profileId}
					{/if}
				</div>

				<!-- Info -->
				<div class="flex-1 text-center sm:text-left">
					{#if isOwner && $authUserStore.user}
						<h1 class="text-2xl font-bold text-gray-900">
							{$authUserStore.user.name ?? $authUserStore.user.username}
						</h1>
						<p class="mt-xs text-sm text-gray-500">@{$authUserStore.user.username}</p>
						<p class="mt-2xs text-sm text-gray-400">{$authUserStore.user.email}</p>
					{:else}
						<h1 class="text-2xl font-bold text-gray-900">ผู้ใช้ #{profileId}</h1>
					{/if}
				</div>

				<!-- Logout (owner only) -->
				{#if isOwner}
					<button
						type="button"
						onclick={logout}
						class="rounded-lg border border-red-200 px-md py-xs text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						ออกจากระบบ
					</button>
				{/if}
			</div>

			<!-- Stats -->
			<div class="mt-lg grid grid-cols-3 gap-md border-t border-primary-100/60 pt-lg">
				<div class="text-center">
					<p class="text-2xl font-bold text-primary-500">{$profileStore.games.length}</p>
					<p class="mt-2xs text-xs text-gray-500">เกมที่สร้าง</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-primary-500">
						{$profileStatsStore.totalPlays.toLocaleString()}
					</p>
					<p class="mt-2xs text-xs text-gray-500">ครั้งที่ถูกเล่น</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-primary-500">
						{$profileStatsStore.totalLikes.toLocaleString()}
					</p>
					<p class="mt-2xs text-xs text-gray-500">ถูกใจทั้งหมด</p>
				</div>
			</div>
		</div>

		<!-- Games section -->
		<section>
			<div class="mb-lg flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">
						{isOwner ? 'เกมของฉัน' : 'เกมทั้งหมด'}
					</h2>
					<p class="mt-xs text-sm text-gray-500">
						{isOwner ? 'เกมทั้งหมดที่คุณสร้าง' : `เกมที่ผู้ใช้นี้สร้าง`}
					</p>
				</div>
				{#if isOwner}
					<a
						href="/game/create"
						class="rounded-lg bg-primary-500 px-md py-xs text-sm font-medium text-white transition-colors hover:bg-primary-400 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary-600"
					>
						+ สร้างเกมใหม่
					</a>
				{/if}
			</div>

			{#if $profileStore.loading}
				<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
					{#each { length: 6 } as _}
						<GameCardSkeleton />
					{/each}
				</div>
			{:else if $profileStore.games.length === 0}
				<div
					class="flex flex-col items-center gap-md rounded-2xl border border-primary-100/60 bg-white/85 py-2xl text-center shadow-sm"
				>
					<span class="text-5xl">🎮</span>
					<p class="text-gray-700">{isOwner ? 'คุณยังไม่มีเกม' : 'ผู้ใช้นี้ยังไม่มีเกม'}</p>
					{#if isOwner}
						<a
							href="/game/create"
							class="rounded-lg bg-primary-500 px-lg py-sm text-sm font-medium text-white hover:bg-primary-400"
						>
							สร้างเกมแรกของคุณ
						</a>
					{/if}
				</div>
			{:else}
				<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
					{#each $profileStore.games as game (game.id)}
						<GameCard {game} />
					{/each}
				</div>
			{/if}
		</section>
	</div>
</main>
