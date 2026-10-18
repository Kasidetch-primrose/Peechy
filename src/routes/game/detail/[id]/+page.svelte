<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		gameDetailStore,
		isCreatorStore,
		loadGame,
		resetGameDetailStore,
		deleteGame,
		difficultyLabel,
		difficultyBg
	} from '$lib/data/stores/game-detail';
	import { authUserStore } from '$lib/data/stores/authUser';
	import Avatar from '$lib/components/Avatar.svelte';
	// ── "เล่นหลายคน" (create multiplayer room) logic — commented out while
	// realtime-server (Railway) is offline. To restore: uncomment this import
	// block, the state + functions block below, and swap the disabled button +
	// toast markup back to the original modal-opening button and modal (see
	// matching comments further down). See memory:
	// peechy-multiplayer-temporarily-disabled for the full picture.
	// import { connect, createRoom } from '$lib/data/stores/multiplayer';
	// import type { TurnDuration } from '$lib/data/interface/multiplayer';
	// import { saveGuestName, getGuestId, type PlayerIdentity } from '$lib/utils/guest-identity';
	// import GuestNameModal from '$lib/components/GuestNameModal.svelte';

	let confirmDelete = $state(false);
	let deleting = $state(false);
	let deleteError = $state('');

	// let showMultiplayerModal = $state(false);
	// let turnDuration = $state<TurnDuration>(30);
	// let creatingRoom = $state(false);
	// let createRoomError = $state('');
	// let showGuestModal = $state(false);

	// async function proceedCreateRoom(identity: PlayerIdentity) {
	// 	const id = $gameDetailStore.game?.id;
	// 	if (!id) return;
	// 	creatingRoom = true;
	// 	createRoomError = '';
	// 	connect(identity.id, identity.name);
	// 	const code = await createRoom(id, turnDuration);
	// 	creatingRoom = false;
	// 	if (!code) {
	// 		createRoomError = 'สร้างห้องไม่สำเร็จ ลองอีกครั้ง';
	// 		return;
	// 	}
	// 	goto(`/game/multiplayer/lobby/${code}`);
	// }

	// async function handleCreateRoom() {
	// 	const user = $authUserStore.user;
	// 	if (user) {
	// 		await proceedCreateRoom({ id: String(user.id), name: user.username });
	// 		return;
	// 	}
	// 	// Guests are always prompted for a nickname, even if they've played before.
	// 	showGuestModal = true;
	// }

	// function handleGuestConfirm(name: string) {
	// 	saveGuestName(name);
	// 	proceedCreateRoom({ id: getGuestId(), name });
	// }

	// Multiplayer backend is offline (Railway trial expired) — "เล่นหลายคน"
	// just surfaces this message instead of opening the room-creation modal.
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function showComingSoonToast() {
		toast = '🚧 ฟีเจอร์นี้อยู่ระหว่างการพัฒนา จะพร้อมใช้งานเร็วๆ นี้';
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 2500);
	}

	async function handleDelete() {
		const id = $gameDetailStore.game?.id;
		if (!id) return;
		deleting = true;
		deleteError = '';
		const result = await deleteGame(id);
		deleting = false;
		if (result.ok) {
			goto('/');
		} else {
			deleteError = result.error ?? 'เกิดข้อผิดพลาด';
		}
	}

	$effect(() => {
		const id = Number(page.params.id);
		loadGame(id);
		return () => resetGameDetailStore();
	});

	// Fill exactly the viewport space below the sticky navbar, no page scroll.
	let availableHeight = $state('100vh');

	function updateAvailableHeight() {
		const header = document.querySelector('header');
		const top = header ? header.getBoundingClientRect().bottom : 0;
		availableHeight = `calc(100vh - ${top}px)`;
	}

	$effect(() => {
		updateAvailableHeight();
		window.addEventListener('resize', updateAvailableHeight);
		return () => window.removeEventListener('resize', updateAvailableHeight);
	});
</script>

