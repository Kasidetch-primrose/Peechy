<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AuthService from '$lib/data/services/auth';
	import { authUserStore } from '$lib/data/stores/authUser';
	import AnimatedLoginCard from '$lib/components/ui/animated-login-card.svelte';

	let email = $state('');
	let password = $state('');
	let rememberMe = $state(false);
	let showPassword = $state(false);
	let loading = $state(false);

	const oauthErrorMessages: Record<string, string> = {
		oauth_cancelled: 'ยกเลิกการเข้าสู่ระบบด้วย Social',
		oauth_invalid_state: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
		oauth_failed: 'เข้าสู่ระบบด้วย Social ไม่สำเร็จ กรุณาลองใหม่',
		no_ticket: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
	};

	let error = $state(oauthErrorMessages[$page.url.searchParams.get('error') ?? ''] ?? '');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		const result = await AuthService.login(email, password);
		loading = false;
		if (result.status === 'success') {
			authUserStore.set({
				accessToken: result.accessToken,
				refreshToken: result.refreshToken,
				user: result.user
			});
			goto('/');
		} else {
			error = result.message ?? 'เข้าสู่ระบบไม่สำเร็จ';
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-transparent px-4 py-12">
	<div class="animate-game-enter w-full max-w-[36rem]">
		<!-- Brand -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-2xl shadow-sm"
			>
				🎮
			</div>
			<h1 class="text-2xl font-bold text-gray-900">ยินดีต้อนรับกลับ</h1>
			<p class="mt-1 text-sm text-gray-500">เข้าสู่ระบบเพื่อเล่นและสร้างเกม</p>
		</div>

		<!-- Card -->
		<AnimatedLoginCard
			bind:email
			bind:password
			bind:rememberMe
			bind:showPassword
			{loading}
			{error}
			onsubmit={handleSubmit}
		/>

		<!-- todo: facebook & google login -->
	</div>
</div>
