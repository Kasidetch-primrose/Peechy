<script lang="ts">
	import type { IAvatarCrop } from '$lib/data/interface/user';
	import { avatarImageStyle, avatarInitials } from '$lib/utils/avatar';

	// Round user picture cut out by the saved crop; falls back to initials on a peach circle.
	// Size / text size come from `class` (e.g. "h-6 w-6 text-xs").
	let {
		url = null,
		crop = null,
		name = '',
		class: className = ''
	}: {
		url?: string | null;
		crop?: IAvatarCrop | null;
		name?: string | null;
		class?: string;
	} = $props();

	let failed = $state(false);
	$effect(() => {
		void url;
		failed = false;
	});
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-500 font-bold text-white uppercase {className}"
	aria-hidden="true"
>
	{#if url && !failed}
		<img
			src={url}
			alt=""
			draggable="false"
			loading="lazy"
			onerror={() => (failed = true)}
			class={crop ? 'select-none' : 'absolute inset-0 h-full w-full object-cover select-none'}
			style={crop ? avatarImageStyle(crop) : undefined}
		/>
	{:else}
		{avatarInitials(name)}
	{/if}
</span>
