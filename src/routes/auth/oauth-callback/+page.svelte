<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';

	let error = $state('');

	onMount(async () => {
		const ticket = new URLSearchParams(window.location.search).get('ticket');
		if (!ticket) {
			goto('/auth/login?error=no_ticket');
			return;
		}

		try {
			const res = await fetch('/api/auth/oauth/exchange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ticket })
			});
			const data = await res.json();

			if (data.status === 'success') {
				authUserStore.set({
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
					user: data.user
				});
				goto('/');
			} else {
				error = data.message ?? 'เข้าสู่ระบบไม่สำเร็จ';
			}
		} catch {
			error = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-transparent">
	{#if error}
		<div class="text-center">
			<p class="text-red-600">{error}</p>
			<a href="/auth/login" class="mt-4 inline-block text-sm text-primary-500 hover:underline">
				กลับสู่หน้าเข้าสู่ระบบ
			</a>
		</div>
	{:else}
		<div class="text-center text-gray-500">
			<svg
				class="mx-auto h-8 w-8 animate-spin text-primary-500"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<p class="mt-3 text-sm">กำลังเข้าสู่ระบบ...</p>
		</div>
	{/if}
</div>
