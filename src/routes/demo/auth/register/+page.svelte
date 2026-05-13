<script lang="ts">
	import { registerStore, handleRegister } from '$lib/data/stores/register';
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-150 rounded-2xl bg-white p-8 shadow-md">
		<h1 class="mb-6 text-2xl font-bold text-gray-800">Create an account</h1>

		<form onsubmit={handleRegister} class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label for="name" class="text-sm font-medium text-gray-600">Name</label>
				<input
					id="name"
					type="text"
					bind:value={$registerStore.name}
					placeholder="Your name"
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="username" class="text-sm font-medium text-gray-600">Username</label>
				<input
					id="username"
					type="text"
					bind:value={$registerStore.username}
					placeholder="username"
					required
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="email" class="text-sm font-medium text-gray-600">Email</label>
				<input
					id="email"
					type="email"
					bind:value={$registerStore.email}
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
					bind:value={$registerStore.password}
					placeholder="••••••••"
					required
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
				/>
			</div>

			{#if $registerStore.error}
				<p class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{$registerStore.error}</p>
			{/if}

			<button
				type="submit"
				disabled={$registerStore.loading}
				class="mt-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
			>
				{$registerStore.loading ? 'Registering...' : 'Register'}
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-500">
			Already have an account? <a href="/demo/auth/login" class="text-blue-600 hover:underline"
				>Login</a
			>
		</p>
	</div>
</div>
