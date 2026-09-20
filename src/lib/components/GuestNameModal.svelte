<script lang="ts">
	import { getSavedGuestName } from '$lib/utils/guest-identity';

	let {
		open = $bindable(false),
		onConfirm,
		onCancel
	}: {
		open: boolean;
		onConfirm: (name: string) => void;
		onCancel?: () => void;
	} = $props();

	let name = $state('');

	// Prefill with the last nickname used, purely as a convenience — this
	// modal is shown every time a guest joins/creates a room, never skipped.
	$effect(() => {
		if (open) name = getSavedGuestName();
	});

	function submit() {
		const trimmed = name.trim();
		if (!trimmed) return;
		onConfirm(trimmed);
		open = false;
		name = '';
	}

	function cancel() {
		open = false;
		name = '';
		onCancel?.();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-4 w-full max-w-[26rem] rounded-2xl bg-white p-6 shadow-xl">
			<h3 class="text-base font-semibold text-gray-900">ตั้งชื่อเล่นของคุณ</h3>
			<p class="mt-1 text-sm text-gray-500">เล่นได้เลยโดยไม่ต้องสมัครสมาชิก เพื่อนในห้องจะเห็นชื่อนี้</p>

			<input
				type="text"
				bind:value={name}
				maxlength="20"
				placeholder="เช่น พีชจัง"
				autocomplete="off"
				onkeydown={(e) => e.key === 'Enter' && submit()}
				class="mt-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-400"
			/>

			<div class="mt-5 flex gap-3">
				{#if onCancel}
					<button
						type="button"
						onclick={cancel}
						class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						ยกเลิก
					</button>
				{/if}
				<button
					type="button"
					onclick={submit}
					disabled={!name.trim()}
					class="flex-1 rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-50"
				>
					เข้าเล่น
				</button>
			</div>
		</div>
	</div>
{/if}
