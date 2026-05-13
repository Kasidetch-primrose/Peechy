<script lang="ts">
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import AuthService from '$lib/data/services/auth';

	async function handleLogout() {
		const { user, accessToken } = $authUserStore;
		if (user) {
			await AuthService.logout(user.id, accessToken);
		}
		authUserStore.set({ accessToken: '', refreshToken: '', user: null });
		goto('/demo/auth/login');
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-150 w-full rounded-2xl bg-white p-8 shadow-md">
		{#if $authUserStore.user}
			<h1 class="mb-2 text-2xl font-bold text-gray-800">
				Hello, {$authUserStore.user.name ?? $authUserStore.user.username} 👋
			</h1>
			<p class="mb-1 text-sm text-gray-500">Email: {$authUserStore.user.email}</p>
			<p class="mb-6 text-sm text-gray-500">Username: @{$authUserStore.user.username}</p>

			<div class="mb-6 rounded-lg bg-gray-50 p-4 text-xs break-all text-gray-400">
				<p class="mb-1 font-medium text-gray-500">Access Token</p>
				{$authUserStore.accessToken}
			</div>

			<button
				onclick={handleLogout}
				class="w-full rounded-lg bg-red-500 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
			>
				Sign out
			</button>
		{:else}
			<p class="text-sm text-gray-500">You are not logged in.</p>
			<a
				href="/demo/auth/login"
				class="mt-4 block text-center text-sm text-blue-600 hover:underline">Go to login</a
			>
		{/if}
	</div>
</div>