{#if $gameDetailStore.loading}
	<!-- Skeleton mirroring the detail layout -->
	<div style="height: {availableHeight}" class="overflow-hidden bg-transparent" aria-busy="true">
		<div class="mx-auto flex h-full max-w-4xl flex-col gap-4 px-4 py-4">
			<div class="h-5 w-20 animate-pulse rounded-md bg-primary-200/60"></div>
			<div class="flex gap-4">
				<div class="h-28 w-40 shrink-0 animate-pulse rounded-2xl bg-primary-200/60"></div>
				<div class="flex flex-1 flex-col gap-2">
					<div class="h-7 w-2/3 animate-pulse rounded-md bg-primary-200/60"></div>
					<div class="h-4 w-full animate-pulse rounded-md bg-primary-200/60"></div>
					<div class="h-4 w-4/5 animate-pulse rounded-md bg-primary-200/60"></div>
					<div class="mt-1 h-9 w-32 animate-pulse rounded-full bg-primary-200/60"></div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each { length: 6 } as _}
					<div class="aspect-[4/3] animate-pulse rounded-2xl bg-primary-200/60"></div>
				{/each}
			</div>
		</div>
	</div>
{:else if $gameDetailStore.error}
	<div
		style="height: {availableHeight}"
		class="flex flex-col items-center justify-center gap-4 bg-transparent"
	>
		<span class="text-5xl">😕</span>
		<p class="text-base font-medium text-gray-700">{$gameDetailStore.error}</p>
		<button
			onclick={() => goto('/')}
			class="rounded-xl bg-primary-500 px-5 py-2 text-sm font-medium text-white hover:bg-primary-400"
		>
			ย้อนกลับ
		</button>
	</div>
{:else if $gameDetailStore.game}
	{@const game = $gameDetailStore.game}
	{@const images = $gameDetailStore.images}
	<div style="height: {availableHeight}" class="overflow-hidden bg-transparent">
		<!-- ! ── Hero ──────────────────────────────────────────────────────────── -->
		<!-- <div class="border-b border-primary-100/40 bg-white/70 shadow-sm backdrop-blur-sm"> -->
		<div class="mx-auto flex h-full max-w-4xl flex-col px-4 py-4">
			<!-- ! Back + actions row -->
			<div class="mb-3 flex shrink-0 items-center justify-between">
				<button
					onclick={() => goto('/')}
					class="flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-primary-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
					ย้อนกลับ
				</button>

				{#if $isCreatorStore}
					<div class="flex items-center gap-2">
						<a
							href="/game/create?id={game.id}"
							class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-600"
						>
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
							>
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
									d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
								/>
							</svg>
							แก้ไขเกม
						</a>
						<button
							onclick={() => {
								confirmDelete = true;
								deleteError = '';
							}}
							class="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:border-red-400 hover:bg-red-50"
						>
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
							>
								<polyline points="3 6 5 6 21 6" /><path
									d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
								/><path d="M10 11v6" /><path d="M14 11v6" /><path
									d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
								/>
							</svg>
							ลบเกม
						</button>
					</div>
				{/if}
			</div>

			<!-- ! Thumbnail -->
			{#if game.thumbnailUrl}
				<div class="mb-3 max-h-1/2 flex-1 self-center overflow-hidden rounded-2xl shadow-sm">
					<img src={game.thumbnailUrl} alt={game.name} class="h-full w-auto object-contain" />
				</div>
			{/if}

			<!-- ! Title + badges -->
			<div class="flex shrink-0 flex-col gap-2">
				<div class="flex flex-wrap items-start gap-2">
					<h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">{game.name}</h1>
				</div>

				<!-- ! Creator (skipped for games made by guests) -->
				{#if game.creatorUsername}
					<div class="flex min-w-0 items-center gap-2 text-sm text-gray-500">
						โดย
						<a
							href={`/profile/${game.creatorId}`}
							title={game.creatorUsername}
							class="inline-flex min-w-0 items-center gap-2 rounded-full border border-primary-200 bg-white/70 py-1 pr-3 pl-1 font-medium text-gray-700 shadow-sm transition-colors hover:border-primary-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							<Avatar
								url={game.creatorAvatarUrl}
								crop={game.creatorAvatarCrop}
								name={game.creatorUsername.charAt(0)}
								class="h-6 w-6 text-xs"
							/>
							<span class="truncate">{game.creatorUsername}</span>
						</a>
					</div>
				{/if}

				<div class="flex flex-wrap items-center gap-2">
					{#if game.difficulty}
						<span
							class="rounded-full px-3 py-0.5 text-xs font-semibold {difficultyBg[
								game.difficulty
							] ?? 'bg-gray-200 text-gray-700'}"
						>
							{difficultyLabel[game.difficulty] ?? game.difficulty}
						</span>
					{/if}

					<span
						class="flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium {game.isPublic
							? 'bg-secondary-green/20 text-secondary-green'
							: 'bg-gray-200 text-gray-500'}"
					>
						{#if game.isPublic}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="11"
								height="11"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path
									d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
								/>
							</svg>
							สาธารณะ
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="11"
								height="11"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path
									d="M7 11V7a5 5 0 0 1 10 0v4"
								/>
							</svg>
							ส่วนตัว
						{/if}
					</span>

					<span class="text-xs text-gray-400">
						{images.length} รูป
					</span>
				</div>

				{#if game.description}
					<p class="line-clamp-2 text-sm leading-relaxed wrap-break-word text-gray-600">
						{game.description}
					</p>
				{/if}
			</div>

			<!-- ! Stats row -->
			<div class="mt-3 flex shrink-0 flex-wrap gap-5 border-t border-gray-100 pt-3">
				<div class="flex items-center gap-1.5 text-sm text-gray-500">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
						/>
					</svg>
					{(game.likes ?? 0).toLocaleString()} ถูกใจ
				</div>
				<div class="flex items-center gap-1.5 text-sm text-gray-500">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					{(game.playCount ?? 0).toLocaleString()} ครั้งที่เล่น
				</div>
				<div class="flex items-center gap-1.5 text-sm text-gray-500">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
							x1="16"
							y1="2"
							x2="16"
							y2="6"
						/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					{new Date(game.createdAt).toLocaleDateString('th-TH', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})}
				</div>
			</div>

			<!-- ! Play buttons -->
			<div class="mt-3 flex shrink-0 flex-wrap gap-3">
				<button
					onclick={() => goto(`/game/play/${game!.id}`)}
					disabled={images.length === 0}
					class="rounded-xl bg-primary-500 px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
				>
					{images.length === 0 ? 'ยังไม่มีรูปภาพ' : '▶ เริ่มเล่น'}
				</button>
				<!-- Original "เล่นหลายคน" button opened showMultiplayerModal — commented
				     out below, replaced by the disabled/toast version while the
				     realtime-server backend is offline.
				<button
					onclick={() => {
						showMultiplayerModal = true;
						createRoomError = '';
					}}
					disabled={images.length === 0}
					class="rounded-xl bg-secondary-lavender px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
				>
					👥 เล่นหลายคน
				</button>
				-->
				<button
					onclick={showComingSoonToast}
					class="rounded-xl bg-secondary-lavender/50 px-8 py-3 text-base font-semibold text-white/80 shadow-sm transition-colors hover:brightness-95 active:scale-95"
				>
					👥 เล่นหลายคน
				</button>
			</div>
		</div>
		<!-- </div> -->
	</div>
{/if}

<!-- Multiplayer room creation modal — commented out while realtime-server is
     offline. Restore by uncommenting this block along with the state/logic
     and the original button above.
{#if showMultiplayerModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-4 w-full max-w-[36rem] rounded-2xl bg-white p-6 shadow-xl">
			<h3 class="text-base font-semibold text-gray-900">สร้างห้องเล่นหลายคน</h3>
			<p class="mt-1 text-sm text-gray-500">เลือกเวลาต่อตา แล้วระบบจะสร้างรหัสห้อง 5 หลักให้</p>

			<div class="mt-4 flex gap-2">
				{#each [15, 30, 60] as const as sec}
					<button
						type="button"
						onclick={() => (turnDuration = sec)}
						class="flex-1 rounded-xl border py-2 text-sm font-medium transition-colors {turnDuration ===
						sec
							? 'border-primary-500 bg-primary-500 text-white'
							: 'border-gray-200 text-gray-600 hover:border-primary-300'}"
					>
						{sec}s
					</button>
				{/each}
			</div>

			{#if createRoomError}
				<p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createRoomError}</p>
			{/if}

			<div class="mt-5 flex gap-3">
				<button
					onclick={() => (showMultiplayerModal = false)}
					disabled={creatingRoom}
					class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
				>
					ยกเลิก
				</button>
				<button
					onclick={handleCreateRoom}
					disabled={creatingRoom}
					class="flex-1 rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-400 disabled:opacity-50"
				>
					{creatingRoom ? 'กำลังสร้าง...' : 'สร้างห้อง'}
				</button>
			</div>
		</div>
	</div>
{/if}
-->

<!-- Delete confirmation modal -->
{#if confirmDelete}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-4 w-full max-w-[36rem] rounded-2xl bg-white p-6 shadow-xl">
			<h3 class="text-base font-semibold text-gray-900">ยืนยันการลบเกม</h3>
			<p class="mt-2 text-sm text-gray-500">
				เกม <span class="font-medium text-gray-800">{$gameDetailStore.game?.name}</span>
				จะถูกลบอย่างถาวร คุณแน่ใจหรือไม่?
			</p>

			{#if deleteError}
				<p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>
			{/if}

			<div class="mt-5 flex gap-3">
				<button
					onclick={() => {
						confirmDelete = false;
						deleteError = '';
					}}
					disabled={deleting}
					class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
				>
					ยกเลิก
				</button>
				<button
					onclick={handleDelete}
					disabled={deleting}
					class="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
				>
					{deleting ? 'กำลังลบ...' : 'ลบเกม'}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if toast}
	<div
		class="pointer-events-none fixed top-20 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-gray-900/90 px-4 py-3 text-center text-sm text-white shadow-xl"
		role="status"
	>
		{toast}
	</div>
{/if}

<!-- Original guest-nickname modal for room creation — commented out with the
     rest of the multiplayer logic above.
<GuestNameModal
	bind:open={showGuestModal}
	onConfirm={handleGuestConfirm}
	onCancel={() => (showGuestModal = false)}
/>
-->
