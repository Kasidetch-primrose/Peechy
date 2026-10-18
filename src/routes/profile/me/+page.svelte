<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';

	// "/profile/me" — a link that works for everyone (e.g. in announcements): sends the viewer to
	// their own profile, or to login when logged out. The session lives in localStorage, so this
	// can only be resolved in the browser. replaceState keeps Back from bouncing through here.
	onMount(() => {
		const user = $authUserStore.user;
		goto(user ? `/profile/${user.id}` : '/auth/login', { replaceState: true });
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-1 justify-center py-3xl">
	<span class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500"
	></span>
</div>
