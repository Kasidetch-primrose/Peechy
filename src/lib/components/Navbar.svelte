<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let mobileMenuOpen = $state(false);

	const navLinks = [
		{ href: '/', label: 'หน้าหลัก' },
		{ href: '/demo/auth/dashboard', label: 'แดชบอร์ด' },
		{ href: '/game/create', label: 'สร้างเกม' }
	];
</script>

<header class="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-lg py-sm">
		<!-- ! Logo -->
		<a
			href="/"
			class="flex items-center gap-sm text-xl font-bold text-primary-500
                   focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
		>
			<img src={favicon} alt="Peechy logo" class="h-8 w-8" />
			Peechy 🍑
		</a>

		<!-- ! Desktop links -->
		<ul class="hidden items-center gap-lg md:flex" role="list">
			{#each navLinks as link}
				<li>
					<a
						href={link.href}
						class="rounded-sm text-sm font-medium text-gray-700 transition-colors
                               hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>

		<!-- ! Desktop CTA -->
		<div class="hidden items-center gap-sm md:flex">
			<a
				href="/demo/auth/login"
				class="rounded-lg border border-primary-500 px-md py-xs text-sm font-medium text-primary-500
                       transition-colors hover:bg-primary-100
                       focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
			>
				เข้าสู่ระบบ
			</a>
			<a
				href="/demo/auth/register"
				class="rounded-lg bg-primary-500 px-md py-xs text-sm font-medium text-white
                       transition-colors hover:bg-primary-400 focus-visible:ring-2
                       focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary-600"
			>
				สมัครสมาชิก
			</a>
		</div>

		<!-- ! Mobile hamburger -->
		<button
			class="flex items-center justify-center rounded-md p-xs text-gray-700 hover:bg-gray-100
                   focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none md:hidden"
			onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			aria-label="Toggle menu"
			aria-expanded={mobileMenuOpen}
		>
			{#if mobileMenuOpen}
				<!-- ! X icon -->
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
				<!-- ! Hamburger icon -->
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

	<!-- ! Mobile menu -->
	{#if mobileMenuOpen}
		<div class="border-t border-gray-200 bg-white px-lg py-md md:hidden">
			<ul class="flex flex-col gap-md" role="list">
				{#each navLinks as link}
					<li>
						<a
							href={link.href}
							class="block text-sm font-medium text-gray-700 hover:text-primary-500"
							onclick={() => (mobileMenuOpen = false)}
						>
							{link.label}
						</a>
					</li>
				{/each}
				<li class="flex flex-col gap-sm border-t border-gray-200 pt-md">
					<a
						href="/demo/auth/login"
						class="rounded-lg border border-primary-500 px-md py-sm text-center text-sm font-medium text-primary-500 hover:bg-primary-100"
						onclick={() => (mobileMenuOpen = false)}
					>
						เข้าสู่ระบบ
					</a>
					<a
						href="/demo/auth/register"
						class="rounded-lg bg-primary-500 px-md py-sm text-center text-sm font-medium text-white hover:bg-primary-400"
						onclick={() => (mobileMenuOpen = false)}
					>
						สมัครสมาชิก
					</a>
				</li>
			</ul>
		</div>
	{/if}
</header>
