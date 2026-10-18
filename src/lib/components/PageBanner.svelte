<script lang="ts">
	// Shared hero banner for list pages (games / artworks gallery) so both stay identical in size.
	let {
		title,
		subtitle,
		href,
		cta,
		ctaIcon = '',
		bgIcon = ''
	}: {
		title: string;
		subtitle: string;
		href: string;
		cta: string;
		ctaIcon?: string;
		bgIcon?: string;
	} = $props();
</script>

<div
	class="relative flex min-h-36 flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border border-primary-200 bg-linear-to-br from-primary-100 via-primary-50 to-white px-6 py-8 text-center shadow-md sm:flex-row sm:justify-between sm:text-left md:min-h-40 md:px-10 md:py-10"
>
	<div
		class="pointer-events-none absolute -top-10 -right-10 text-[9rem] leading-none opacity-10 select-none"
		aria-hidden="true"
	>
		{bgIcon}
	</div>
	<div class="relative">
		<h1 class="text-2xl font-bold text-gray-900 md:text-3xl">{title}</h1>
		<p class="mt-1.5 text-sm text-gray-500 md:text-base">{subtitle}</p>
	</div>
	<a
		{href}
		class="group relative flex shrink-0 items-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-300/50 transition-all hover:-translate-y-0.5 hover:bg-primary-400 hover:shadow-xl hover:shadow-primary-300/60 active:scale-95"
	>
		<span class="absolute inset-0 -z-10 animate-ping rounded-full bg-primary-400/60"></span>
		{ctaIcon}
		{cta}
		<span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
	</a>
</div>
