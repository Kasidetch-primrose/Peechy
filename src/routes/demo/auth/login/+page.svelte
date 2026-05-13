<script lang="ts">
	import { loginStore, handleLogin } from '$lib/data/stores/login';
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-150 rounded-2xl bg-white p-8 shadow-md">
		<h1 class="mb-6 text-2xl font-bold text-gray-800">Welcome back</h1>

		<form onsubmit={handleLogin} class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label for="email" class="text-sm font-medium text-gray-600">Email</label>
				<input
					id="email"
					type="email"
					bind:value={$loginStore.email}
					placeholder="you@example.com"
					required
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="password" class="text-sm font-medium text-gray-600">Password</label>
				<input
					id="password"
					type="password"
					bind:value={$loginStore.password}
					placeholder="••••••••"
					required
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
				/>
			</div>

			{#if $loginStore.error}
				<p class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{$loginStore.error}</p>
			{/if}

			<button
				type="submit"
				disabled={$loginStore.loading}
				class="mt-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
			>
				{$loginStore.loading ? 'Signing in...' : 'Sign in'}
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-500">
			No account yet? <a href="/demo/auth/register" class="text-blue-600 hover:underline"
				>Register</a
			>
		</p>
	</div>
</div>
