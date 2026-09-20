<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { drawingStore } from '$lib/data/stores/drawing';
	import DrawingService from '$lib/data/services/multiplayer/drawing';

	let { code, selfId }: { code: string; selfId: string } = $props();

	const vote = $derived($drawingStore.clearVote);
	const notice = $derived($drawingStore.clearNotice);

	const isInitiator = $derived(vote?.initiatorId === selfId);
	const myVote = $derived(vote ? vote.votes[selfId] : undefined); // undefined = not a voter
	const total = $derived(vote ? Object.keys(vote.votes).length : 0);
	const yesCount = $derived(vote ? Object.values(vote.votes).filter((v) => v === true).length : 0);

	let now = $state(Date.now());
	const secondsLeft = $derived(vote ? Math.max(0, Math.ceil((vote.expiresAt - now) / 1000)) : 0);

	const ticker = setInterval(() => (now = Date.now()), 500);
	onDestroy(() => clearInterval(ticker));

	// Skip the motion for people who ask the OS to reduce it.
	const reduceMotion =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const enter = { y: -14, duration: reduceMotion ? 0 : 220 };
	const leave = { duration: reduceMotion ? 0 : 160 };

	const noticeText = $derived.by(() => {
		if (!notice) return '';
		switch (notice.status) {
			case 'approved':
				return '🧹 ล้างกระดาษแล้ว';
			case 'rejected':
				return `${notice.byName ?? 'มีคน'} ไม่เห็นด้วย — ไม่ล้างกระดาษ`;
			case 'expired':
				return 'หมดเวลาโหวต — ไม่ล้างกระดาษ';
			case 'busy':
				return 'มีการโหวตล้างกระดาษอยู่แล้ว';
			case 'cooldown':
				return `ขอล้างกระดาษได้อีกครั้งใน ${notice.seconds ?? 10} วินาที`;
			default:
				return 'ยกเลิกการโหวตล้างกระดาษ';
		}
	});
</script>

<div
	class="pointer-events-none fixed top-20 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-[24rem] -translate-x-1/2 flex-col gap-2"
	aria-live="polite"
>
	{#if vote && myVote === null}
		<div
			in:fly={enter}
			out:fade={leave}
			class="pointer-events-auto rounded-2xl border border-primary-200 bg-white p-4 shadow-xl"
			role="alertdialog"
		>
			<p class="text-sm font-semibold text-gray-900">
				{vote.initiatorName || 'เพื่อน'} ขอล้างกระดาษ
			</p>
			<p class="mt-1 text-xs text-gray-500">
				ต้องเห็นด้วยทุกคนจึงจะล้างได้ · เห็นด้วยแล้ว {yesCount}/{total} · เหลือ {secondsLeft} วิ
			</p>
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					onclick={() => DrawingService.respondClear(code, false)}
					class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					ไม่เห็นด้วย
				</button>
				<button
					type="button"
					onclick={() => DrawingService.respondClear(code, true)}
					class="flex-1 rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-400"
				>
					เห็นด้วย
				</button>
			</div>
		</div>
	{:else if vote && isInitiator}
		<div
			in:fly={enter}
			out:fade={leave}
			class="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-white px-4 py-3 shadow-xl"
		>
			<p class="text-xs text-gray-600">
				รอเพื่อนโหวตล้างกระดาษ {yesCount}/{total} · เหลือ {secondsLeft} วิ
			</p>
			<button
				type="button"
				onclick={() => DrawingService.cancelClear(code)}
				class="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
			>
				ยกเลิก
			</button>
		</div>
	{:else if vote}
		<div
			in:fly={enter}
			out:fade={leave}
			class="pointer-events-auto rounded-2xl border border-primary-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-xl"
		>
			{myVote === true ? 'คุณเห็นด้วยแล้ว · ' : ''}กำลังโหวตล้างกระดาษ {yesCount}/{total} · เหลือ {secondsLeft} วิ
		</div>
	{/if}

	{#if notice}
		{#key notice.id}
			<div
				in:fly={enter}
				out:fade={leave}
				class="pointer-events-auto rounded-2xl bg-gray-900/90 px-4 py-3 text-center text-sm text-white shadow-xl"
			>
				{noticeText}
			</div>
		{/key}
	{/if}
</div>
