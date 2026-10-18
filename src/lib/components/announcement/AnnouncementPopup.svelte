<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { IPublicAnnouncement } from '$lib/data/interface/announcement';
	import { TONE_STYLES, isExternal } from './tones';

	let {
		announcement,
		onClose,
		preview = false
	}: {
		announcement: Pick<IPublicAnnouncement, 'title' | 'message' | 'tone' | 'linkUrl' | 'linkLabel'>;
		onClose: () => void;
		/** CMS preview: links don't navigate away from the unsaved form. */
		preview?: boolean;
	} = $props();

	const tone = $derived(TONE_STYLES[announcement.tone] ?? TONE_STYLES.info);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div
	class="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
	transition:fade={{ duration: 180 }}
>
	<div
		class="w-full max-w-[28rem] overflow-hidden rounded-3xl bg-white shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="announcement-popup-title"
		transition:scale={{ duration: 260, start: 0.9, easing: backOut }}
	>
		<div class="flex flex-col items-center border-b px-6 pt-7 pb-5 text-center {tone.box}">
			<span
				class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-md"
				aria-hidden="true">{tone.icon}</span
			>
			<span class="mt-3 rounded-full px-3 py-0.5 text-xs font-medium {tone.chip}">{tone.label}</span>
			<h2 id="announcement-popup-title" class="mt-2 text-xl font-bold break-words text-gray-900">
				{announcement.title}
			</h2>
		</div>

		<div class="px-6 py-5">
			<p class="max-h-[40vh] overflow-y-auto text-sm leading-relaxed break-words whitespace-pre-line text-gray-700">
				{announcement.message}
			</p>

			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={onClose}
					class="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					{announcement.linkUrl ? 'ปิด' : 'รับทราบ'}
				</button>
				{#if announcement.linkUrl}
					<a
						href={announcement.linkUrl}
						target={isExternal(announcement.linkUrl) ? '_blank' : undefined}
						rel={isExternal(announcement.linkUrl) ? 'noopener noreferrer' : undefined}
						onclick={(e) => {
							if (preview) e.preventDefault();
							onClose();
						}}
						class="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-white transition-colors {tone.button}"
					>
						{announcement.linkLabel || 'ดูรายละเอียด'}
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>
