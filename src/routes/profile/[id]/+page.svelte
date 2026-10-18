<script lang="ts">
	import { page } from '$app/state';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameCardSkeleton from '$lib/components/GameCardSkeleton.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import AvatarCropModal from '$lib/components/AvatarCropModal.svelte';
	import { authUserStore } from '$lib/data/stores/authUser';
	import {
		profileStore,
		profileStatsStore,
		profileUserStore,
		resetProfileStore,
		loadGames,
		loadLikedGames,
		loadProfileUser,
		uploadAvatar,
		updateAvatarCrop,
		removeAvatar,
		setActiveTab,
		logout
	} from '$lib/data/stores/profile';
	import { downscaleAvatarSource } from '$lib/utils/avatar';
	import type { IAvatarCrop } from '$lib/data/interface/user';

	const profileId = $derived(Number(page.params.id));
	// Derived so avatar/name patches to the auth store don't re-trigger the loaders below.
	const viewerUserId = $derived($authUserStore.user?.id);
	const isOwner = $derived(viewerUserId === profileId);

	const profileUser = $derived($profileUserStore.user);
	// The owner's cached session fills in while the public profile loads.
	const avatarSource = $derived(profileUser ?? (isOwner ? $authUserStore.user : null));
	const displayName = $derived(
		isOwner && $authUserStore.user
			? ($authUserStore.user.name ?? $authUserStore.user.username)
			: (profileUser?.name ?? profileUser?.username ?? null)
	);

	// ── Profile picture (owner only) ────────────────────────────────────────────
	const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
	// Re-encoded to ≤1024px before upload, so the pick limit can exceed the 5 MB server cap.
	const MAX_PICK_BYTES = 20 * 1024 * 1024;

	let fileInput = $state<HTMLInputElement>();
	let avatarMenu = $state<HTMLDivElement>();
	let avatarMenuOpen = $state(false);
	let editor = $state<{
		src: string;
		mode: 'new' | 'adjust';
		initialCrop: IAvatarCrop | null;
	} | null>(null);
	let avatarSaving = $state(false);
	let avatarError = $state('');
	let avatarNotice = $state('');

	function pickFile() {
		avatarMenuOpen = false;
		fileInput?.click();
	}

	function handleAvatarClick() {
		avatarNotice = '';
		if (avatarSource?.avatarUrl) avatarMenuOpen = !avatarMenuOpen;
		else pickFile();
	}

	function closeEditor() {
		if (editor?.mode === 'new') URL.revokeObjectURL(editor.src);
		editor = null;
		avatarError = '';
	}

	function handleFileChange(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		if (!ACCEPTED_TYPES.includes(file.type)) {
			avatarNotice = 'รองรับเฉพาะไฟล์ PNG, JPG หรือ WebP';
			return;
		}
		if (file.size > MAX_PICK_BYTES) {
			avatarNotice = 'ไฟล์ใหญ่เกินไป (สูงสุด 20 MB)';
			return;
		}
		avatarNotice = '';
		closeEditor();
		editor = { src: URL.createObjectURL(file), mode: 'new', initialCrop: null };
	}

	function adjustAvatar() {
		avatarMenuOpen = false;
		if (!avatarSource?.avatarUrl) return;
		editor = {
			src: avatarSource.avatarUrl,
			mode: 'adjust',
			initialCrop: avatarSource.avatarCrop ?? null
		};
	}

	async function saveAvatar(crop: IAvatarCrop, img: HTMLImageElement) {
		if (!editor) return;
		avatarSaving = true;
		avatarError = '';
		let err: string;
		try {
			err =
				editor.mode === 'new'
					? await uploadAvatar(await downscaleAvatarSource(img), crop)
					: await updateAvatarCrop(crop);
		} catch {
			err = 'ประมวลผลรูปไม่สำเร็จ ลองเลือกรูปอื่น';
		}
		avatarSaving = false;
		if (err) avatarError = err;
		else closeEditor();
	}

	async function deleteAvatar() {
		avatarMenuOpen = false;
		if (!confirm('ลบรูปโปรไฟล์ใช่ไหม?')) return;
		avatarNotice = await removeAvatar();
	}

	function handleWindowClick(e: MouseEvent) {
		if (avatarMenuOpen && avatarMenu && !avatarMenu.contains(e.target as Node)) {
			avatarMenuOpen = false;
		}
	}

	// ── Full-picture viewer (anyone) ────────────────────────────────────────────
	let viewerOpen = $state(false);

	function openViewer() {
		avatarMenuOpen = false;
		if (avatarSource?.avatarUrl) viewerOpen = true;
	}

	function handleWindowKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && viewerOpen) viewerOpen = false;
	}

	// Artworks this user created or helped draw (Draw Together gallery).
	interface ProfileArtwork {
		id: string;
		title: string;
		imageUrl: string;
		thumbnailUrl: string | null;
		creatorName: string;
		collaborators: number;
	}
	let artworks = $state<ProfileArtwork[]>([]);
	let artworksLoading = $state(true);

	async function loadArtworks(userId: number) {
		artworksLoading = true;
		try {
			const res = await fetch(`/api/artworks?userId=${userId}&limit=48`);
			const data = await res.json();
			artworks = res.ok && data.status === 'success' ? data.docs : [];
		} catch {
			artworks = [];
		} finally {
			artworksLoading = false;
		}
	}

	$effect(() => {
		void loadArtworks(profileId);
	});

	$effect(() => {
		void loadProfileUser(profileId);
	});

	$effect(() => {
		resetProfileStore();
		loadGames(profileId, viewerUserId);
		loadLikedGames(profileId, viewerUserId);
	});
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKey} />

