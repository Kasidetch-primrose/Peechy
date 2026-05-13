<script lang="ts">
	import { page } from '$app/stores';
	import { otpStore, handleVerifyOtp, handleResendOtp } from '$lib/data/stores/otp';

	const email = $page.url.searchParams.get('email') ?? '';
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-150 w-full rounded-2xl bg-white p-8 shadow-md">
		<h1 class="mb-2 text-2xl font-bold text-gray-800">Verify your email</h1>
		<p class="mb-6 text-sm text-gray-500">
			Enter the 6-digit code sent to <span class="font-medium text-gray-700">{email}</span>
		</p>

		<form onsubmit={(e) => handleVerifyOtp(e, email)} class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label for="otp" class="text-sm font-medium text-gray-600">OTP Code</label>
				<input
					id="otp"
					type="text"
					bind:value={$otpStore.otp}
					placeholder="123456"
					maxlength={6}
					required
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm tracking-widest focus:border-blue-500 focus:outline-none"
				/>
			</div>

			{#if $otpStore.error}
				<p class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{$otpStore.error}</p>
			{/if}

			{#if $otpStore.resendMessage}
				<p class="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-600">
					{$otpStore.resendMessage}
				</p>
			{/if}

			<button
				type="submit"
				disabled={$otpStore.loading}
				class="mt-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
			>
				{$otpStore.loading ? 'Verifying...' : 'Verify'}
			</button>
		</form>

		<div class="mt-4 text-center">
			<button
				onclick={() => handleResendOtp(email)}
				disabled={$otpStore.resendLoading}
				class="text-sm text-blue-600 hover:underline disabled:opacity-60"
			>
				{$otpStore.resendLoading ? 'Resending...' : "Didn't receive it? Resend"}
			</button>
		</div>
	</div>
</div>
