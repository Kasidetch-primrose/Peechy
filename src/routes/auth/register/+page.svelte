<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthService from '$lib/data/services/auth';
	import AnimatedCardShell from '$lib/components/ui/animated-card-shell.svelte';
	import SocialLoginButtons from '$lib/components/ui/social-login-buttons.svelte';
	import FloatingInput from '$lib/components/ui/floating-input.svelte';
	import FloatingPasswordInput from '$lib/components/ui/floating-password-input.svelte';

	let name = $state('');
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let acceptedTerms = $state(false);
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
		if (!acceptedTerms) {
			error = 'กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว';
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

<div class="flex min-h-screen items-center justify-center bg-transparent px-4 py-12">
	<div class="animate-game-enter w-full max-w-[36rem]">
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
		<AnimatedCardShell>
			<form onsubmit={handleSubmit} class="flex flex-col gap-4">
				<!-- Name -->
				<FloatingInput
					id="name"
					label="ชื่อที่แสดง (ไม่บังคับ)"
					bind:value={name}
					autocomplete="name"
				/>

				<!-- Username -->
				<FloatingInput
					id="username"
					label="ชื่อผู้ใช้ *"
					bind:value={username}
					required
					autocomplete="username"
				/>

				<!-- Email -->
				<FloatingInput
					id="email"
					label="อีเมล *"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
				/>

				<!-- Password -->
				<div class="flex flex-col gap-1.5">
					<FloatingPasswordInput
						id="password"
						label="รหัสผ่าน *"
						bind:value={password}
						required
						autocomplete="new-password"
					/>
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
					<FloatingPasswordInput
						id="confirm"
						label="ยืนยันรหัสผ่าน *"
						bind:value={confirmPassword}
						required
						autocomplete="new-password"
						invalid={!passwordsMatch}
					/>
					{#if !passwordsMatch}
						<p class="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
					{/if}
				</div>

				<!-- Terms & Privacy -->
				<label class="flex items-start gap-2.5 text-sm text-gray-600">
					<input
						type="checkbox"
						bind:checked={acceptedTerms}
						class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-500 focus-visible:ring-2 focus-visible:ring-focus"
					/>
					<span>
						ฉันยอมรับ
						<a href="/legal/terms" target="_blank" class="font-medium text-primary-500 hover:underline">
							ข้อกำหนดการใช้งาน
						</a>
						และ
						<a href="/legal/privacy" target="_blank" class="font-medium text-primary-500 hover:underline">
							นโยบายความเป็นส่วนตัว
						</a>
					</span>
				</label>

				<!-- Error -->
				{#if error}
					<p class="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
				{/if}

				<!-- Submit -->
				<button
					type="submit"
					disabled={loading || !passwordsMatch || !acceptedTerms}
					class="mt-1 w-full rounded-full bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 active:bg-primary-600 disabled:opacity-60"
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
		</AnimatedCardShell>

		<!-- Social register -->
		<SocialLoginButtons dividerLabel="หรือสมัครด้วย" verb="สมัครด้วย" />

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
