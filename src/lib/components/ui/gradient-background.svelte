<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		children?: import('svelte').Snippet;
		class?: string;
		gradients?: string[];
		holdDuration?: number;   // seconds each gradient is fully visible
		fadeDuration?: number;   // seconds the crossfade takes
		overlay?: boolean;
		overlayOpacity?: number;
	};

	// Brand-matched pastel gradients from the Peechy design palette
	const Default_Gradients = [
		'linear-gradient(135deg, #FFE5DC 0%, #A8D8FF 100%)',   // primary-100 → sky
		'linear-gradient(135deg, #FFD0BC 0%, #D4B8FF 100%)',   // primary-200 → lavender
		'linear-gradient(135deg, #FFE4A0 0%, #FFAAB0 100%)',   // yellow → coral
		'linear-gradient(135deg, #A8EDCC 0%, #FFD0BC 100%)',   // mint → primary-200
		'linear-gradient(135deg, #D4B8FF 0%, #FFE4A0 100%)',   // lavender → yellow
	];

	let {
		children,
		class: className = '',
		gradients = Default_Gradients,
		holdDuration = 5,
		fadeDuration = 3,
		overlay = false,
		overlayOpacity = 0.08,
	}: Props = $props();

	// Two layers swap roles: one fades out while the other fades in
	let layerA = $state({ gradient: gradients[0], opacity: 1 });
	let layerB = $state({ gradient: gradients[1] ?? gradients[0], opacity: 0 });
	let activeLayer = $state<'A' | 'B'>('A');

	onMount(() => {
		const g = gradients.slice();
		let idx = 0;

		const tick = () => {
			idx = (idx + 1) % g.length;
			const next = g[idx];

			if (activeLayer === 'A') {
				// load next into B, then crossfade B in / A out
				layerB = { gradient: next, opacity: 0 };
				// tiny rAF to let the browser register the opacity:0 before transitioning
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						layerB = { ...layerB, opacity: 1 };
						layerA = { ...layerA, opacity: 0 };
						activeLayer = 'B';
					});
				});
			} else {
				layerA = { gradient: next, opacity: 0 };
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						layerA = { ...layerA, opacity: 1 };
						layerB = { ...layerB, opacity: 0 };
						activeLayer = 'A';
					});
				});
			}
		};

		// first fade starts after holdDuration, then repeats every (hold + fade)
		const interval = setInterval(tick, (holdDuration + fadeDuration) * 1000);
		const initial = setTimeout(tick, holdDuration * 1000);

		return () => {
			clearTimeout(initial);
			clearInterval(interval);
		};
	});
</script>

<div class={cn('relative w-full min-h-screen overflow-hidden', className)}>
	<!-- Layer A -->
	<div
		class="absolute inset-0"
		style="background: {layerA.gradient}; opacity: {layerA.opacity}; transition: opacity {fadeDuration}s ease-in-out;"
	></div>

	<!-- Layer B -->
	<div
		class="absolute inset-0"
		style="background: {layerB.gradient}; opacity: {layerB.opacity}; transition: opacity {fadeDuration}s ease-in-out;"
	></div>

	{#if overlay}
		<div class="absolute inset-0 bg-black" style="opacity: {overlayOpacity}"></div>
	{/if}

	{#if children}
		<div class="relative z-10">
			{@render children()}
		</div>
	{/if}
</div>
