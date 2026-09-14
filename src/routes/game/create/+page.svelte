<!-- !
  IMAGE UPLOAD STRATEGY
  ──────────────────────────────────────────────────────────────────────────────
  Challenge: each Image DB record requires a `gameId`, but the game does not
  exist until the form is submitted.

  Solution (already in place in /api/upload-image):
  • R2 key format: `game-images/{uuid}.{ext}`  — UUID only, NO gameId in path.
  • Images are uploaded to R2 immediately when the user picks a file.
  • The returned { key, url } is stored in client state (ImageSlot).
  • On submit:
      1. POST /api/games  →  receive gameId
      2. For each slot, POST /api/images  { gameId, imageUrl, … }
  • Edit mode works the same way: new slots are uploaded before the PUT call.

  Orphan cleanup (user uploads then abandons the form):
  • Each slot tracks `uploadedKey`. A future DELETE /api/upload-image endpoint
    can be called on page leave (beforeNavigate) to remove uncommitted files.
  • As a safety net, a server-side cron should purge R2 objects older than N
    hours that have no matching row in the `images` table.
  ──────────────────────────────────────────────────────────────────────────────
-->

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { authUserStore } from '$lib/data/stores/authUser';
	import {
		gameCreateStore,
		loadEditData,
		addSlot,
		handleFilePick,
		handleDropFiles,
		handleThumbnailPick,
		removeThumbnail,
		updateThumbnailPosition,
		moveUp,
		moveDown,
		removeSlot,
		handleSubmit,
		updateSlotField,
		resetGameCreateStore,
		addHint,
		updateHint,
		removeHint,
		moveHintUp,
		moveHintDown
	} from '$lib/data/stores/game-create';

	// ── Thumbnail drag-to-reposition ──────────────────────────────────────────
	let editorEl = $state<HTMLDivElement>(null!);
	let dragging = $state(false);
	let dragStart = { x: 0, y: 0, posX: 50, posY: 50 };

	function onEditorPointerDown(e: PointerEvent) {
		if ($gameCreateStore.thumbnailStatus === 'uploading') return;
		dragging = true;
		dragStart = {
			x: e.clientX,
			y: e.clientY,
			posX: $gameCreateStore.thumbnailPosition.x,
			posY: $gameCreateStore.thumbnailPosition.y
		};
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onEditorPointerMove(e: PointerEvent) {
		if (!dragging || !editorEl) return;
		const rect = editorEl.getBoundingClientRect();
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		// Dragging right reveals the left side of the image → x decreases
		const newX = Math.min(100, Math.max(0, dragStart.posX - (dx / rect.width) * 100));
		const newY = Math.min(100, Math.max(0, dragStart.posY - (dy / rect.height) * 100));
		updateThumbnailPosition(newX, newY);
	}

	function onEditorPointerUp() {
		dragging = false;
	}

	const editId = $derived(Number(page.url.searchParams.get('id')) || null);
	const isEditMode = $derived(editId !== null);

	let isDragging = $state(false);
	let fileInputEl = $state<HTMLInputElement>(null!);

	let showGuestNotice = $state(false);
	const isLoggedIn = $derived(!!$authUserStore.user);

	$effect(() => {
		const id = editId;
		if (id) loadEditData(id);
		return () => resetGameCreateStore();
	});

	$effect(() => {
		if (!isEditMode && !isLoggedIn) showGuestNotice = true;
	});
</script>

{#if $gameCreateStore.loadingEdit}
	<div class="flex min-h-screen items-center justify-center bg-transparent">
		<div class="flex flex-col items-center gap-3 text-primary-500">
			<svg
				class="h-8 w-8 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm">กำลังโหลดข้อมูล...</span>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-transparent py-8 pb-16">
		<div class="mx-auto px-4">
			<!-- ! Page header -->
			<div class="mb-6 flex items-center gap-3">
				<button
					type="button"
					onclick={() => history.back()}
					class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-primary-100/60"
					aria-label="ย้อนกลับ"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>
				<h1 class="text-2xl font-bold text-gray-900">
					{isEditMode ? 'แก้ไขเกม' : 'สร้างเกมใหม่'}
				</h1>
			</div>

			<form onsubmit={(e) => handleSubmit(e, editId)} class="mx-auto flex w-225 flex-col gap-5">
				<!-- ! ── Game metadata card ─────────────────────────────────── -->
				<section
					class="rounded-2xl border border-primary-100/60 bg-white/80 p-6 shadow-md backdrop-blur-sm"
				>
					<h2 class="mb-4 text-sm font-semibold tracking-wide text-gray-500 uppercase">
						ข้อมูลเกม
					</h2>
					<div class="flex flex-col gap-4">
						<!-- ! Name -->
						<div class="flex flex-col gap-1.5">
							<label for="game-name" class="text-sm font-medium text-gray-700">
								ชื่อเกม <span class="text-error">*</span>
							</label>
							<input
								id="game-name"
								type="text"
								value={$gameCreateStore.gameName}
								oninput={(e) =>
									gameCreateStore.update((s) => ({
										...s,
										gameName: (e.target as HTMLInputElement).value
									}))}
								placeholder="เช่น มุมมองสัตว์ไทย"
								required
								class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
							/>
						</div>

						<!-- ! Description -->
						<div class="flex flex-col gap-1.5">
							<label for="game-desc" class="text-sm font-medium text-gray-700">คำอธิบาย</label>
							<textarea
								id="game-desc"
								value={$gameCreateStore.description}
								oninput={(e) => {
									const val = (e.target as HTMLTextAreaElement).value.slice(0, 300);
									(e.target as HTMLTextAreaElement).value = val;
									gameCreateStore.update((s) => ({ ...s, description: val }));
								}}
								maxlength={300}
								rows={3}
								placeholder="อธิบายเนื้อหาเกมสั้นๆ..."
								class="resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
							></textarea>
							<span class="self-end text-xs text-gray-400">
								{($gameCreateStore.description ?? '').length}/300
							</span>
						</div>

						<!-- ! Thumbnail -->
						<div class="flex flex-col gap-2">
							<label class="text-sm font-medium text-gray-700">ภาพปก</label>

							{#if $gameCreateStore.thumbnailPreview}
								<!-- ── Drag-to-reposition editor ─────────────────────── -->
								<!--
									Editor uses the GameCard's native aspect ratio (352:304 in a 3-col
									max-w-6xl grid) so what the user sees here is exactly what gets stored.
								-->
								<div class="flex justify-center">
									<div
										bind:this={editorEl}
										role="img"
										aria-label="ลากเพื่อปรับตำแหน่งภาพปก"
										class="relative overflow-hidden rounded-2xl border border-gray-200 shadow-md"
										style="width: 100%; max-width: 380px; aspect-ratio: 352 / 304; cursor: {dragging
											? 'grabbing'
											: 'grab'}; touch-action: none;"
										onpointerdown={onEditorPointerDown}
										onpointermove={onEditorPointerMove}
										onpointerup={onEditorPointerUp}
										onpointercancel={onEditorPointerUp}
									>
										<!-- Full image (draggable via object-position) -->
										<img
											src={$gameCreateStore.thumbnailPreview}
											alt="thumbnail"
											draggable="false"
											style="
											position: absolute; inset: 0;
											width: 100%; height: 100%;
											object-fit: cover;
											object-position: {$gameCreateStore.thumbnailPosition.x}% {$gameCreateStore.thumbnailPosition.y}%;
											pointer-events: none;
											user-select: none;
											-webkit-user-drag: none;
										"
										/>

										<!-- GameCard glass-panel preview (7.2/19 = 37.9% of card height) -->
										<div
											style="
											position: absolute; bottom: 0; left: 0; right: 0;
											height: 37.9%;
											background: rgba(255,255,255,0.18);
											backdrop-filter: blur(20px) saturate(200%) brightness(1.1);
											-webkit-backdrop-filter: blur(20px) saturate(200%) brightness(1.1);
											border-top: 1px solid rgba(255,255,255,0.35);
											padding: 0.75rem 1rem 0.7rem;
											display: flex; flex-direction: column; gap: 0.3rem;
											pointer-events: none;
										"
										>
											<!-- Placeholder title bar -->
											<div
												style="height: 11px; width: 55%; background: rgba(255,255,255,0.55); border-radius: 6px;"
											></div>
											<!-- Placeholder description bar -->
											<div
												style="height: 8px; width: 80%; background: rgba(255,255,255,0.32); border-radius: 6px;"
											></div>
											<!-- Footer row -->
											<div
												style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;"
											>
												<div
													style="height: 8px; width: 35%; background: rgba(255,255,255,0.28); border-radius: 6px;"
												></div>
												<div
													style="height: 26px; width: 72px; background: #FF9B73; border-radius: 9999px; opacity: 0.9;"
												></div>
											</div>
										</div>

										<!-- Upload spinner -->
										{#if $gameCreateStore.thumbnailStatus === 'uploading'}
											<div
												class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50"
											>
												<svg
													class="h-6 w-6 animate-spin text-white"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													></circle>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												<span class="text-xs text-white">กำลังอัพโหลด...</span>
											</div>
										{:else}
											<!-- Drag hint pill -->
											<div
												class="absolute top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white"
												style="background: rgba(0,0,0,0.42); backdrop-filter: blur(6px); white-space: nowrap; pointer-events: none;"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="12"
													height="12"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2.5"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d="M5 9l-3 3 3 3" /><path d="M9 5l3-3 3 3" /><path
														d="M15 19l3 3 3-3"
													/><path d="M19 9l3 3-3 3" /><path d="M2 12h20" /><path d="M12 2v20" />
												</svg>
												ลากเพื่อปรับตำแหน่ง
											</div>

											<!-- Reset position button -->
											<!-- {#if $gameCreateStore.thumbnailPosition.x !== 50 || $gameCreateStore.thumbnailPosition.y !== 50}
											<button
												type="button"
												onclick={(e) => { e.stopPropagation(); updateThumbnailPosition(50, 50); }}
												class="absolute top-2.5 right-2.5 rounded-full px-2.5 py-1 text-xs text-white transition-opacity hover:opacity-90"
												style="background: rgba(0,0,0,0.42); backdrop-filter: blur(6px);"
											>
												รีเซ็ต
											</button>
										{/if} -->
										{/if}
									</div>
								</div>
								<!-- end justify-center wrapper -->

								<!-- Controls row -->
								<div class="flex flex-wrap items-center gap-2">
									<label
										class="hover:text-primary-700 cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
									>
										เปลี่ยนรูป
										<input
											type="file"
											accept="image/png,image/jpeg,image/webp"
											onchange={handleThumbnailPick}
											class="sr-only"
										/>
									</label>
									<button
										type="button"
										onclick={removeThumbnail}
										class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
									>
										ลบรูป
									</button>
									<span class="ml-auto text-xs text-gray-400"
										>ตำแหน่งจะถูกบันทึกเมื่อกด "บันทึก"</span
									>
								</div>

								{#if $gameCreateStore.thumbnailStatus === 'error'}
									<p class="text-xs text-red-500">{$gameCreateStore.thumbnailError}</p>
								{/if}
							{:else}
								<!-- ── Upload picker ──────────────────────────────────── -->
								<label
									class="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-primary-300 hover:bg-primary-50/60"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="28"
										height="28"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="text-gray-300"
									>
										<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
										<circle cx="9" cy="9" r="2" />
										<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
									</svg>
									<span class="text-sm font-medium text-gray-400">คลิกเพื่อเลือกภาพปก</span>
									<span class="text-xs text-gray-300">PNG · JPG · WebP · แนะนำสัดส่วน 16:9</span>
									<input
										type="file"
										accept="image/png,image/jpeg,image/webp"
										onchange={handleThumbnailPick}
										class="sr-only"
									/>
								</label>
							{/if}
						</div>

						<!-- ! Difficulty + Public toggle -->
						<div class="flex flex-wrap items-end gap-6">
							<div class="flex flex-col gap-1.5">
								<label for="difficulty" class="text-sm font-medium text-gray-700"
									>ระดับความยาก</label
								>
								<select
									id="difficulty"
									value={$gameCreateStore.difficulty}
									onchange={(e) =>
										gameCreateStore.update((s) => ({
											...s,
											difficulty: (e.target as HTMLSelectElement).value
										}))}
									class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
								>
									<option value="">ไม่ระบุ</option>
									<option value="easy">ง่าย</option>
									<option value="medium">กลาง</option>
									<option value="hard">ยาก</option>
								</select>
							</div>

							<label class="flex cursor-pointer items-center gap-2.5 pb-0.5 select-none">
								<button
									type="button"
									role="switch"
									aria-checked={$gameCreateStore.isPublic}
									aria-label="เผยแพร่สาธารณะ"
									onclick={() => gameCreateStore.update((s) => ({ ...s, isPublic: !s.isPublic }))}
									class="relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 {$gameCreateStore.isPublic
										? 'bg-primary-500'
										: 'bg-gray-200'}"
								>
									<span
										class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {$gameCreateStore.isPublic
											? 'left-[calc(100%-1.375rem)]'
											: 'left-0.5'}"
									></span>
								</button>
								<span class="text-sm text-gray-700">เผยแพร่สาธารณะ</span>
							</label>
						</div>
					</div>
				</section>

				<!-- ! ── Images section ────────────────────────────────────── -->
				<!-- Hidden multi-file input triggered by the button -->
				<input
					bind:this={fileInputEl}
					type="file"
					accept="image/png,image/jpeg,image/webp"
					multiple
					onchange={(e) => {
						const input = e.target as HTMLInputElement;
						if (input.files?.length) handleDropFiles(input.files);
						input.value = '';
					}}
					class="sr-only"
				/>

				<section
					aria-label="รูปภาพเกม"
					class="flex flex-col gap-3"
					ondragover={(e) => {
						e.preventDefault();
						isDragging = true;
					}}
					ondragleave={(e) => {
						if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node))
							isDragging = false;
					}}
					ondrop={(e) => {
						e.preventDefault();
						isDragging = false;
						if (e.dataTransfer?.files.length) handleDropFiles(e.dataTransfer.files);
					}}
				>
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">
							รูปภาพ
							<span class="ml-1 font-normal text-gray-400 normal-case"
								>({$gameCreateStore.slots.length} รูป)</span
							>
						</h2>
						<button
							type="button"
							onclick={() => fileInputEl.click()}
							class="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-400 active:bg-primary-600"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							เพิ่มรูป
						</button>
					</div>

					{#if $gameCreateStore.slots.length === 0}
						<div
							class="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-14 text-center transition-colors {isDragging
								? 'border-primary-400 bg-primary-50'
								: 'border-gray-200 bg-white'}"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="36"
								height="36"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="transition-colors {isDragging ? 'text-primary-400' : 'text-gray-300'}"
							>
								<polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path
									d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
								/>
							</svg>
							<div class="flex flex-col gap-1">
								<p class="text-sm font-medium {isDragging ? 'text-primary-500' : 'text-gray-500'}">
									{isDragging ? 'วางรูปที่นี่' : 'ลากและวางรูปภาพที่นี่'}
								</p>
								<p class="text-xs text-gray-400">หรือกดปุ่ม "เพิ่มรูป" · PNG · JPG · WEBP ≤ 5 MB</p>
							</div>
						</div>
					{/if}

					{#each $gameCreateStore.slots as slot, idx (slot._id)}
						<div
							class="overflow-hidden rounded-2xl border border-primary-100/60 bg-white/80 shadow-md"
						>
							<!-- ! Slot header -->
							<div
								class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2.5"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600"
								>
									{idx + 1}
								</span>
								<div class="flex items-center gap-0.5">
									<button
										type="button"
										onclick={() => moveUp(idx)}
										disabled={idx === 0}
										title="เลื่อนขึ้น"
										aria-label="เลื่อนขึ้น"
										class="flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="m18 15-6-6-6 6" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => moveDown(idx)}
										disabled={idx === $gameCreateStore.slots.length - 1}
										title="เลื่อนลง"
										aria-label="เลื่อนลง"
										class="flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="m6 9 6 6 6-6" />
										</svg>
									</button>
									<div class="mx-1.5 h-4 w-px bg-gray-200"></div>
									<button
										type="button"
										onclick={() => removeSlot(slot._id)}
										title="ลบรูปนี้"
										aria-label="ลบรูปนี้"
										class="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-error"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path
												d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
											/>
										</svg>
									</button>
								</div>
							</div>

							<!-- ! Slot body -->
							<div class="flex flex-col gap-4 p-4 sm:flex-row">
								<!-- ! Image area -->
								<div class="shrink-0">
									{#if slot.previewUrl}
										<div
											class="relative h-44 w-44 overflow-hidden rounded-xl border border-gray-200"
										>
											<img
												src={slot.previewUrl}
												alt="Preview {idx + 1}"
												class="h-full w-full object-cover"
											/>

											{#if slot.status === 'uploading'}
												<div
													class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50"
												>
													<svg
														class="h-6 w-6 animate-spin text-white"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
													>
														<circle
															class="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															stroke-width="4"
														></circle>
														<path
															class="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
														></path>
													</svg>
													<span class="text-xs text-white">กำลังอัพโหลด...</span>
												</div>
											{:else if slot.status === 'error'}
												<div
													class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/60 px-3 text-center"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="#FF6B6B"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<circle cx="12" cy="12" r="10" /><line
															x1="12"
															y1="8"
															x2="12"
															y2="12"
														/><line x1="12" y1="16" x2="12.01" y2="16" />
													</svg>
													<span class="text-xs leading-tight text-white">{slot.errorMsg}</span>
												</div>
											{:else if slot.status === 'done'}
												<div
													class="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-success shadow"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill="none"
														stroke="white"
														stroke-width="3"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<polyline points="20 6 9 17 4 12" />
													</svg>
												</div>
											{/if}

											<label
												class="absolute bottom-2 left-2 cursor-pointer rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow transition-opacity hover:bg-white {slot.status ===
												'uploading'
													? 'pointer-events-none opacity-0'
													: ''}"
											>
												เปลี่ยนรูป
												<input
													type="file"
													accept="image/png,image/jpeg,image/webp"
													onchange={(e) => handleFilePick(slot._id, e)}
													class="sr-only"
												/>
											</label>
										</div>
									{:else}
										<label
											class="flex h-44 w-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center transition-colors hover:border-primary-400 hover:bg-primary-100/30"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="28"
												height="28"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="text-gray-400"
											>
												<rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle
													cx="8.5"
													cy="8.5"
													r="1.5"
												/><polyline points="21 15 16 10 5 21" />
											</svg>
											<span class="text-xs text-gray-400">คลิกเพื่อเลือกรูป</span>
											<span class="text-xs text-gray-300">PNG · JPG · WEBP ≤ 5 MB</span>
											<input
												type="file"
												accept="image/png,image/jpeg,image/webp"
												onchange={(e) => handleFilePick(slot._id, e)}
												class="sr-only"
											/>
										</label>
									{/if}
								</div>

								<!-- ! Fields -->
								<div class="flex flex-1 flex-col gap-3">
									<!-- ! Answer -->
									<div class="flex flex-col gap-1">
										<label for="answer-{slot._id}" class="text-xs font-medium text-gray-700">
											คำตอบ <span class="text-error">*</span>
										</label>
										<input
											id="answer-{slot._id}"
											type="text"
											value={slot.answer}
											oninput={(e) =>
												updateSlotField(slot._id, 'answer', (e.target as HTMLInputElement).value)}
											placeholder="คำตอบของรูปนี้"
											class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
										/>
									</div>

									<!-- ! Hints -->
									<div class="flex flex-col gap-1.5">
										<div class="flex items-center justify-between">
											<span class="text-xs font-medium text-gray-700">คำใบ้ (ไม่บังคับ)</span>
											<button
												type="button"
												onclick={() => addHint(slot._id)}
												class="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="10"
													height="10"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2.5"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<line x1="12" y1="5" x2="12" y2="19" /><line
														x1="5"
														y1="12"
														x2="19"
														y2="12"
													/>
												</svg>
												เพิ่มคำใบ้
											</button>
										</div>

										{#if slot.hints.length === 0}
											<p class="text-xs text-gray-400">
												ยังไม่มีคำใบ้ · กด "เพิ่มคำใบ้" เพื่อเพิ่ม
											</p>
										{:else}
											<ul class="flex flex-col gap-1.5">
												{#each slot.hints as h (h._id)}
													<li class="flex items-center gap-1.5">
														<!-- order badge -->
														<span
															class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/15 text-xs font-bold text-warning"
														>
															{h.orderIndex + 1}
														</span>
														<!-- input -->
														<input
															type="text"
															value={h.hint}
															oninput={(e) =>
																updateHint(slot._id, h._id, (e.target as HTMLInputElement).value)}
															placeholder="ข้อความคำใบ้..."
															class="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none placeholder:text-gray-400 focus:border-warning/60 focus:ring-2 focus:ring-warning/10"
														/>
														<!-- move up -->
														<button
															type="button"
															onclick={() => moveHintUp(slot._id, h._id)}
															disabled={h.orderIndex === 0}
															aria-label="เลื่อนขึ้น"
															class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																width="12"
																height="12"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2.5"
																stroke-linecap="round"
																stroke-linejoin="round"
															>
																<path d="m18 15-6-6-6 6" />
															</svg>
														</button>
														<!-- move down -->
														<button
															type="button"
															onclick={() => moveHintDown(slot._id, h._id)}
															disabled={h.orderIndex === slot.hints.length - 1}
															aria-label="เลื่อนลง"
															class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																width="12"
																height="12"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2.5"
																stroke-linecap="round"
																stroke-linejoin="round"
															>
																<path d="m6 9 6 6 6-6" />
															</svg>
														</button>
														<!-- delete -->
														<button
															type="button"
															onclick={() => removeHint(slot._id, h._id)}
															aria-label="ลบคำใบ้"
															class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-error"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																width="12"
																height="12"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2.5"
																stroke-linecap="round"
																stroke-linejoin="round"
															>
																<path d="M18 6 6 18" /><path d="m6 6 12 12" />
															</svg>
														</button>
													</li>
												{/each}
											</ul>
										{/if}
									</div>

									<!-- ! Grid · Time · MaxReveal -->
									<div class="flex flex-wrap gap-3">
										<div class="flex flex-col gap-1">
											<label for="grid-{slot._id}" class="text-xs font-medium text-gray-700"
												>ขนาดตาราง</label
											>
											<select
												id="grid-{slot._id}"
												value={slot.gridSize}
												onchange={(e) =>
													updateSlotField(
														slot._id,
														'gridSize',
														Number((e.target as HTMLSelectElement).value)
													)}
												class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
											>
												<option value={3}>3 × 3</option>
												<option value={4}>4 × 4</option>
												<option value={5}>5 × 5</option>
												<option value={6}>6 × 6</option>
											</select>
										</div>

										<div class="flex flex-col gap-1">
											<label for="time-{slot._id}" class="text-xs font-medium text-gray-700"
												>จำกัดเวลา (วิ)</label
											>
											<input
												id="time-{slot._id}"
												type="number"
												value={slot.timeLimit}
												oninput={(e) =>
													updateSlotField(
														slot._id,
														'timeLimit',
														(e.target as HTMLInputElement).value
													)}
												placeholder="ไม่จำกัด"
												min="5"
												class="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
											/>
										</div>

										<div class="flex flex-col gap-1">
											<label for="reveal-{slot._id}" class="text-xs font-medium text-gray-700"
												>เปิดสูงสุด (ช่อง)</label
											>
											<input
												id="reveal-{slot._id}"
												type="number"
												value={slot.maxReveal}
												oninput={(e) =>
													updateSlotField(
														slot._id,
														'maxReveal',
														(e.target as HTMLInputElement).value
													)}
												placeholder="ไม่จำกัด"
												min="1"
												class="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}

					<!-- Drop target shown at the bottom when slots exist and user is dragging -->
					{#if isDragging && $gameCreateStore.slots.length > 0}
						<div
							class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-400 bg-primary-50 py-6 text-sm font-medium text-primary-500"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path
									d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
								/>
							</svg>
							วางรูปที่นี่เพื่อเพิ่ม
						</div>
					{/if}
				</section>

				<!-- ! ── Error + Submit ─────────────────────────────────────── -->
				{#if $gameCreateStore.submitError}
					<div class="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
						{$gameCreateStore.submitError}
					</div>
				{/if}

				<button
					type="submit"
					disabled={$gameCreateStore.submitting}
					class="w-full rounded-xl bg-primary-500 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-400 active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
				>
					{#if $gameCreateStore.submitting}
						<span class="flex items-center justify-center gap-2">
							<svg
								class="h-4 w-4 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							กำลังบันทึก...
						</span>
					{:else}
						{isEditMode ? 'บันทึกการแก้ไข' : 'สร้างเกม'}
					{/if}
				</button>
			</form>
		</div>
	</div>

	<!-- Guest notice modal -->
	{#if showGuestNotice}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			transition:fade={{ duration: 150 }}
		>
			<div
				class="mx-4 w-full max-w-[26rem] rounded-2xl bg-white p-6 shadow-xl"
				transition:scale={{ duration: 200, start: 0.92, opacity: 0 }}
			>
				<div class="flex items-start justify-between gap-3">
					<h3 class="text-base font-semibold text-gray-900">ยังไม่ได้เข้าสู่ระบบนะ</h3>
					<button
						type="button"
						onclick={() => (showGuestNotice = false)}
						aria-label="ปิด"
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				<p class="mt-2 text-sm text-gray-500">
					ไม่สมัครก็สร้างเกมได้ แต่สมัครไว้ จะได้กลับมาดูเกมทีหลังได้ !
				</p>

				<div class="mt-5 flex gap-3">
					<button
						type="button"
						onclick={() => (showGuestNotice = false)}
						class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						สร้างเกมต่อ
					</button>
					<button
						type="button"
						onclick={() => goto('/auth/register')}
						class="flex-1 rounded-xl bg-primary-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-400"
					>
						สมัครสมาชิก
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
