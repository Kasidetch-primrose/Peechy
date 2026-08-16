<script lang="ts">
	let open = $state(false);
	let activeTab = $state<'solo' | 'multiplayer'>('solo');

	function close() {
		open = false;
	}
</script>

<button
	type="button"
	onclick={() => (open = true)}
	aria-label="วิธีเล่นเกม"
	class="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 transition-transform hover:scale-105 hover:bg-primary-400 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="26"
		height="26"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="10" />
		<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" />
		<line x1="12" y1="17" x2="12.01" y2="17" />
	</svg>
</button>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="วิธีเล่นเกม"
	>
		<div class="w-full max-w-[32rem] rounded-2xl bg-white p-6 shadow-xl">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">วิธีเล่น</h3>
				<button
					type="button"
					onclick={close}
					aria-label="ปิด"
					class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
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

			<!-- Tabs -->
			<div class="mt-4 flex gap-1 rounded-full bg-primary-100 p-1">
				<button
					type="button"
					onclick={() => (activeTab = 'solo')}
					class={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
						activeTab === 'solo'
							? 'bg-white text-primary-600 shadow-sm'
							: 'text-gray-600 hover:text-primary-500'
					}`}
				>
					เล่นคนเดียว
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'multiplayer')}
					class={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
						activeTab === 'multiplayer'
							? 'bg-white text-primary-600 shadow-sm'
							: 'text-gray-600 hover:text-primary-500'
					}`}
				>
					เล่นหลายคน
				</button>
			</div>

			<!-- Tab content -->
			<div class="mt-5 max-h-[60vh] overflow-y-auto text-sm text-gray-700">
				{#if activeTab === 'solo'}
					<ul class="flex flex-col gap-3">
						<li class="flex gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
								>1</span
							>
							<span
								>ภาพจะถูกซ่อนไว้ด้วยตาราง แตะเปิดช่องทีละช่องเพื่อดูภาพด้านใน ยิ่งเปิดน้อย
								คะแนนยิ่งสูง</span
							>
						</li>
						<li class="flex gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
								>2</span
							>
							<span>ใช้คำใบ้ได้หากติดขัด แต่การใช้คำใบ้จะหักคะแนน</span>
						</li>
						<li class="flex gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
								>3</span
							>
							<span>พิมพ์คำตอบแล้วกดส่ง ระบบจะตรวจคำตอบแบบใกล้เคียงให้ด้วย</span>
						</li>
						<li class="flex gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
								>4</span
							>
							<span>ตอบถูกแล้วไปภาพถัดไปจนจบเกม สามารถกดยกเลิกการเปิดช่องล่าสุดได้หากเปิดผิด</span>
						</li>
					</ul>
				{:else}
					<div class="flex flex-col gap-6">
						<!-- Connection guide -->
						<div>
							<h4 class="mb-3 text-xs font-semibold tracking-wide text-primary-500 uppercase">
								วิธีเชื่อมต่อ
							</h4>
							<ul class="flex flex-col gap-3">
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>1</span
									>
									<span>เจ้าของห้องกดสร้างห้องจากหน้ารายละเอียดเกม เลือกเวลาต่อเทิร์น แล้วจะได้รหัสห้อง 5 หลัก</span>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>2</span
									>
									<span>แชร์รหัสห้องให้เพื่อน ผู้เล่นคนอื่นกรอกรหัสที่ช่อง "รหัสห้อง" เพื่อเข้าร่วมในล็อบบี้</span>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>3</span
									>
									<span>รอในล็อบบี้จนครบคน แล้วเจ้าของห้องกด "เริ่มเกม" — เข้าร่วมเพิ่มไม่ได้หลังเริ่มแล้ว</span>
								</li>
							</ul>
						</div>

						<!-- Rules -->
						<div>
							<h4 class="mb-3 text-xs font-semibold tracking-wide text-primary-500 uppercase">
								กติกาเกม
							</h4>
							<ul class="flex flex-col gap-3">
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span>ระบบสลับคิวผู้เล่นแบบสุ่ม ในแต่ละครั้งจะมีผู้เล่นเพียงคนเดียวที่ได้เล่นตามเวลาที่กำหนด</span>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span
										>ในหนึ่งเทิร์น ผู้เล่นเปิดช่องได้ <b>1 ช่อง</b> และทายคำตอบได้สูงสุด
										<b>2 ครั้ง</b> ก่อนหมดเวลา</span
									>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span>ใช้คำใบ้ได้ 1 ครั้งต่อเทิร์น โดยเห็นเฉพาะผู้เล่นที่ขอเท่านั้น</span>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span>ถ้าหมดเวลาโดยยังไม่เปิดช่อง ระบบจะสุ่มเปิดช่องให้อัตโนมัติ แล้วส่งเทิร์นให้คนถัดไปทันที</span>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span
										>ทายถูกเมื่อไหร่ ภาพนั้นจบทันที คะแนนคำนวณจากจำนวนช่องที่ถูกเปิดไปทั้งหมดเทียบกับช่องทั้งภาพ —
										ยิ่งเปิดน้อยตอนทายถูก คะแนนยิ่งสูง (สูงสุด 100 คะแนนต่อภาพ)</span
									>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span>ถ้าเปิดจนครบทุกช่องโดยไม่มีใครทายถูก ภาพนั้นไม่มีใครได้คะแนน แล้วข้ามไปภาพถัดไป</span>
								</li>
								<li class="flex gap-3">
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600"
										>•</span
									>
									<span>เล่นครบทุกภาพแล้ว ผู้เล่นที่มีคะแนนรวมสูงสุดเป็นผู้ชนะ</span>
								</li>
							</ul>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
