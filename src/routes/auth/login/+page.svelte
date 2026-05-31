<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthService from '$lib/data/services/auth';
	import { authUserStore } from '$lib/data/stores/authUser';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		const result = await AuthService.login(email, password);
		loading = false;
		if (result.status === 'success') {
			authUserStore.set({
				accessToken: result.accessToken,
				refreshToken: result.refreshToken,
				user: result.user
			});
			goto('/');
		} else {
			error = result.message ?? 'เข้าสู่ระบบไม่สำเร็จ';
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-transparent px-4 py-12">
	<div class="game-enter w-full max-w-200">
		<!-- Brand -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-2xl shadow-sm"
			>
				🎮
			</div>
			<h1 class="text-2xl font-bold text-gray-900">ยินดีต้อนรับกลับ</h1>
			<p class="mt-1 text-sm text-gray-500">เข้าสู่ระบบเพื่อเล่นและสร้างเกม</p>
		</div>

		<!-- Card -->
		<div
			class="rounded-2xl border border-primary-100/60 bg-white/80 p-8 shadow-md backdrop-blur-sm"
		>
			<form onsubmit={handleSubmit} class="flex flex-col gap-5">
				<!-- Email -->
				<div class="flex flex-col gap-1.5">
					<label for="email" class="text-sm font-medium text-gray-700">อีเมล</label>
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
					<div class="flex items-center justify-between">
						<label for="password" class="text-sm font-medium text-gray-700">รหัสผ่าน</label>
						<a
							href="/auth/forget-password"
							class="text-xs text-primary-500 hover:text-primary-600 hover:underline"
						>
							ลืมรหัสผ่าน?
						</a>
					</div>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="••••••••"
							required
							autocomplete="current-password"
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
				</div>

				<!-- Error -->
				{#if error}
					<p class="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
				{/if}

				<!-- Submit -->
				<button
					type="submit"
					disabled={loading}
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
							กำลังเข้าสู่ระบบ...
						</span>
					{:else}
						เข้าสู่ระบบ
					{/if}
				</button>
			</form>
		</div>

		<!-- Footer link -->
		<p class="mt-5 text-center text-sm text-gray-500">
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
