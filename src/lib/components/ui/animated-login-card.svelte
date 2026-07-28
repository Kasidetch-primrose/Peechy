<script lang="ts">
	/**
	 * Presentational login card: floating-label inputs, password reveal,
	 * and an ambient particle background.
	 * Auth logic (submit handling, error state) stays in the parent page.
	 */
	let {
		email = $bindable(''),
		password = $bindable(''),
		rememberMe = $bindable(false),
		showPassword = $bindable(false),
		loading = false,
		error = '',
		onsubmit
	}: {
		email?: string;
		password?: string;
		rememberMe?: boolean;
		showPassword?: boolean;
		loading?: boolean;
		error?: string;
		onsubmit: (e: SubmitEvent) => void;
	} = $props();

	let isEmailFocused = $state(false);
	let isPasswordFocused = $state(false);
	let isEmailValid = $state(true);
	let canvasEl: HTMLCanvasElement;

	function createParticle(width: number, height: number) {
		return {
			x: Math.random() * width,
			y: Math.random() * height,
			size: Math.random() * 2.5 + 1,
			speedX: (Math.random() - 0.5) * 0.3,
			speedY: (Math.random() - 0.5) * 0.3
		};
	}

	const emailPattern =
		/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

	function handleEmailInput() {
		isEmailValid = email ? emailPattern.test(email) : true;
	}

	const emailLabelClasses = $derived(
		isEmailFocused || email
			? 'top-[0.3rem] text-[0.7rem] text-primary-600'
			: 'top-[0.85rem] text-sm text-gray-400'
	);
	const passwordLabelClasses = $derived(
		isPasswordFocused || password
			? 'top-[0.3rem] text-[0.7rem] text-primary-600'
			: 'top-[0.85rem] text-sm text-gray-400'
	);

	// Ambient particle background, scoped to this card's canvas only.
	$effect(() => {
		const ctx = canvasEl?.getContext('2d');
		if (!ctx) return;

		let raf = 0;
		let width = 0;
		let height = 0;

		function resize() {
			const rect = canvasEl.getBoundingClientRect();
			width = canvasEl.width = rect.width;
			height = canvasEl.height = rect.height;
		}

		resize();
		const particles = Array.from(
			{ length: Math.min(60, Math.floor((width * height) / 12000)) },
			() => createParticle(width, height)
		);

		function animate() {
			ctx!.fillStyle = 'rgba(232,124,90,0.18)';
			ctx!.clearRect(0, 0, width, height);
			for (const p of particles) {
				p.x += p.speedX;
				p.y += p.speedY;
				if (p.x > width) p.x = 0;
				if (p.x < 0) p.x = width;
				if (p.y > height) p.y = 0;
				if (p.y < 0) p.y = height;

				ctx!.beginPath();
				ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx!.fill();
			}
			raf = requestAnimationFrame(animate);
		}
		animate();

		window.addEventListener('resize', resize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<div
	class="relative overflow-hidden rounded-2xl border-2 border-primary-200/60 bg-primary-50/90 shadow-md shadow-primary-200/30 backdrop-blur-sm"
>
	<canvas
		bind:this={canvasEl}
		class="pointer-events-none absolute inset-0 h-full w-full"
		aria-hidden="true"
	></canvas>

	<div class="relative z-10 p-8">
		<form class="flex flex-col gap-5" {onsubmit}>
			<!-- Email -->
			<div class="relative">
				<input
					type="email"
					id="animated-email"
					bind:value={email}
					oninput={handleEmailInput}
					onfocus={() => (isEmailFocused = true)}
					onblur={() => (isEmailFocused = false)}
					required
					autocomplete="email"
					class="w-full rounded-lg border {!isEmailValid && email
						? 'border-error'
						: 'border-gray-200'} bg-white/70 px-4 pt-[1.15rem] pr-10 pb-[0.4rem] text-sm text-gray-900 backdrop-blur-sm transition-colors outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
				/>
				<label
					for="animated-email"
					class="pointer-events-none absolute left-4 transition-all duration-150 {emailLabelClasses}"
				>
					อีเมล
				</label>
				{#if !isEmailValid && email}
					<span class="mt-1 block text-xs text-error">กรุณากรอกอีเมลให้ถูกต้อง</span>
				{/if}
			</div>

			<!-- Password -->
			<div class="relative">
				<input
					type={showPassword ? 'text' : 'password'}
					id="animated-password"
					bind:value={password}
					onfocus={() => (isPasswordFocused = true)}
					onblur={() => (isPasswordFocused = false)}
					required
					autocomplete="current-password"
					class="w-full rounded-lg border border-gray-200 bg-white/70 px-4 pt-[1.15rem] pr-10 pb-[0.4rem] text-sm text-gray-900 backdrop-blur-sm transition-colors outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
				/>
				<label
					for="animated-password"
					class="pointer-events-none absolute left-4 transition-all duration-150 {passwordLabelClasses}"
				>
					รหัสผ่าน
				</label>
				<button
					type="button"
					class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
					onclick={() => (showPassword = !showPassword)}
					aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
				>
					{#if showPassword}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
							/>
							<line x1="1" y1="1" x2="23" y2="23" />
						</svg>
					{:else}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					{/if}
				</button>
			</div>

			<div class="flex items-center justify-between">
				<label class="flex cursor-pointer items-center gap-1 text-sm text-gray-700">
					<input type="checkbox" bind:checked={rememberMe} class="rounded-sm accent-primary-500" />
					<span>จดจำฉัน</span>
				</label>
				<a
					href="/auth/forget-password"
					class="text-xs text-primary-500 hover:text-primary-600 hover:underline"
				>
					ลืมรหัสผ่าน?
				</a>
			</div>

			{#if error}
				<p class="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="mt-0.5 w-full rounded-full bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 active:bg-primary-600 disabled:opacity-60"
			>
				{#if loading}
					<span class="flex items-center justify-center gap-2">
						<svg
							class="h-4 w-4 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						กำลังเข้าสู่ระบบ...
					</span>
				{:else}
					เข้าสู่ระบบ
				{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-gray-700">
			ยังไม่มีบัญชี?
			<a
				href="/auth/register"
				class="font-medium text-primary-500 hover:text-primary-600 hover:underline"
			>
				สมัครสมาชิก
			</a>
		</p>
	</div>
</div>
