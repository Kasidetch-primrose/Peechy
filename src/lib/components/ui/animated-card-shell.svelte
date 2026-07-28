<script lang="ts">
	/**
	 * Shared visual shell for auth cards: rounded bordered panel with an
	 * ambient particle background. Used by login, register, forget-password.
	 */
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let canvasEl: HTMLCanvasElement;

	function createParticle(width: number, height: number) {
		return {
			x: Math.random() * width,
			y: Math.random() * height,
			size: Math.random() * 2.5 + 1,
			speedX: (Math.random() - 0.5) * 0.3,
			speedY: (Math.random() - 0.5) * 0.3
		};
	}

	$effect(() => {
		const ctx = canvasEl?.getContext('2d');
		if (!ctx) return;

		let raf = 0;
		let width = 0;
		let height = 0;

		function resize() {
			const rect = canvasEl.getBoundingClientRect();
			width = canvasEl.width = rect.width;
			height = canvasEl.height = rect.height;
		}

		resize();
		const particles = Array.from(
			{ length: Math.min(60, Math.floor((width * height) / 12000)) },
			() => createParticle(width, height)
		);

		function animate() {
			ctx!.fillStyle = 'rgba(232,124,90,0.18)';
			ctx!.clearRect(0, 0, width, height);
			for (const p of particles) {
				p.x += p.speedX;
				p.y += p.speedY;
				if (p.x > width) p.x = 0;
				if (p.x < 0) p.x = width;
				if (p.y > height) p.y = 0;
				if (p.y < 0) p.y = height;

				ctx!.beginPath();
				ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx!.fill();
			}
			raf = requestAnimationFrame(animate);
		}
		animate();

		window.addEventListener('resize', resize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<div
	class="relative overflow-hidden rounded-2xl border-2 border-primary-200/60 bg-primary-50/90 shadow-md shadow-primary-200/30 backdrop-blur-sm"
>
	<canvas
		bind:this={canvasEl}
		class="pointer-events-none absolute inset-0 h-full w-full"
		aria-hidden="true"
	></canvas>

	<div class="relative z-10 p-8">
		{@render children()}
	</div>
</div>
