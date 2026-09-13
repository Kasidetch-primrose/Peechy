<script lang="ts">
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import './layout.css';
	import favicon from '$lib/assets/logo.png';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import RulesFab from '$lib/components/RulesFab.svelte';
	import GradientBackground from '$lib/components/ui/gradient-background.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Peechy - เกมเปิดป้ายทายภาพ</title>
	<meta
		name="description"
		content="Peechy เปิดป้ายทีละช่อง แล้วเดารูปข้างหลัง เหมาะกับทุกเพศทุกวัย เล่นได้ทั้งคนเดียวและหลายคน !"
	/>
</svelte:head>

{#if $navigating}
	<div class="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary-100">
		<div class="h-full w-1/3 animate-loading-bar bg-primary-500"></div>
	</div>
{/if}

<GradientBackground class="min-h-screen">
	<div class="flex min-h-screen w-full flex-col">
		<Navbar />
		<div class="flex flex-1 flex-col">
			{#key `${page.url.pathname}${page.url.search}`}
				{@render children()}
			{/key}
		</div>
		<Footer />
	</div>
	<RulesFab />
</GradientBackground>
