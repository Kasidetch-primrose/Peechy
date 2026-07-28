<script lang="ts">
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import GradientBackground from '$lib/components/ui/gradient-background.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if $navigating}
	<div class="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary-100">
		<div class="h-full w-1/3 animate-loading-bar bg-primary-500"></div>
	</div>
{/if}

<GradientBackground class="min-h-screen">
	<div class="flex w-full min-h-screen flex-col">
		<Navbar />
		{#key `${page.url.pathname}${page.url.search}`}
			{@render children()}
		{/key}
	</div>
</GradientBackground>
