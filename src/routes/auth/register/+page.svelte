<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthService from '$lib/data/services/auth';

	let name = $state('');
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirm = $state(false);
	let loading = $state(false);
	let error = $state('');

	const passwordsMatch = $derived(confirmPassword === '' || password === confirmPassword);
	const passwordStrength = $derived.by(() => {
		if (password.length === 0) return 0;
		let score = 0;
		if (password.length >= 8) score++;
		if (/[A-Z]/.test(password)) score++;
		if (/[0-9]/.test(password)) score++;
		if (/[^A-Za-z0-9]/.test(password)) score++;
		return score;
	});

	const strengthLabel = $derived(
		passwordStrength === 0
			? ''
			: passwordStrength === 1
				? 'อ่อน'
				: passwordStrength === 2
					? 'พอใช้'
					: passwordStrength === 3
						? 'ดี'
						: 'แข็งแกร่ง'
	);
	const strengthColor = $derived(
		passwordStrength <= 1
			? 'bg-red-400'
			: passwordStrength === 2
				? 'bg-yellow-400'
				: passwordStrength === 3
					? 'bg-blue-400'
					: 'bg-green-400'
	);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (password !== confirmPassword) {
			error = 'รหัสผ่านไม่ตรงกัน';
			return;
		}
		if (password.length < 6) {
			error = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
			return;
		}
		error = '';
		loading = true;
		const result = await AuthService.register(
			username.trim(),
			email.trim(),
			password,
			name.trim() || undefined
		);
		loading = false;
		if (result.status === 'success') {
			goto(`/auth/otp?email=${encodeURIComponent(email.trim())}`);
		} else {
			error = result.message ?? 'สมัครสมาชิกไม่สำเร็จ';
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
	<div class="w-full max-w-200">
		<!-- Brand -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-2xl shadow-sm"
			>
				🎮
			</div>
			<h1 class="text-2xl font-bold text-gray-900">สร้างบัญชีใหม่</h1>
			<p class="mt-1 text-sm text-gray-500">เข้าร่วม Peechy และเริ่มเล่นเกม</p>
		</div>

		<!-- Card -->
		<div class="rounded-2xl bg-white p-8 shadow-sm">
			<form onsubmit={handleSubmit} class="flex flex-col gap-4">
				<!-- Name -->
				<div class="flex flex-col gap-1.5">
					<label for="name" class="text-sm font-medium text-gray-700">
						ชื่อที่แสดง <span class="font-normal text-gray-400">(ไม่บังคับ)</span>
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="เช่น สมชาย"
						autocomplete="name"
						class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
					/>
				</div>

				<!-- Username -->
				<div class="flex flex-col gap-1.5">
					<label for="username" class="text-sm font-medium text-gray-700">
						ชื่อผู้ใช้ <span class="text-red-500">*</span>
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						placeholder="เช่น somchai99"
						required
						autocomplete="username"
						class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
					/>
				</div>

				<!-- Email -->
				<div class="flex flex-col gap-1.5">
					<label for="email" class="text-sm font-medium text-gray-700">
						อีเมล <span class="text-red-500">*</span>
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						required
						autocomplete="email"
						class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
					/>
				</div>

				<!-- Password -->
				<div class="flex flex-col gap-1.5">
					<label for="password" class="text-sm font-medium text-gray-700">
						รหัสผ่าน <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="อย่างน้อย 6 ตัวอักษร"
							required
							autocomplete="new-password"
							class="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
							class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							{#if showPassword}
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
									<path
										d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
									/>
									<line x1="1" y1="1" x2="23" y2="23" />
								</svg>
							{:else}
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
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							{/if}
						</button>
					</div>
					<!-- Strength bar -->
					{#if password.length > 0}
						<div class="flex items-center gap-2 pt-0.5">
							<div class="flex flex-1 gap-1">
								{#each [1, 2, 3, 4] as step}
									<div
										class="h-1 flex-1 rounded-full transition-colors {passwordStrength >= step
											? strengthColor
											: 'bg-gray-200'}"
									></div>
								{/each}
							</div>
							<span class="text-xs text-gray-500">{strengthLabel}</span>
						</div>
					{/if}
				</div>

				<!-- Confirm Password -->
				<div class="flex flex-col gap-1.5">
					<label for="confirm" class="text-sm font-medium text-gray-700">
						ยืนยันรหัสผ่าน <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<input
							id="confirm"
							type={showConfirm ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="ยืนยันรหัสผ่านอีกครั้ง"
							required
							autocomplete="new-password"
							class="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-primary-100 {!passwordsMatch
								? 'border-red-300 focus:border-red-400'
								: 'border-gray-200 focus:border-primary-400'}"
						/>
						<button
							type="button"
							onclick={() => (showConfirm = !showConfirm)}
							aria-label={showConfirm ? 'ซ่อน' : 'แสดง'}
							class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							{#if showConfirm}
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
									<path
										d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
									/>
									<line x1="1" y1="1" x2="23" y2="23" />
								</svg>
							{:else}
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
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							{/if}
						</button>
					</div>
					{#if !passwordsMatch}
						<p class="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
					{/if}
				</div>

				<!-- Error -->
				{#if error}
					<p class="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
				{/if}

				<!-- Submit -->
				<button
					type="submit"
					disabled={loading || !passwordsMatch}
					class="mt-1 w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 active:bg-primary-600 disabled:opacity-60"
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
							กำลังสมัครสมาชิก...
						</span>
					{:else}
						สมัครสมาชิก
					{/if}
				</button>
			</form>
		</div>

		<!-- Footer link -->
		<p class="mt-5 text-center text-sm text-gray-500">
			มีบัญชีอยู่แล้ว?
			<a
				href="/auth/login"
				class="font-medium text-primary-500 hover:text-primary-600 hover:underline"
			>
				เข้าสู่ระบบ
			</a>
		</p>
	</div>
</div>
