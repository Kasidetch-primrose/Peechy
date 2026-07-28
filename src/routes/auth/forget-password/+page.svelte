<script lang="ts">
	import AnimatedCardShell from '$lib/components/ui/animated-card-shell.svelte';
	import FloatingInput from '$lib/components/ui/floating-input.svelte';

	let email = $state('');
	let loading = $state(false);
	let error = $state('');
	let sent = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim() })
			});
			const data: { status: string; message?: string } = await res.json();
			if (data.status === 'success') {
				sent = true;
			} else {
				error = data.message ?? 'ไม่สามารถส่งคำขอได้';
			}
		} catch {
			error = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-transparent px-4 py-12">
	<div class="game-enter w-full max-w-[36rem]">
		<!-- Brand -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-2xl shadow-sm"
			>
				🔑
			</div>
			<h1 class="text-2xl font-bold text-gray-900">ลืมรหัสผ่าน?</h1>
			<p class="mt-1 text-sm text-gray-500">กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
		</div>

		<!-- Card -->
		<AnimatedCardShell>
			{#if sent}
				<!-- Success state -->
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl"
					>
						✅
					</div>
					<div>
						<p class="font-semibold text-gray-900">ส่งอีเมลแล้ว!</p>
						<p class="mt-1 text-sm text-gray-500">
							กรุณาตรวจสอบกล่องจดหมายของ
							<span class="font-medium text-gray-700">{email}</span>
							และคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน
						</p>
					</div>
					<p class="text-xs text-gray-400">
						ไม่เจออีเมล? กรุณาตรวจสอบในโฟลเดอร์สแปม หรือ
						<button
							type="button"
							onclick={() => (sent = false)}
							class="text-primary-500 hover:underline"
						>
							ลองอีกครั้ง
						</button>
					</p>
				</div>
			{:else}
				<!-- Form state -->
				<form onsubmit={handleSubmit} class="flex flex-col gap-5">
					<div class="flex flex-col gap-1.5">
						<FloatingInput
							id="email"
							label="อีเมล"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
						/>
						<p class="text-xs text-gray-400">เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลนี้</p>
					</div>

					<!-- Error -->
					{#if error}
						<p class="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
					{/if}

					<!-- Submit -->
					<button
						type="submit"
						disabled={loading}
						class="w-full rounded-full bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 active:bg-primary-600 disabled:opacity-60"
					>
						{#if loading}
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
								กำลังส่ง...
							</span>
						{:else}
							ส่งลิงก์รีเซ็ตรหัสผ่าน
						{/if}
					</button>
				</form>
			{/if}
		</AnimatedCardShell>

		<!-- Back to login -->
		<p class="mt-5 text-center text-sm text-gray-500">
			<a
				href="/auth/login"
				class="font-medium text-primary-500 hover:text-primary-600 hover:underline"
			>
				← กลับไปหน้าเข้าสู่ระบบ
			</a>
		</p>
	</div>
</div>
