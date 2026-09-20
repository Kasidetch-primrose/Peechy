<script lang="ts">
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import {
		multiplayerStore,
		connect,
		joinRoom,
		startGame,
		leaveRoom
	} from '$lib/data/stores/multiplayer';
	import { getGuestId, saveGuestName } from '$lib/utils/guest-identity';
	import GuestNameModal from '$lib/components/GuestNameModal.svelte';

	const code = $derived(page.params.code ?? '');
	const selfId = $derived($multiplayerStore.selfId);
	const isHost = $derived($multiplayerStore.room?.hostId === selfId);

	let showGuestModal = $state(false);

	// Tracks which room code we've already issued a join for, so this effect
	// only fires once per code. It deliberately does NOT read $multiplayerStore
	// — joinRoom() writes to that store, and reading it here would re-trigger
	// this same effect on every write, spinning up a new socket connection
	// each time until the browser runs out of connections.
	let joinedCode = $state('');

	$effect(() => {
		if (joinedCode === code) return;

		// Already connected this session (e.g. just confirmed a nickname on
		// the navbar/create-room flow seconds ago) — reuse that connection
		// instead of prompting again. Read via get() (not $multiplayerStore)
		// so this effect isn't re-triggered by every store write joinRoom()
		// makes — see the joinedCode comment above.
		if (get(multiplayerStore).selfId) {
			joinedCode = code;
			joinRoom(code);
			return;
		}

		const user = $authUserStore.user;
		if (user) {
			joinedCode = code;
			connect(String(user.id), user.username);
			joinRoom(code);
			return;
		}

		// Guests always get prompted for a nickname when landing here fresh
		// (e.g. opening a shared invite link directly).
		showGuestModal = true;
	});

	function handleGuestConfirm(name: string) {
		saveGuestName(name);
		showGuestModal = false;
		joinedCode = code;
		connect(getGuestId(), name);
		joinRoom(code);
	}

	$effect(() => {
		if ($multiplayerStore.room?.status === 'playing') {
			goto(`/game/multiplayer/play/${code}`);
		}
	});

	function handleLeave() {
		leaveRoom();
		goto('/');
	}
</script>

{#if !$multiplayerStore.room && !$multiplayerStore.error}
	<div class="flex min-h-screen items-center justify-center">
		<span class="text-sm text-gray-400">กำลังเข้าร่วมห้อง...</span>
	</div>
{:else}
<div
	class="flex min-h-screen flex-col items-center gap-6 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 px-4 py-10"
>
	<div class="flex flex-col items-center gap-1">
		<span class="text-xs font-medium text-gray-400">รหัสห้อง</span>
		<span class="rounded-2xl bg-white/80 px-8 py-3 text-4xl font-bold tracking-widest text-primary-500 shadow-sm">
			{code}
		</span>
		<span class="mt-1 text-xs text-gray-400">ส่งรหัสนี้ให้เพื่อนเพื่อเข้าร่วม</span>
	</div>

	{#if $multiplayerStore.error}
		<p class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{$multiplayerStore.error}</p>
	{/if}

	<div class="w-full max-w-[36rem] rounded-2xl border border-primary-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
		<h2 class="mb-3 text-sm font-semibold text-gray-700">
			ผู้เล่นในห้อง ({$multiplayerStore.players.length})
		</h2>
		<ul class="flex flex-col gap-2">
			{#each $multiplayerStore.players as player (player.id)}
				<li class="flex items-center justify-between rounded-xl bg-primary-100/40 px-3 py-2">
					<span class="flex items-center gap-2 text-sm font-medium text-gray-800">
						<span class="h-2 w-2 rounded-full {player.connected ? 'bg-success' : 'bg-gray-300'}"
						></span>
						{player.name}
						{#if player.id === $multiplayerStore.room?.hostId}
							<span class="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-semibold text-white"
								>หัวห้อง</span
							>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	</div>

	<div class="flex w-full max-w-[36rem] flex-col gap-3">
		{#if isHost}
			<button
				type="button"
				onclick={() => startGame(code)}
				disabled={$multiplayerStore.players.length < 2}
				class="rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
			>
				{$multiplayerStore.players.length < 2 ? 'รอผู้เล่นอีกอย่างน้อย 1 คน' : '▶ เริ่มเกม'}
			</button>
		{:else}
			<p class="text-center text-sm text-gray-400">รอหัวห้องเริ่มเกม...</p>
		{/if}

		<button
			type="button"
			onclick={handleLeave}
			class="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
		>
			ออกจากห้อง
		</button>
	</div>
</div>
{/if}

<GuestNameModal
	bind:open={showGuestModal}
	onConfirm={handleGuestConfirm}
	onCancel={() => goto('/')}
/>
