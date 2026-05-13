<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameCardSkeleton from '$lib/components/GameCardSkeleton.svelte';
	import type { Game } from '$lib/components/GameCard.svelte';
	import HomeHeader from '$lib/components/HomeHeader.svelte';

	// Simulated async load — replace with real SvelteKit load() data in production
	let loading = $state(true);
	let games = $state<Game[]>([]);

	const MOCK_GAMES: Game[] = [
		{
			id: '1',
			title: 'ปริศนาคำทาย',
			description: 'ทายคำจากคำใบ้! เล่นได้ทั้งห้องเรียน สนุกและฝึกคำศัพท์ได้ในเวลาเดียวกัน',
			category: 'คำศัพท์',
			playerCount: 3241,
			coverColor: '#FFE5DC',
			emoji: '🧩'
		},
		{
			id: '2',
			title: 'คณิตเร็ว',
			description: 'แข่งกันตอบโจทย์คณิตศาสตร์ให้เร็วที่สุด ฝึกทักษะการคิดเลขในหัวแบบสนุก',
			category: 'คณิตศาสตร์',
			playerCount: 5812,
			coverColor: '#E8F4FF',
			emoji: '⚡'
		},
		{
			id: '3',
			title: 'จับคู่รูปภาพ',
			description: 'เปิดการ์ดและจับคู่รูปภาพที่เหมือนกัน ฝึกความจำและสมาธิ เหมาะสำหรับทุกวัย',
			category: 'ความจำ',
			playerCount: 2108,
			coverColor: '#F0FFF4',
			emoji: '🃏'
		},
		{
			id: '4',
			title: 'ตอบถูกรับรางวัล',
			description: 'ควิซแบบทีม ตอบคำถามแล้วสะสมคะแนน ปรับเนื้อหาได้ตามวิชา',
			category: 'ควิซ',
			playerCount: 9470,
			coverColor: '#FFFBEA',
			emoji: '🏆'
		},
		{
			id: '5',
			title: 'เรียงประโยค',
			description: 'นำคำมาเรียงให้เป็นประโยคที่ถูกต้อง ฝึกไวยากรณ์และการใช้ภาษาไทย',
			category: 'ภาษาไทย',
			playerCount: 1654,
			coverColor: '#F5F3FF',
			emoji: '📝'
		},
		{
			id: '6',
			title: 'ภูมิศาสตร์โลก',
			description: 'ทายชื่อประเทศ เมืองหลวง และธงชาติ ขยายความรู้เรื่องภูมิศาสตร์แบบสนุก',
			category: 'สังคมศึกษา',
			playerCount: 4320,
			coverColor: '#E6F7FF',
			emoji: '🌍'
		}
	];

	const categories = [
		'ทั้งหมด',
		'คำศัพท์',
		'คณิตศาสตร์',
		'ความจำ',
		'ควิซ',
		'ภาษาไทย',
		'สังคมศึกษา'
	];
	let activeCategory = $state('ทั้งหมด');
	let searchQuery = $state('');

	let filtered = $derived(
		MOCK_GAMES.filter((g) => {
			const matchCat = activeCategory === 'ทั้งหมด' || g.category === activeCategory;
			const matchSearch =
				g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				g.description.toLowerCase().includes(searchQuery.toLowerCase());
			return matchCat && matchSearch;
		})
	);

	// Simulate network delay
	$effect(() => {
		const t = setTimeout(() => {
			games = MOCK_GAMES;
			loading = false;
		}, 1400);
		return () => clearTimeout(t);
	});
</script>

<Navbar />

<main class="min-h-screen bg-gray-100">
	<!-- ! ! HomeHeader -->
	<!-- ! ! <HomeHeader /> -->

	<!-- ! ! Games section -->
	<section id="games" class="mx-auto max-w-6xl px-lg py-2xl">
		<!-- ! ! Section header -->
		<div class="mb-lg flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-2xl font-semibold text-gray-900">เกมยอดนิยม</h2>
				<p class="mt-xs text-sm text-gray-700">เลือกเกมที่เหมาะกับคุณ</p>
			</div>

			<!-- ! ! Search -->
			<div class="relative w-full sm:w-auto">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="absolute top-1/2 left-sm -translate-y-1/2 text-gray-400"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
				<input
					type="search"
					placeholder="ค้นหาเกม..."
					bind:value={searchQuery}
					class="w-full rounded-lg border border-gray-200 bg-white py-sm pr-md pl-lg text-sm text-gray-900
                           placeholder:text-gray-400
                           focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
				/>
			</div>
		</div>

		<!-- ! ! Category filter -->
		<div class="mb-lg flex flex-wrap gap-sm">
			{#each categories as cat}
				<button
					onclick={() => (activeCategory = cat)}
					class="rounded-full px-md py-xs text-sm font-medium transition-colors
                           focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none
                           {activeCategory === cat
						? 'bg-primary-500 text-white'
						: 'border border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-500'}"
				>
					{cat}
				</button>
			{/each}
		</div>

		<!-- ! ! Grid -->
		{#if loading}
			<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
				{#each { length: 6 } as _}
					<GameCardSkeleton />
				{/each}
			</div>
		{:else if filtered.length === 0}
			<div class="flex flex-col items-center gap-md py-2xl text-center">
				<span class="text-5xl">🔍</span>
				<p class="text-gray-700">ไม่พบเกมที่คุณค้นหา</p>
				<button
					onclick={() => {
						searchQuery = '';
						activeCategory = 'ทั้งหมด';
					}}
					class="rounded-lg border border-gray-200 px-lg py-sm text-sm text-gray-700 hover:border-primary-400 hover:text-primary-500"
				>
					ล้างการค้นหา
				</button>
			</div>
		{:else}
			<div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as game (game.id)}
					<GameCard {game} />
				{/each}
			</div>
		{/if}
	</section>
</main>
