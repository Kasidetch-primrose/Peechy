<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import AuthService from '$lib/data/services/auth';

	const email = $derived(page.url.searchParams.get('email') ?? '');

	let digits = $state(['', '', '', '', '', '']);
	let inputRefs: HTMLInputElement[] = [];
	let loading = $state(false);
	let resendLoading = $state(false);
	let error = $state('');
	let resendMessage = $state('');

	const otp = $derived(digits.join(''));
	const isFilled = $derived(digits.every((d) => d !== ''));

	function handleInput(idx: number, e: Event) {
		const val = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
		digits[idx] = val;
		if (val && idx < 5) inputRefs[idx + 1]?.focus();
	}

	function handleKeydown(idx: number, e: KeyboardEvent) {
		if (e.key === 'Backspace') {
			if (digits[idx]) {
				digits[idx] = '';
			} else if (idx > 0) {
				inputRefs[idx - 1]?.focus();
			}
		} else if (e.key === 'ArrowLeft' && idx > 0) {
			inputRefs[idx - 1]?.focus();
		} else if (e.key === 'ArrowRight' && idx < 5) {
			inputRefs[idx + 1]?.focus();
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasted = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
		for (let i = 0; i < 6; i++) {
			digits[i] = pasted[i] ?? '';
		}
		const focusIdx = Math.min(pasted.length, 5);
		inputRefs[focusIdx]?.focus();
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isFilled) {
			error = 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก';
			return;
		}
		error = '';
		loading = true;
		const result = await AuthService.verifyOtp(email, otp);
		loading = false;
		if (result.status === 'success') {
			goto('/auth/login');
		} else {
			error = result.message ?? 'รหัส OTP ไม่ถูกต้อง';
			digits = ['', '', '', '', '', ''];
			inputRefs[0]?.focus();
		}
	}

	async function handleResend() {
		resendMessage = '';
		error = '';
		resendLoading = true;
		const result = await AuthService.resendOtp(email);
		resendLoading = false;
		if (result.status === 'success') {
			resendMessage = 'ส่งรหัส OTP ใหม่แล้ว กรุณาตรวจสอบอีเมลของคุณ';
		} else {
			error = result.message ?? 'ไม่สามารถส่ง OTP ใหม่ได้';
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
				✉️
			</div>
			<h1 class="text-2xl font-bold text-gray-900">ยืนยันอีเมล</h1>
			<p class="mt-1 text-sm text-gray-500">
				ส่งรหัส 6 หลักไปที่
				{#if email}
					<span class="font-medium text-gray-700">{email}</span>
				{:else}
					อีเมลของคุณ
				{/if}
			</p>
		</div>

		<!-- Card -->
		<div class="rounded-2xl bg-white p-8 shadow-sm">
			<form onsubmit={handleSubmit} class="flex flex-col gap-6">
				<!-- 6-digit boxes -->
				<div class="flex justify-center gap-3">
					{#each digits as digit, idx}
						<input
							bind:this={inputRefs[idx]}
							type="text"
							inputmode="numeric"
							maxlength={1}
							value={digit}
							oninput={(e) => handleInput(idx, e)}
							onkeydown={(e) => handleKeydown(idx, e)}
							onpaste={handlePaste}
							aria-label={`หลักที่ ${idx + 1}`}
							class="h-14 w-12 rounded-xl border-2 text-center text-xl font-bold text-gray-900 transition-colors outline-none placeholder:text-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 {digit
								? 'border-primary-400 bg-primary-100/40'
								: 'border-gray-200 bg-gray-50'}"
						/>
					{/each}
				</div>

				<!-- Error -->
				{#if error}
					<p class="rounded-lg bg-red-50 px-4 py-2.5 text-center text-sm text-red-600">{error}</p>
				{/if}

				<!-- Resend success -->
				{#if resendMessage}
					<p class="rounded-lg bg-green-50 px-4 py-2.5 text-center text-sm text-green-700">
						{resendMessage}
					</p>
				{/if}

				<!-- Submit -->
				<button
					type="submit"
					disabled={loading || !isFilled}
					class="w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 active:bg-primary-600 disabled:opacity-60"
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
							กำลังตรวจสอบ...
						</span>
					{:else}
						ยืนยัน OTP
					{/if}
				</button>
			</form>

			<!-- Divider -->
			<div class="my-5 border-t border-gray-100"></div>

			<!-- Resend -->
			<p class="text-center text-sm text-gray-500">
				ไม่ได้รับรหัส?
				<button
					type="button"
					onclick={handleResend}
					disabled={resendLoading}
					class="font-medium text-primary-500 hover:text-primary-600 hover:underline disabled:opacity-60"
				>
					{resendLoading ? 'กำลังส่ง...' : 'ส่งรหัสใหม่'}
				</button>
			</p>
		</div>

		<!-- Back link -->
		<p class="mt-5 text-center text-sm text-gray-500">
			<a
				href="/auth/register"
				class="font-medium text-primary-500 hover:text-primary-600 hover:underline"
			>
				← กลับไปหน้าสมัครสมาชิก
			</a>
		</p>
	</div>
</div>
