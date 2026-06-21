<script lang="ts">
	import { goto } from '$app/navigation';
	import { multiplayerStore, resetMultiplayerStore } from '$lib/data/stores/multiplayer';

	const sortedPlayers = $derived(
		[...$multiplayerStore.players].sort((a, b) => b.score - a.score)
	);

	function handleExit() {
		resetMultiplayerStore();
		goto('/');
	}
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center gap-6 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 px-4"
>
	<div class="flex flex-col items-center gap-2">
		<span class="text-6xl">🏆</span>
		<h1 class="text-3xl font-bold">จบเกมแล้ว!</h1>
	</div>

	<div class="w-full max-w-[36rem] rounded-2xl border border-primary-100 bg-white/80 p-5 shadow-md backdrop-blur-sm">
		<ul class="flex flex-col gap-2">
			{#each sortedPlayers as player, i (player.id)}
				<li
					class="flex items-center justify-between rounded-xl px-4 py-3 {i === 0
						? 'bg-primary-500 text-white'
						: 'bg-primary-100/40 text-gray-800'}"
				>
					<span class="flex items-center gap-2 font-medium">
						<span class="text-sm">#{i + 1}</span>
						{player.name}
						{#if i === 0}🏆{/if}
					</span>
					<span class="font-bold">{player.score}</span>
				</li>
			{/each}
		</ul>
	</div>

	<button
		type="button"
		onclick={handleExit}
		class="rounded-xl bg-primary-500 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600"
	>
		กลับหน้าหลัก
	</button>
</div>