<main class="min-h-screen bg-transparent">
	<div class="mx-auto max-w-6xl px-lg py-2xl">
		<!-- Profile hero -->
		<div class="mb-2xl rounded-2xl border border-primary-100/60 bg-white/85 p-xl shadow-sm">
			<div class="flex flex-col items-center gap-lg sm:flex-row sm:items-start">
				<!-- Avatar -->
				{#if isOwner}
					<div class="relative shrink-0" bind:this={avatarMenu}>
						<button
							type="button"
							onclick={handleAvatarClick}
							aria-haspopup={avatarSource?.avatarUrl ? 'menu' : undefined}
							aria-expanded={avatarSource?.avatarUrl ? avatarMenuOpen : undefined}
							aria-label="เปลี่ยนรูปโปรไฟล์"
							class="group relative block rounded-full focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							<Avatar
								url={avatarSource?.avatarUrl}
								crop={avatarSource?.avatarCrop}
								name={displayName}
								class="h-24 w-24 text-3xl shadow-sm ring-4 ring-white"
							/>
							<span
								class="pointer-events-none absolute inset-0 rounded-full transition-colors group-hover:bg-black/15"
							></span>
							<!-- Camera badge -->
							<span
								class="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-100 text-primary-600 shadow-sm transition-transform group-hover:scale-110"
								aria-hidden="true"
							>
								<svg
									viewBox="0 0 24 24"
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
									/>
									<circle cx="12" cy="13" r="3" />
								</svg>
							</span>
						</button>

						{#if avatarMenuOpen}
							<div
								role="menu"
								class="absolute top-full left-1/2 z-20 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-primary-100 bg-white py-1 text-sm shadow-lg sm:left-0 sm:translate-x-0"
							>
								<button
									type="button"
									role="menuitem"
									onclick={openViewer}
									class="block w-full px-4 py-2 text-left text-gray-700 hover:bg-primary-50"
								>
									🖼️ ดูรูปโปรไฟล์
								</button>
								<button
									type="button"
									role="menuitem"
									onclick={pickFile}
									class="block w-full px-4 py-2 text-left text-gray-700 hover:bg-primary-50"
								>
									📷 อัปโหลดรูปใหม่
								</button>
								<button
									type="button"
									role="menuitem"
									onclick={adjustAvatar}
									class="block w-full px-4 py-2 text-left text-gray-700 hover:bg-primary-50"
								>
									✂️ ปรับตำแหน่งรูป
								</button>
								<button
									type="button"
									role="menuitem"
									onclick={deleteAvatar}
									class="block w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
								>
									🗑️ ลบรูปโปรไฟล์
								</button>
							</div>
						{/if}

						<input
							bind:this={fileInput}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							class="hidden"
							onchange={handleFileChange}
						/>
					</div>
				{:else if avatarSource?.avatarUrl}
					<button
						type="button"
						onclick={openViewer}
						aria-label="ดูรูปโปรไฟล์"
						class="group relative block shrink-0 cursor-zoom-in rounded-full focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						<Avatar
							url={avatarSource.avatarUrl}
							crop={avatarSource.avatarCrop}
							name={displayName}
							class="h-24 w-24 text-3xl shadow-sm ring-4 ring-white"
						/>
						<span
							class="pointer-events-none absolute inset-0 rounded-full transition-colors group-hover:bg-black/10"
						></span>
					</button>
				{:else}
					<Avatar
						url={avatarSource?.avatarUrl}
						crop={avatarSource?.avatarCrop}
						name={displayName}
						class="h-24 w-24 text-3xl shadow-sm ring-4 ring-white"
					/>
				{/if}

				<!-- Info -->
				<div class="flex-1 text-center sm:text-left">
					{#if isOwner && $authUserStore.user}
						<h1 class="text-2xl font-bold text-gray-900">{displayName}</h1>
						<p class="mt-xs text-sm text-gray-500">@{$authUserStore.user.username}</p>
						<p class="mt-2xs text-sm text-gray-400">{$authUserStore.user.email}</p>
					{:else if profileUser}
						<h1 class="text-2xl font-bold text-gray-900">{displayName}</h1>
						<p class="mt-xs text-sm text-gray-500">@{profileUser.username}</p>
					{:else if $profileUserStore.loading}
						<div class="mx-auto h-7 w-40 animate-pulse rounded-lg bg-primary-100/70 sm:mx-0"></div>
					{:else}
						<h1 class="text-2xl font-bold text-gray-900">ผู้ใช้ #{profileId}</h1>
					{/if}
					{#if avatarNotice}
						<p class="mt-xs text-sm text-red-500">{avatarNotice}</p>
					{/if}
				</div>

				<!-- Logout (owner only) -->
				{#if isOwner}
					<div class="flex flex-col items-center gap-sm sm:items-end">
						<button
							type="button"
							onclick={logout}
							class="rounded-lg border border-red-200 px-md py-xs text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							ออกจากระบบ
						</button>
						<div class="flex items-center gap-sm text-xs text-gray-400">
							<a href="/legal/terms" class="hover:text-primary-500 hover:underline"
								>ข้อกำหนดการใช้งาน</a
							>
							<span class="text-gray-300">·</span>
							<a href="/legal/privacy" class="hover:text-primary-500 hover:underline"
								>นโยบายความเป็นส่วนตัว</a
							>
						</div>
					</div>
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
			<!-- Tabs -->
			<div class="mb-lg flex items-center justify-between gap-md">
				<div
					class="flex gap-xs rounded-xl border border-primary-100/60 bg-white/85 p-2xs shadow-sm"
				>
					<button
						type="button"
						onclick={() => setActiveTab('created')}
						class="rounded-lg px-md py-xs text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none {$profileStore.activeTab ===
						'created'
							? 'bg-primary-500 text-white shadow-sm'
							: 'text-gray-600 hover:bg-primary-50'}"
					>
						{isOwner ? 'เกมของฉัน' : 'เกมทั้งหมด'}
					</button>
					<button
						type="button"
						onclick={() => setActiveTab('liked')}
						class="rounded-lg px-md py-xs text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none {$profileStore.activeTab ===
						'liked'
							? 'bg-primary-500 text-white shadow-sm'
							: 'text-gray-600 hover:bg-primary-50'}"
					>
						เกมที่ถูกใจ
					</button>
				</div>
				{#if isOwner && $profileStore.activeTab === 'created'}
					<a
						href="/game/create"
						class="rounded-lg bg-primary-500 px-md py-xs text-sm font-medium text-white transition-colors hover:bg-primary-400 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary-600"
					>
						+ สร้างเกมใหม่
					</a>
				{/if}
			</div>

			{#if $profileStore.activeTab === 'created'}
				<p class="mb-lg text-sm text-gray-500">
					{isOwner ? 'เกมทั้งหมดที่คุณสร้าง' : `เกมที่ผู้ใช้นี้สร้าง`}
				</p>

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
			{:else}
				<p class="mb-lg text-sm text-gray-500">
					{isOwner ? 'เกมที่คุณถูกใจ' : 'เกมที่ผู้ใช้นี้ถูกใจ'}
				</p>

				{#if $profileStore.likedLoading}
					<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
						{#each { length: 6 } as _}
							<GameCardSkeleton />
						{/each}
					</div>
				{:else if $profileStore.likedGames.length === 0}
					<div
						class="flex flex-col items-center gap-md rounded-2xl border border-primary-100/60 bg-white/85 py-2xl text-center shadow-sm"
					>
						<span class="text-5xl">💗</span>
						<p class="text-gray-700">
							{isOwner ? 'คุณยังไม่ได้ถูกใจเกมไหนเลย' : 'ผู้ใช้นี้ยังไม่ได้ถูกใจเกมไหนเลย'}
						</p>
					</div>
				{:else}
					<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
						{#each $profileStore.likedGames as game (game.id)}
							<GameCard {game} confirmUnlike />
						{/each}
					</div>
				{/if}
			{/if}
		</section>

		<!-- Draw Together gallery -->
		<section class="mt-2xl">
			<div class="mb-lg flex items-center justify-between gap-md">
				<h2 class="text-lg font-semibold text-gray-900">
					{isOwner ? 'แกลเลอรีของฉัน' : 'แกลเลอรีผลงาน'}
				</h2>
				{#if isOwner}
					<a
						href="/game/draw"
						class="rounded-lg bg-primary-500 px-md py-xs text-sm font-medium text-white transition-colors hover:bg-primary-400 active:bg-primary-600"
					>
						🎨 ไปวาดด้วยกัน
					</a>
				{/if}
			</div>
			<p class="mb-lg text-sm text-gray-500">
				{isOwner
					? 'ผลงานที่คุณเผยแพร่หรือร่วมวาดใน “วาดรูปด้วยกัน”'
					: 'ผลงานที่ผู้ใช้นี้เผยแพร่หรือร่วมวาด'}
			</p>

			{#if artworksLoading}
				<div class="grid grid-cols-2 gap-lg md:grid-cols-3 lg:grid-cols-4">
					{#each Array(4) as _, i (i)}
						<div class="aspect-[4/3] animate-pulse rounded-2xl bg-white/60"></div>
					{/each}
				</div>
			{:else if artworks.length === 0}
				<div
					class="flex flex-col items-center gap-sm rounded-2xl border border-primary-100/60 bg-white/85 py-2xl text-center"
				>
					<span class="text-5xl">🎨</span>
					<p class="text-gray-700">
						{isOwner ? 'คุณยังไม่มีผลงานในแกลเลอรี' : 'ผู้ใช้นี้ยังไม่มีผลงานในแกลเลอรี'}
					</p>
				</div>
			{:else}
				<ul class="grid grid-cols-2 gap-lg md:grid-cols-3 lg:grid-cols-4">
					{#each artworks as art (art.id)}
						<li>
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
										{art.collaborators > 1
											? `${art.creatorName} + ${art.collaborators - 1} คน`
											: art.creatorName}
									</p>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</main>

{#if editor}
	<AvatarCropModal
		src={editor.src}
		initialCrop={editor.initialCrop}
		title={editor.mode === 'new' ? 'ตั้งรูปโปรไฟล์' : 'ปรับตำแหน่งรูปโปรไฟล์'}
		saving={avatarSaving}
		error={avatarError}
		onSave={saveAvatar}
		onCancel={closeEditor}
		onPickNew={pickFile}
	/>
{/if}

{#if viewerOpen && avatarSource?.avatarUrl}
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="รูปโปรไฟล์"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && (viewerOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (viewerOpen = false)}
	>
		<button
			type="button"
			onclick={() => (viewerOpen = false)}
			aria-label="ปิด"
			class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
		>
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
				<path d="M18 6 6 18M6 6l12 12" />
			</svg>
		</button>
		<figure class="flex max-h-full flex-col items-center gap-3">
			<img
				src={avatarSource.avatarUrl}
				alt={`รูปโปรไฟล์ของ ${displayName ?? ''}`}
				class="max-h-[80vh] max-w-[min(90vw,48rem)] rounded-2xl object-contain shadow-2xl"
			/>
			{#if displayName}
				<figcaption class="text-sm font-medium text-white/90">{displayName}</figcaption>
			{/if}
		</figure>
	</div>
{/if}
