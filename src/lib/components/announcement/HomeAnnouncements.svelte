<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import AnnouncementService from '$lib/data/services/announcement';
	import type { IPublicAnnouncement } from '$lib/data/interface/announcement';
	import AnnouncementBanner from './AnnouncementBanner.svelte';
	import AnnouncementPopup from './AnnouncementPopup.svelte';

	// Closed announcements, keyed by id + last edit — editing one in the CMS shows it again.
	const STORAGE_KEY = 'peechy_dismissed_announcements';
	const versionOf = (a: IPublicAnnouncement, kind: 'banner' | 'popup') =>
		`${kind}:${a.id}:${a.updatedAt}`;

	let announcements = $state<IPublicAnnouncement[]>([]);
	let dismissed = $state<string[]>([]);

	const banners = $derived(
		announcements.filter(
			(a) => a.display !== 'popup' && !dismissed.includes(versionOf(a, 'banner'))
		)
	);
	const popup = $derived(
		announcements.find((a) => a.display !== 'banner' && !dismissed.includes(versionOf(a, 'popup')))
	);

	function readDismissed(): string[] {
		try {
			const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
			return Array.isArray(raw) ? raw.filter((v) => typeof v === 'string') : [];
		} catch {
			return [];
		}
	}

	function dismiss(a: IPublicAnnouncement, kind: 'banner' | 'popup') {
		const live = new Set(announcements.flatMap((x) => [versionOf(x, 'banner'), versionOf(x, 'popup')]));
		// Keep only versions that are still live so the list doesn't grow forever.
		dismissed = [...dismissed.filter((v) => live.has(v)), versionOf(a, kind)];
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
		} catch {
			// private mode / storage blocked — it just shows again next visit
		}
	}

	onMount(async () => {
		dismissed = readDismissed();
		try {
			const res = await AnnouncementService.getActive();
			if (res.status === 'success' && res.docs) announcements = res.docs;
		} catch {
			// announcements are optional — the page works without them
		}
	});
</script>

{#if banners.length > 0}
	<section class="mx-auto flex max-w-6xl flex-col gap-3 px-lg pt-xl" aria-label="ประกาศ">
		{#each banners as a (a.id)}
			<div transition:slide={{ duration: 220 }}>
				<AnnouncementBanner announcement={a} onClose={() => dismiss(a, 'banner')} />
			</div>
		{/each}
	</section>
{/if}

{#if popup}
	{#key popup.id}
		<AnnouncementPopup announcement={popup} onClose={() => popup && dismiss(popup, 'popup')} />
	{/key}
{/if}
