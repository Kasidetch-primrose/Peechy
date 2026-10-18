<script lang="ts">
	import type { IPublicAnnouncement } from '$lib/data/interface/announcement';
	import { TONE_STYLES, isExternal } from './tones';

	let {
		announcement,
		onClose,
		preview = false
	}: {
		announcement: Pick<IPublicAnnouncement, 'title' | 'message' | 'tone' | 'linkUrl' | 'linkLabel'>;
		onClose?: () => void;
		/** CMS preview: links don't navigate away from the unsaved form. */
		preview?: boolean;
	} = $props();

	const tone = $derived(TONE_STYLES[announcement.tone] ?? TONE_STYLES.info);
</script>

<div
	class="relative flex items-start gap-3 rounded-2xl border p-4 pr-11 shadow-sm sm:items-center sm:gap-4 {tone.box}"
	role="status"
>
	<span
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm"
		aria-hidden="true"
	>
		{tone.icon}
	</span>

	<div class="min-w-0 flex-1">
		<p class="font-semibold break-words text-gray-900">{announcement.title}</p>
		<p class="mt-0.5 text-sm break-words whitespace-pre-line text-gray-700">
			{announcement.message}
		</p>
	</div>

	{#if announcement.linkUrl}
		<a
			href={announcement.linkUrl}
			target={isExternal(announcement.linkUrl) ? '_blank' : undefined}
			rel={isExternal(announcement.linkUrl) ? 'noopener noreferrer' : undefined}
			onclick={(e) => preview && e.preventDefault()}
			class="hidden shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-sm transition-colors sm:inline-block {tone.button}"
		>
			{announcement.linkLabel || 'ดูรายละเอียด'}
		</a>
	{/if}

	{#if onClose}
		<button
			type="button"
			onclick={onClose}
			aria-label="ปิดประกาศ"
			class="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/80 hover:text-gray-700"
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				aria-hidden="true"
			>
				<path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
			</svg>
		</button>
	{/if}
</div>

{#if announcement.linkUrl}
	<!-- On phones the link sits under the card so the text keeps the full width. -->
	<a
		href={announcement.linkUrl}
		target={isExternal(announcement.linkUrl) ? '_blank' : undefined}
		rel={isExternal(announcement.linkUrl) ? 'noopener noreferrer' : undefined}
		onclick={(e) => preview && e.preventDefault()}
		class="mt-2 block rounded-full px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-colors sm:hidden {tone.button}"
	>
		{announcement.linkLabel || 'ดูรายละเอียด'}
	</a>
{/if}
