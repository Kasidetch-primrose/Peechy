<script lang="ts">
	import { goto } from '$app/navigation';
	import logo from '$lib/assets/logo.png';
	import AuthService from '$lib/data/services/auth';
	import { authUserStore } from '$lib/data/stores/authUser';
	import { connect, joinRoom } from '$lib/data/stores/multiplayer';

	let mobileMenuOpen = $state(false);
	let joinCode = $state('');
	let joining = $state(false);

	async function handleJoinRoom() {
		const code = joinCode.trim();
		if (code.length !== 5) return;
		const user = $authUserStore.user;
		if (!user) {
			goto('/auth/login');
			return;
		}
		joining = true;
		connect(String(user.id), user.username);
		const ok = await joinRoom(code);
		joining = false;
		if (ok) {
			joinCode = '';
			mobileMenuOpen = false;
			goto(`/game/multiplayer/lobby/${code}`);
		}
	}

	const navLinks = [
		{ href: '/', label: 'หน้าหลัก' },
		{ href: '/game/create', label: 'สร้างเกม' },
		{ href: '/game/draw', label: 'วาดรูปด้วยกัน' }
	];

	async function handleLogout() {
		const { user, accessToken } = $authUserStore;

		if (user) {
			await AuthService.logout(user.id, accessToken);
		}

		authUserStore.set({ accessToken: '', refreshToken: '', user: null });
		mobileMenuOpen = false;
		goto('/auth/login');
	}
</script>

<header
	class="sticky top-0 z-50 border-b border-primary-200/60 bg-primary-100/80 shadow-sm shadow-primary-200/40 backdrop-blur-md"
>
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-lg py-sm">
		<!-- Logo -->
		<a
			href="/"
			class="flex items-center gap-sm text-xl font-bold text-primary-500
                   focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
		>
			<img src={logo} alt="Peechy logo" class="h-8 w-8 object-contain" />
			Peechy 🍑
		</a>

		<!-- Desktop links -->
		<ul class="hidden items-center gap-sm md:flex" role="list">
			{#each navLinks as link}
				<li>
					<a
						href={link.href}
						class="rounded-full px-sm py-xs text-sm font-medium text-gray-700 transition-colors
                               hover:bg-primary-100 hover:text-primary-500
                               focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>

		<!-- Desktop CTA -->
		<div class="hidden items-center gap-sm md:flex">
			<!-- Join multiplayer room by code -->
			<div class="flex items-center overflow-hidden rounded-full border border-primary-300 bg-white">
				<input
					type="text"
					bind:value={joinCode}
					maxlength="5"
					inputmode="numeric"
					placeholder="รหัสห้อง"
					class="w-24 bg-transparent px-3 py-1.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
					onkeydown={(e) => e.key === 'Enter' && handleJoinRoom()}
				/>
				<button
					type="button"
					onclick={handleJoinRoom}
					disabled={joining || joinCode.trim().length !== 5}
					class="flex items-center justify-center bg-primary-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
				>
					{#if joining}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
						</svg>
					{:else}
						เข้าร่วม
					{/if}
				</button>
			</div>
			{#if $authUserStore.user}
				<div class="flex items-center gap-3">
					<a
						href={`/profile/${$authUserStore.user.id}`}
						class="flex items-center gap-2 rounded-full border border-primary-300 bg-primary-100 px-3 py-1.5 text-sm text-primary-600
                               hover:bg-primary-200 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						<span class="h-2 w-2 rounded-full bg-primary-500"></span>
						<span class="font-medium">{$authUserStore.user.username}</span>
					</a>
					<button
						type="button"
						onclick={handleLogout}
						class="rounded-full border border-red-200 px-md py-xs text-sm font-medium text-red-500 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						ออกจากระบบ
					</button>
				</div>
			{:else}
				<a
					href="/auth/login"
					class="rounded-full border border-primary-500 px-md py-xs text-sm font-medium text-primary-500
                       transition-colors hover:bg-primary-100
                       focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					เข้าสู่ระบบ
				</a>
				<a
					href="/auth/register"
					class="rounded-full bg-primary-500 px-md py-xs text-sm font-medium text-white
                       transition-colors hover:bg-primary-400 focus-visible:ring-2
                       focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary-600"
				>
					สมัครสมาชิก
				</a>
			{/if}
		</div>

		<!-- Mobile hamburger -->
		<button
			class="flex items-center justify-center rounded-full p-xs text-primary-500 transition-colors
                   hover:bg-primary-100 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none md:hidden"
			onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			aria-label="Toggle menu"
			aria-expanded={mobileMenuOpen}
		>
			{#if mobileMenuOpen}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line
						x1="3"
						y1="18"
						x2="21"
						y2="18"
					/>
				</svg>
			{/if}
		</button>
	</nav>

	<!-- Mobile menu -->
	{#if mobileMenuOpen}
		<div class="border-t border-primary-200/60 bg-primary-100/90 px-lg py-md backdrop-blur-md md:hidden">
			<ul class="flex flex-col gap-md" role="list">
				{#each navLinks as link}
					<li>
						<a
							href={link.href}
							class="block rounded-full px-sm py-xs text-sm font-medium text-gray-700 hover:bg-primary-100 hover:text-primary-500"
							onclick={() => (mobileMenuOpen = false)}
						>
							{link.label}
						</a>
					</li>
				{/each}
				<li>
					<div class="flex items-center overflow-hidden rounded-full border border-primary-300 bg-white">
						<input
							type="text"
							bind:value={joinCode}
							maxlength="5"
							inputmode="numeric"
							placeholder="รหัสห้อง"
							class="w-full bg-transparent px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400"
							onkeydown={(e) => e.key === 'Enter' && handleJoinRoom()}
						/>
						<button
							type="button"
							onclick={handleJoinRoom}
							disabled={joining || joinCode.trim().length !== 5}
							class="flex items-center justify-center bg-primary-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
						>
							{#if joining}
								<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
								</svg>
							{:else}
								เข้าร่วม
							{/if}
						</button>
					</div>
				</li>
				<li class="border-t border-primary-200/50 pt-md">
					{#if $authUserStore.user}
						<div class="flex flex-col gap-2">
							<div
								class="flex items-center gap-2 rounded-2xl border border-primary-300 bg-primary-100 px-4 py-3 text-sm text-primary-600"
							>
								<span class="h-2 w-2 rounded-full bg-primary-500"></span>
								<span class="font-medium">@{$authUserStore.user.username}</span>
							</div>
							<button
								type="button"
								onclick={handleLogout}
								class="rounded-full border border-red-200 px-md py-sm text-center text-sm font-medium text-red-500 hover:bg-red-50"
							>
								ออกจากระบบ
							</button>
						</div>
					{:else}
						<div class="flex flex-col gap-sm">
							<a
								href="/auth/login"
								class="rounded-full border border-primary-500 px-md py-sm text-center text-sm font-medium text-primary-500 hover:bg-primary-100"
								onclick={() => (mobileMenuOpen = false)}
							>
								เข้าสู่ระบบ
							</a>
							<a
								href="/auth/register"
								class="rounded-full bg-primary-500 px-md py-sm text-center text-sm font-medium text-white hover:bg-primary-400"
								onclick={() => (mobileMenuOpen = false)}
							>
								สมัครสมาชิก
							</a>
						</div>
					{/if}
				</li>
			</ul>
		</div>
	{/if}
</header>
