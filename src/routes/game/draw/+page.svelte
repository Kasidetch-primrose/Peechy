<script lang="ts">
	import { goto } from '$app/navigation';
	import { authUserStore } from '$lib/data/stores/authUser';
	import { connect, createRoom, joinRoom, drawingStore } from '$lib/data/stores/drawing';
	import { DRAW_RATIO_OPTIONS, DRAW_RATIO_VALUE, type DrawRatio } from '$lib/data/interface/drawing';

	let ratio = $state<DrawRatio>('4:3');
	let joinCode = $state('');
	let creating = $state(false);
	let joining = $state(false);

	function requireLogin(): boolean {
		if ($authUserStore.user) return true;
		goto('/auth/login');
		return false;
	}

	async function handleCreate() {
		if (!requireLogin()) return;
		const user = $authUserStore.user!;
		creating = true;
		connect(String(user.id), user.username);
		const code = await createRoom(ratio);
		creating = false;
		if (code) goto(`/game/draw/${code}`);
	}

	async function handleJoin() {
		const code = joinCode.trim();
		if (code.length !== 5) return;
		if (!requireLogin()) return;
		const user = $authUserStore.user!;
		joining = true;
		connect(String(user.id), user.username);
		const ok = await joinRoom(code);
		joining = false;
		if (ok) goto(`/game/draw/${code}`);
	}
</script>

<div
	class="flex min-h-screen flex-col items-center gap-8 bg-linear-to-br from-primary-100/40 via-white to-primary-100/20 px-4 py-16"
>
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-3xl font-bold text-primary-600">🎨 วาดรูปด้วยกัน</h1>
		<p class=" text-sm text-gray-500">
			ชวนเพื่อนมาวาดรูปบนกระดาษเดียวกันแบบเรียลไทม์ สร้างห้องแล้วส่งรหัสให้เพื่อนเข้าร่วมได้เลย
		</p>
	</div>

	{#if $drawingStore.error}
		<p class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{$drawingStore.error}</p>
	{/if}

	<div class="flex w-full max-w-[36rem] flex-col gap-5">
		<div class="flex flex-col gap-3 rounded-2xl border border-primary-100 bg-white/80 p-4 shadow-sm">
			<div class="flex items-baseline justify-between">
				<span class="text-sm font-semibold text-gray-700">ขนาดกระดาษ</span>
				<span class="text-[11px] text-gray-400">เลือกแล้วล็อกตลอดห้อง ทุกคนเห็นสัดส่วนเดียวกัน</span>
			</div>
			<div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="ขนาดกระดาษ">
				{#each DRAW_RATIO_OPTIONS as option (option.value)}
					<button
						type="button"
						role="radio"
						aria-checked={ratio === option.value}
						onclick={() => (ratio = option.value)}
						class="flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 transition-colors {ratio === option.value
							? 'border-primary-500 bg-primary-100/60'
							: 'border-gray-200 bg-white hover:border-primary-300'}"
					>
						<span class="flex h-10 items-center justify-center">
							<span
								class="block rounded-sm border-2 {ratio === option.value
									? 'border-primary-500 bg-white'
									: 'border-gray-300 bg-gray-50'}"
								style="aspect-ratio: {DRAW_RATIO_VALUE[option.value]}; height: {DRAW_RATIO_VALUE[option.value] > 1
									? 'auto'
									: '100%'}; width: {DRAW_RATIO_VALUE[option.value] > 1 ? '2.5rem' : 'auto'};"
							></span>
						</span>
						<span class="text-xs font-semibold text-gray-700">{option.label}</span>
						<span class="text-[10px] leading-tight text-gray-400">{option.hint}</span>
					</button>
				{/each}
			</div>
		</div>

		<button
			type="button"
			onclick={handleCreate}
			disabled={creating}
			class="rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
		>
			{creating ? 'กำลังสร้างห้อง...' : '+ สร้างห้องใหม่'}
		</button>

		<div class="flex items-center gap-3 text-xs text-gray-400">
			<div class="h-px flex-1 bg-gray-200"></div>
			หรือ
			<div class="h-px flex-1 bg-gray-200"></div>
		</div>

		<div class="flex items-center overflow-hidden rounded-xl border border-primary-300 bg-white">
			<input
				type="text"
				bind:value={joinCode}
				maxlength="5"
				inputmode="numeric"
				placeholder="กรอกรหัสห้อง 5 หลัก"
				class="w-full bg-transparent px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
				onkeydown={(e) => e.key === 'Enter' && handleJoin()}
			/>
			<button
				type="button"
				onclick={handleJoin}
				disabled={joining || joinCode.trim().length !== 5}
				class="bg-primary-500 px-4 py-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
			>
				{joining ? '...' : 'เข้าร่วม'}
			</button>
		</div>
	</div>
</div>
