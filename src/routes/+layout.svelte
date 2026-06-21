<script lang="ts">
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if $navigating}
	<div class="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary-100">
		<div class="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-primary-500"></div>
	</div>
{/if}

<Navbar />
{#key `${page.url.pathname}${page.url.search}`}
	{@render children()}
{/key}

<style>
	@keyframes loading-bar {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(150%);
		}
		100% {
			transform: translateX(150%);
		}
	}
</style>
