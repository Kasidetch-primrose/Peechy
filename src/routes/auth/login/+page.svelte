<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AuthService from '$lib/data/services/auth';
	import { authUserStore } from '$lib/data/stores/authUser';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let loading = $state(false);

	const oauthErrorMessages: Record<string, string> = {
		oauth_cancelled: 'ยกเลิกการเข้าสู่ระบบด้วย Social',
		oauth_invalid_state: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
		oauth_failed: 'เข้าสู่ระบบด้วย Social ไม่สำเร็จ กรุณาลองใหม่',
		no_ticket: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
	};

	let error = $state(oauthErrorMessages[$page.url.searchParams.get('error') ?? ''] ?? '');

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
	<div class="game-enter w-full max-w-[36rem]">
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
			class="rounded-2xl border-2 border-primary-200/60 bg-primary-50/90 p-8 shadow-md shadow-primary-200/30 backdrop-blur-sm"
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

		<!-- todo: facebook & google login -->
		<!-- Divider -->
		<!-- <div class="mt-5 flex items-center gap-3">
			<div class="h-px flex-1 bg-gray-200"></div>
			<span class="text-xs text-gray-400">หรือเข้าสู่ระบบด้วย</span>
			<div class="h-px flex-1 bg-gray-200"></div>
		</div> -->

		<!-- Social login -->
		<!-- <div class="mt-3 flex flex-col gap-2.5">
			<a
				href="/api/auth/oauth/google"
				class="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
					<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
					<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
					<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
					<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
				</svg>
				เข้าสู่ระบบด้วย Google
			</a>

			<a
				href="/api/auth/oauth/facebook"
				class="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
					<path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
				</svg>
				เข้าสู่ระบบด้วย Facebook
			</a>
		</div> -->

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
