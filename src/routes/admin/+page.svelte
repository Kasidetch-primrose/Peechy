<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import AnnouncementService from '$lib/data/services/announcement';
	import { authUserStore } from '$lib/data/stores/authUser';
	import {
		ANNOUNCEMENT_DISPLAYS,
		ANNOUNCEMENT_TONES,
		type IAnnouncement,
		type IAnnouncementInput
	} from '$lib/data/interface/announcement';
	import AnnouncementBanner from '$lib/components/announcement/AnnouncementBanner.svelte';
	import AnnouncementPopup from '$lib/components/announcement/AnnouncementPopup.svelte';
	import { DISPLAY_LABELS, TONE_STYLES } from '$lib/components/announcement/tones';

	// The real access check is server-side (every /api/admin call re-reads users.is_admin);
	// this page only reacts to what the API answers.
	let access = $state<'loading' | 'ok' | 'forbidden'>('loading');
	let items = $state<IAnnouncement[]>([]);
	let loadError = $state('');

	let editingId = $state<number | null>(null); // null + formOpen = creating
	let formOpen = $state(false);
	let form = $state<IAnnouncementInput>(emptyForm());
	let saving = $state(false);
	let formError = $state('');
	let previewPopup = $state(false);
	let busyId = $state<number | null>(null);
	let toast = $state('');

	function emptyForm(): IAnnouncementInput {
		return {
			title: '',
			message: '',
			tone: 'info',
			display: 'banner',
			linkUrl: null,
			linkLabel: null,
			isActive: true,
			startsAt: null,
			endsAt: null
		};
	}

	// ── datetime-local <-> ISO (the input works in the admin's local time) ──
	function toLocalInput(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
	const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

	const fmt = (iso: string) =>
		new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

	type Status = { label: string; class: string };
	function statusOf(a: IAnnouncement): Status {
		const now = Date.now();
		if (!a.isActive) return { label: 'ปิดอยู่', class: 'bg-gray-100 text-gray-700' };
		if (a.endsAt && new Date(a.endsAt).getTime() < now)
			return { label: 'หมดเวลาแล้ว', class: 'bg-gray-100 text-gray-700' };
		if (a.startsAt && new Date(a.startsAt).getTime() > now)
			return { label: 'ตั้งเวลาไว้', class: 'bg-sky-100 text-sky-800' };
		return { label: 'กำลังแสดง', class: 'bg-emerald-100 text-emerald-800' };
	}

	function flash(msg: string) {
		toast = msg;
		setTimeout(() => (toast === msg ? (toast = '') : null), 2500);
	}

	async function load() {
		loadError = '';
		try {
			const res = await AnnouncementService.list();
			if (res.status === 'success' && res.docs) {
				items = res.docs;
				access = 'ok';
			} else if (res.error === 'Forbidden' || res.error === 'Unauthorized') {
				access = 'forbidden';
			} else {
				loadError = res.error ?? 'โหลดข้อมูลไม่สำเร็จ';
				access = 'ok';
			}
		} catch {
			loadError = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
			access = 'ok';
		}
	}

	function openCreate() {
		editingId = null;
		form = emptyForm();
		formError = '';
		formOpen = true;
	}

	function openEdit(a: IAnnouncement) {
		editingId = a.id;
		form = {
			title: a.title,
			message: a.message,
			tone: a.tone,
			display: a.display,
			linkUrl: a.linkUrl,
			linkLabel: a.linkLabel,
			isActive: a.isActive,
			startsAt: a.startsAt,
			endsAt: a.endsAt
		};
		formError = '';
		formOpen = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function closeForm() {
		formOpen = false;
		editingId = null;
	}

	async function save() {
		formError = '';
		if (!form.title.trim() || !form.message.trim()) {
			formError = 'กรุณากรอกหัวข้อและข้อความ';
			return;
		}
		saving = true;
		try {
			const payload = { ...form, linkUrl: form.linkUrl?.trim() || null };
			const res =
				editingId === null
					? await AnnouncementService.create(payload)
					: await AnnouncementService.update(editingId, payload);
			if (res.status !== 'success' || !res.doc) {
				formError = res.error ?? 'บันทึกไม่สำเร็จ';
				return;
			}
			const doc = res.doc;
			items = editingId === null ? [doc, ...items] : items.map((x) => (x.id === doc.id ? doc : x));
			flash(editingId === null ? 'สร้างประกาศแล้ว' : 'บันทึกการแก้ไขแล้ว');
			closeForm();
		} catch {
			formError = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
		} finally {
			saving = false;
		}
	}

	async function toggle(a: IAnnouncement) {
		busyId = a.id;
		try {
			const res = await AnnouncementService.setActive(a.id, !a.isActive);
			if (res.status === 'success' && res.doc) {
				const doc = res.doc;
				items = items.map((x) => (x.id === doc.id ? doc : x));
				flash(doc.isActive ? 'เปิดประกาศแล้ว' : 'ปิดประกาศแล้ว');
			} else flash(res.error ?? 'ไม่สำเร็จ');
		} finally {
			busyId = null;
		}
	}

	async function remove(a: IAnnouncement) {
		if (!confirm(`ลบประกาศ "${a.title}" ?`)) return;
		busyId = a.id;
		try {
			const res = await AnnouncementService.remove(a.id);
			if (res.status === 'success') {
				items = items.filter((x) => x.id !== a.id);
				if (editingId === a.id) closeForm();
				flash('ลบประกาศแล้ว');
			} else flash(res.error ?? 'ลบไม่สำเร็จ');
		} finally {
			busyId = null;
		}
	}

	onMount(() => {
		if (!$authUserStore.user) {
			goto('/auth/login');
			return;
		}
		load();
	});

	const inputClass =
		'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-primary-400';
	const labelClass = 'mb-1.5 block text-sm font-medium text-gray-900';
</script>

<svelte:head>
	<title>จัดการประกาศ | Peechy CMS</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="mx-auto w-full max-w-6xl px-lg py-xl">
	{#if access === 'loading'}
		<div class="flex justify-center py-3xl">
			<span class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500"></span>
		</div>
	{:else if access === 'forbidden'}
		<div class="mx-auto flex max-w-[26rem] flex-col items-center rounded-3xl bg-white/90 p-xl text-center shadow-sm">
			<span class="text-5xl">🔒</span>
			<h1 class="mt-md text-xl font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึง</h1>
			<p class="mt-1 text-sm text-gray-700">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
			<a href="/" class="mt-lg rounded-full bg-primary-500 px-lg py-sm text-sm font-medium text-white hover:bg-primary-400">
				กลับหน้าหลัก
			</a>
		</div>
	{:else}
		<!-- Header -->
		<div class="mb-lg flex flex-wrap items-end justify-between gap-md">
			<div>
				<p class="text-sm font-medium text-primary-600">Peechy CMS</p>
				<h1 class="text-2xl font-bold text-gray-900">จัดการประกาศ</h1>
				<p class="mt-1 text-sm text-gray-700">ประกาศที่เปิดไว้จะแสดงบนหน้าหลัก เป็นแถบด้านบนหรือป๊อปอัปตอนเข้าเว็บ</p>
			</div>
			{#if !formOpen}
				<button
					type="button"
					onclick={openCreate}
					class="rounded-full bg-primary-500 px-lg py-sm text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-400 active:bg-primary-600"
				>
					+ สร้างประกาศใหม่
				</button>
			{/if}
		</div>

		<!-- Editor -->
		{#if formOpen}
			<section class="mb-xl rounded-3xl bg-white/95 p-lg shadow-sm" transition:slide={{ duration: 220 }}>
				<div class="mb-md flex items-center justify-between gap-md">
					<h2 class="text-lg font-semibold text-gray-900">
						{editingId === null ? 'สร้างประกาศใหม่' : 'แก้ไขประกาศ'}
					</h2>
					<button type="button" onclick={closeForm} class="text-sm text-gray-400 hover:text-gray-700">ยกเลิก</button>
				</div>

				<div class="grid gap-lg lg:grid-cols-2">
					<!-- Fields -->
					<div class="flex flex-col gap-md">
						<div>
							<label class={labelClass} for="ann-title">หัวข้อ</label>
							<input id="ann-title" class={inputClass} maxlength="120" bind:value={form.title} placeholder="เช่น อัปเดตใหม่! โหมดวาดรูปด้วยกัน" />
						</div>
						<div>
							<label class={labelClass} for="ann-message">
								ข้อความ <span class="font-normal text-gray-400">({form.message.length}/1000)</span>
							</label>
							<textarea
								id="ann-message"
								class="{inputClass} min-h-28 resize-y"
								maxlength="1000"
								bind:value={form.message}
								placeholder="รายละเอียดประกาศ (ขึ้นบรรทัดใหม่ได้)"
							></textarea>
						</div>

						<div>
							<span class={labelClass}>รูปแบบการแสดงผล</span>
							<div class="grid grid-cols-3 gap-2">
								{#each ANNOUNCEMENT_DISPLAYS as d}
									<button
										type="button"
										onclick={() => (form.display = d)}
										class="rounded-xl border px-2 py-2 text-sm transition-colors {form.display === d
											? 'border-primary-500 bg-primary-100 font-semibold text-primary-600'
											: 'border-gray-200 text-gray-700 hover:bg-gray-100'}"
									>
										{DISPLAY_LABELS[d]}
									</button>
								{/each}
							</div>
						</div>

						<div>
							<span class={labelClass}>โทน</span>
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{#each ANNOUNCEMENT_TONES as t}
									<button
										type="button"
										onclick={() => (form.tone = t)}
										class="rounded-xl border px-2 py-2 text-sm transition-colors {form.tone === t
											? 'border-primary-500 bg-primary-100 font-semibold text-primary-600'
											: 'border-gray-200 text-gray-700 hover:bg-gray-100'}"
									>
										{TONE_STYLES[t].icon} {TONE_STYLES[t].label}
									</button>
								{/each}
							</div>
						</div>

						<div class="grid gap-md sm:grid-cols-2">
							<div>
								<label class={labelClass} for="ann-link">ลิงก์ (ไม่บังคับ)</label>
								<input
									id="ann-link"
									class={inputClass}
									value={form.linkUrl ?? ''}
									oninput={(e) => (form.linkUrl = e.currentTarget.value || null)}
									placeholder="/games หรือ https://..."
								/>
							</div>
							<div>
								<label class={labelClass} for="ann-link-label">ข้อความปุ่ม</label>
								<input
									id="ann-link-label"
									class={inputClass}
									maxlength="60"
									disabled={!form.linkUrl}
									value={form.linkLabel ?? ''}
									oninput={(e) => (form.linkLabel = e.currentTarget.value || null)}
									placeholder="ดูรายละเอียด"
								/>
							</div>
						</div>

						<div class="grid gap-md sm:grid-cols-2">
							<div>
								<label class={labelClass} for="ann-start">เริ่มแสดง (ไม่บังคับ)</label>
								<input
									id="ann-start"
									type="datetime-local"
									class={inputClass}
									value={toLocalInput(form.startsAt)}
									onchange={(e) => (form.startsAt = fromLocalInput(e.currentTarget.value))}
								/>
							</div>
							<div>
								<label class={labelClass} for="ann-end">สิ้นสุด (ไม่บังคับ)</label>
								<input
									id="ann-end"
									type="datetime-local"
									class={inputClass}
									value={toLocalInput(form.endsAt)}
									onchange={(e) => (form.endsAt = fromLocalInput(e.currentTarget.value))}
								/>
							</div>
						</div>

						<label class="flex cursor-pointer items-center gap-3 select-none">
							<input type="checkbox" bind:checked={form.isActive} class="h-5 w-5 accent-primary-500" />
							<span class="text-sm text-gray-900">เปิดใช้งานทันทีหลังบันทึก</span>
						</label>

						{#if formError}
							<p class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-500">{formError}</p>
						{/if}

						<div class="flex gap-3">
							<button
								type="button"
								onclick={closeForm}
								class="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								ยกเลิก
							</button>
							<button
								type="button"
								onclick={save}
								disabled={saving}
								class="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{saving ? 'กำลังบันทึก...' : 'บันทึก'}
							</button>
						</div>
					</div>

					<!-- Live preview -->
					<div class="flex flex-col gap-md rounded-2xl bg-gray-100/70 p-md">
						<p class="text-sm font-medium text-gray-700">ตัวอย่าง</p>
						{#if form.display !== 'popup'}
							<AnnouncementBanner
								announcement={{
									...form,
									title: form.title || 'หัวข้อประกาศ',
									message: form.message || 'ข้อความประกาศจะแสดงตรงนี้'
								}}
								onClose={() => {}}
								preview
							/>
						{/if}
						{#if form.display !== 'banner'}
							<button
								type="button"
								onclick={() => (previewPopup = true)}
								class="self-start rounded-full border border-primary-500 bg-white px-md py-xs text-sm font-medium text-primary-500 hover:bg-primary-100"
							>
								👀 ดูตัวอย่างป๊อปอัป
							</button>
						{/if}
						<p class="text-xs leading-relaxed text-gray-700">
							ป๊อปอัปจะเด้งครั้งเดียวต่อเครื่อง เมื่อผู้ใช้กดปิดจะไม่เด้งอีก — ถ้าแก้ไขข้อความแล้วบันทึก
							จะเด้งให้เห็นใหม่อีกครั้ง (การกดเปิด/ปิดอย่างเดียวจะไม่ทำให้เด้งซ้ำ)
						</p>
					</div>
				</div>
			</section>
		{/if}

		<!-- List -->
		{#if loadError}
			<p class="mb-md rounded-xl bg-red-50 px-4 py-2 text-sm text-red-500">{loadError}</p>
		{/if}

		{#if items.length === 0 && !loadError}
			<div class="flex flex-col items-center gap-md rounded-3xl bg-white/80 py-2xl text-center">
				<span class="text-5xl">📭</span>
				<p class="text-gray-700">ยังไม่มีประกาศ</p>
			</div>
		{:else}
			<ul class="flex flex-col gap-md">
				{#each items as a (a.id)}
					{@const status = statusOf(a)}
					<li
						class="flex flex-col gap-md rounded-3xl bg-white/95 p-md shadow-sm sm:flex-row sm:items-center {editingId === a.id
							? 'ring-2 ring-primary-400'
							: ''}"
					>
						<span class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-2xl sm:flex">
							{TONE_STYLES[a.tone]?.icon ?? '📢'}
						</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="rounded-full px-2.5 py-0.5 text-xs font-medium {status.class}">{status.label}</span>
								<span class="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-600">
									{DISPLAY_LABELS[a.display] ?? a.display}
								</span>
							</div>
							<p class="mt-1 truncate font-semibold text-gray-900">{a.title}</p>
							<p class="truncate text-sm text-gray-700">{a.message}</p>
							<p class="mt-1 text-xs text-gray-400">
								{#if a.startsAt || a.endsAt}
									{a.startsAt ? fmt(a.startsAt) : 'ตอนนี้'} → {a.endsAt ? fmt(a.endsAt) : 'ไม่มีกำหนด'} ·
								{/if}
								แก้ไขล่าสุด {fmt(a.updatedAt)}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<button
								type="button"
								role="switch"
								aria-checked={a.isActive}
								aria-label={a.isActive ? 'ปิดประกาศ' : 'เปิดประกาศ'}
								disabled={busyId === a.id}
								onclick={() => toggle(a)}
								class="relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 {a.isActive
									? 'bg-emerald-400'
									: 'bg-gray-200'}"
							>
								<span
									class="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform {a.isActive
										? 'translate-x-5'
										: ''}"
								></span>
							</button>
							<button
								type="button"
								onclick={() => openEdit(a)}
								class="rounded-full border border-primary-300 px-md py-xs text-sm font-medium text-primary-600 hover:bg-primary-100"
							>
								แก้ไข
							</button>
							<button
								type="button"
								onclick={() => remove(a)}
								disabled={busyId === a.id}
								class="rounded-full border border-red-200 px-md py-xs text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
							>
								ลบ
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</main>

{#if previewPopup}
	<AnnouncementPopup
		announcement={{
			...form,
			title: form.title || 'หัวข้อประกาศ',
			message: form.message || 'ข้อความประกาศจะแสดงตรงนี้'
		}}
		onClose={() => (previewPopup = false)}
		preview
	/>
{/if}

{#if toast}
	<div
		class="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-gray-900 px-lg py-sm text-sm text-white shadow-lg"
		role="status"
	>
		{toast}
	</div>
{/if}
