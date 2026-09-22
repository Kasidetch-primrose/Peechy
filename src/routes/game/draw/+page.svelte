<script lang="ts">
	// ── Draw Together room create/join screen — commented out while
	// realtime-server (Railway) is offline. To restore: uncomment this whole
	// block and swap the placeholder markup below back to the original form
	// (also commented out, right after this script tag). See memory:
	// peechy-multiplayer-temporarily-disabled for the full picture.

	/*
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import { connect, createRoom, joinRoom, drawingStore } from '$lib/data/stores/drawing';
	import { DRAW_RATIO_OPTIONS, DRAW_RATIO_VALUE, type DrawRatio } from '$lib/data/interface/drawing';
	import { getGuestId, saveGuestName, type PlayerIdentity } from '$lib/utils/guest-identity';
	import GuestNameModal from '$lib/components/GuestNameModal.svelte';

	let ratio = $state<DrawRatio>('4:3');
	let joinCode = $state('');
	let creating = $state(false);
	let joining = $state(false);

	let showGuestModal = $state(false);
	let pendingAction: ((identity: PlayerIdentity) => Promise<void>) | null = null;

	// Logged-in users go straight through; guests are always asked for a
	// nickname first (same behaviour as the guess-game join flow).
	async function withIdentity(action: (identity: PlayerIdentity) => Promise<void>) {
		const user = $authUserStore.user;
		if (user) {
			await action({ id: String(user.id), name: user.username });
			return;
		}
		pendingAction = action;
		showGuestModal = true;
	}

	function handleGuestConfirm(name: string) {
		saveGuestName(name);
		const action = pendingAction;
		pendingAction = null;
		void action?.({ id: getGuestId(), name });
	}

	function handleCreate() {
		return withIdentity(async (identity) => {
			creating = true;
			connect(identity.id, identity.name);
			const code = await createRoom(ratio);
			creating = false;
			if (code) goto(`/game/draw/${code}`);
		});
	}

	function handleJoin() {
		const code = joinCode.trim();
		if (code.length !== 5) return;
		return withIdentity(async (identity) => {
			joining = true;
			connect(identity.id, identity.name);
			const ok = await joinRoom(code);
			joining = false;
			if (ok) goto(`/game/draw/${code}`);
		});
	}
	*/
</script>

<!-- Original create/join room UI — commented out below, replaced by the
     "coming soon" placeholder further down while the realtime-server
     backend is offline.

<div
	class="flex min-h-screen flex-col items-center gap-8 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 px-4 py-16"
>
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-3xl font-bold text-primary-600">🎨 วาดรูปด้วยกัน</h1>
		<p class=" text-sm text-gray-500">
			ชวนเพื่อนมาวาดรูปบนกระดาษเดียวกันแบบเรียลไทม์ สร้างห้องแล้วส่งรหัสให้เพื่อนเข้าร่วมได้เลย
		</p>
	</div>

	{#if $drawingStore.error}
		<p class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{$drawingStore.error}</p>
	{/if}

	<div class="flex w-full max-w-[36rem] flex-col gap-5">
		<div class="flex flex-col gap-3 rounded-2xl border border-primary-100 bg-white/80 p-4 shadow-sm">
			<div class="flex items-baseline justify-between">
				<span class="text-sm font-semibold text-gray-700">ขนาดกระดาษ</span>
				<span class="text-[11px] text-gray-400">เลือกแล้วล็อกตลอดห้อง ทุกคนเห็นสัดส่วนเดียวกัน</span>
			</div>
			<div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="ขนาดกระดาษ">
				{#each DRAW_RATIO_OPTIONS as option (option.value)}
					<button
						type="button"
						role="radio"
						aria-checked={ratio === option.value}
						onclick={() => (ratio = option.value)}
						class="flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 transition-colors {ratio === option.value
							? 'border-primary-500 bg-primary-100/60'
							: 'border-gray-200 bg-white hover:border-primary-300'}"
					>
						<span class="flex h-10 items-center justify-center">
							<span
								class="block rounded-sm border-2 {ratio === option.value
									? 'border-primary-500 bg-white'
									: 'border-gray-300 bg-gray-50'}"
								style="aspect-ratio: {DRAW_RATIO_VALUE[option.value]}; height: {DRAW_RATIO_VALUE[option.value] > 1
									? 'auto'
									: '100%'}; width: {DRAW_RATIO_VALUE[option.value] > 1 ? '2.5rem' : 'auto'};"
							></span>
						</span>
						<span class="text-xs font-semibold text-gray-700">{option.label}</span>
						<span class="text-[10px] leading-tight text-gray-400">{option.hint}</span>
					</button>
				{/each}
			</div>
		</div>

		<button
			type="button"
			onclick={handleCreate}
			disabled={creating}
			class="rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
		>
			{creating ? 'กำลังสร้างห้อง...' : '+ สร้างห้องใหม่'}
		</button>

		<div class="flex items-center gap-3 text-xs text-gray-400">
			<div class="h-px flex-1 bg-gray-200"></div>
			หรือ
			<div class="h-px flex-1 bg-gray-200"></div>
		</div>

		<div class="flex items-center overflow-hidden rounded-xl border border-primary-300 bg-white">
			<input
				type="text"
				bind:value={joinCode}
				maxlength="5"
				inputmode="numeric"
				placeholder="กรอกรหัสห้อง 5 หลัก"
				class="w-full bg-transparent px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
				onkeydown={(e) => e.key === 'Enter' && handleJoin()}
			/>
			<button
				type="button"
				onclick={handleJoin}
				disabled={joining || joinCode.trim().length !== 5}
				class="bg-primary-500 px-4 py-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
			>
				{joining ? '...' : 'เข้าร่วม'}
			</button>
		</div>
	</div>
</div>

<GuestNameModal
	bind:open={showGuestModal}
	onConfirm={handleGuestConfirm}
	onCancel={() => {
		showGuestModal = false;
		pendingAction = null;
	}}
/>
-->

<div
	class="flex min-h-screen flex-col items-center justify-center gap-4 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 px-4 py-16 text-center"
>
	<span class="text-5xl">🚧</span>
	<h1 class="text-2xl font-bold text-primary-600">🎨 วาดรูปด้วยกัน</h1>
	<p class="max-w-[20rem] text-sm text-gray-500">ฟีเจอร์นี้อยู่ระหว่างการพัฒนา จะพร้อมใช้งานเร็วๆ นี้</p>
	<a
		href="/"
		class="mt-2 rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-400"
	>
		กลับหน้าหลัก
	</a>
</div>
