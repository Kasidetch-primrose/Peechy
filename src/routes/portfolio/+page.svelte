<script lang="ts">
	// Public case-study page for Peechy (linked from the admin's profile).
	// Every piece of copy has a Thai and an English version; `lang` picks one.
	type Lang = 'th' | 'en';
	type Text = { th: string; en: string };

	let lang = $state<Lang>('th');
	const t = (text: Text) => text[lang];

	const GITHUB_URL = 'https://github.com/Kasidetch-primrose/peechy';
	const LINKEDIN_URL = 'https://www.linkedin.com/in/kasidetch-kongkaew-912a56280/';
	const EMAIL = 'kasidetch.k@hotmail.com';
	const PHONE = '098-929-8343';
	const PHONE_TEL = '+66989298343';

	const owner = {
		name: { th: 'กษิดิ์เดช กองแก้ว', en: 'Kasidetch Kongkaew' },
		nickname: { th: 'ต้า', en: 'Tar' }
	};

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(EMAIL);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard can be blocked (e.g. insecure context) — the address stays visible to copy by hand.
		}
	}

	const hero = {
		tagline: {
			th: 'เกมทายภาพที่ค่อย ๆ เปิดป้ายทีละช่อง ยิ่งเปิดน้อยแล้วทายถูก ยิ่งได้คะแนนเยอะ',
			en: 'A picture-guessing game where you uncover a hidden image one tile at a time. Guess it with fewer tiles open and you score more.'
		},
		byline: {
			th: 'Personal project · Kasidetch Kongkaew',
			en: 'Personal project · Kasidetch Kongkaew'
		},
		play: { th: 'ลองเล่นเลย', en: 'Try it now' },
		code: { th: 'ดูโค้ดบน GitHub', en: 'View code on GitHub' }
	};

	const steps: { icon: string; title: Text; body: Text }[] = [
		{
			icon: '🔲',
			title: { th: 'เปิดป้าย', en: 'Reveal tiles' },
			body: {
				th: 'ภาพถูกซ่อนไว้ใต้แผ่นป้าย กดเปิดทีละช่องเพื่อดูบางส่วนของภาพ',
				en: 'The picture is hidden under a grid. Open one tile at a time to see a piece of it.'
			}
		},
		{
			icon: '💬',
			title: { th: 'ทายภาพ', en: 'Guess' },
			body: {
				th: 'พิมพ์คำตอบได้เลย ถ้าพิมพ์ผิดเล็กน้อย เกมจะบอกว่า "เกือบถูกแล้ว" ให้ลองใหม่',
				en: 'Type your answer. If it has a small typo, the game says "almost there" so you can try again.'
			}
		},
		{
			icon: '⭐',
			title: { th: 'รับคะแนน', en: 'Score' },
			body: {
				th: 'ยิ่งเหลือช่องที่ยังปิดอยู่มาก ยิ่งได้คะแนนเยอะ ส่วนการใช้คำใบ้จะถูกหักคะแนน',
				en: 'The more tiles still closed when you get it right, the higher your score. Using a hint costs points.'
			}
		}
	];

	const features: { icon: string; href: string | null; ready: boolean; title: Text; body: Text }[] =
		[
			{
				icon: '🎯',
				href: '/',
				ready: true,
				title: { th: 'เล่นคนเดียว', en: 'Play solo' },
				body: {
					th: 'เลือกเกมจากหน้าแรกแล้วเล่นได้ทันที ไม่ต้องสมัครสมาชิก',
					en: 'Pick a game on the home page and start right away — no sign-up needed.'
				}
			},
			{
				icon: '🛠️',
				href: '/game/create',
				ready: true,
				title: { th: 'สร้างเกม', en: 'Create a game' },
				body: {
					th: 'อัปโหลดภาพ ตั้งคำตอบ ขนาดตาราง เวลา และคำใบ้ แล้วเผยแพร่ให้คนอื่นเล่น',
					en: 'Upload pictures, set the answer, grid size, timer and hints, then publish it for others.'
				}
			},
			{
				icon: '🎨',
				href: '/game/draw',
				ready: true,
				title: { th: 'วาดรูปด้วยกัน', en: 'Draw together' },
				body: {
					th: 'เปิดห้องแล้วแชร์รหัสให้เพื่อน วาดบนกระดาษแผ่นเดียวกันแบบเรียลไทม์ แล้วโหวตลงแกลเลอรี',
					en: 'Open a room, share the code, draw on the same canvas in real time, then vote to post it to the gallery.'
				}
			},
			{
				icon: '👥',
				href: null,
				ready: false,
				title: { th: 'เล่นกับเพื่อน', en: 'Play with friends' },
				body: {
					th: 'ผลัดกันเปิดป้ายและแข่งกันทายในห้องเดียวกัน ระบบเบื้องหลังเขียนไว้แล้ว กำลังเตรียมเปิดใช้',
					en: 'Take turns revealing tiles and race to guess in one room. The backend is built; it is being prepared for launch.'
				}
			}
		];

	const screens: { file: string; label: Text }[] = [
		{ file: 'home', label: { th: 'หน้าแรก', en: 'Home' } },
		{ file: 'play', label: { th: 'ระหว่างเล่น', en: 'Playing' } },
		{ file: 'create', label: { th: 'สร้างเกม', en: 'Create' } },
		{ file: 'gallery', label: { th: 'แกลเลอรี', en: 'Gallery' } }
	];

	const architecture = {
		browser: { th: 'เบราว์เซอร์ (มือถือ / คอม)', en: 'Browser (phone / desktop)' },
		web: {
			title: { th: 'Web app', en: 'Web app' },
			sub: { th: 'SvelteKit · หน้าเว็บ + API', en: 'SvelteKit · pages + API' }
		},
		realtime: {
			title: { th: 'Realtime server', en: 'Realtime server' },
			sub: { th: 'Socket.IO · ห้องเล่น/ห้องวาด', en: 'Socket.IO · game & drawing rooms' }
		},
		stores: [
			{ name: 'PostgreSQL', sub: { th: 'ข้อมูลหลัก', en: 'Main data' } },
			{ name: 'Redis', sub: { th: 'ข้อมูลชั่วคราว', en: 'Short-lived data' } },
			{ name: 'Cloudflare R2', sub: { th: 'ไฟล์ภาพ', en: 'Image files' } }
		],
		note: {
			th: 'ห้องแบบเรียลไทม์แยกไปอยู่บน server ของตัวเอง เพราะ web app รันแบบ serverless ซึ่งเปิดการเชื่อมต่อ WebSocket ค้างไว้นาน ๆ ไม่ได้',
			en: 'Real-time rooms live on their own server, because the web app runs serverless and serverless functions cannot keep a WebSocket connection open.'
		}
	};

	const decisions: { title: Text; body: Text }[] = [
		{
			title: {
				th: 'โหมดเล่นกับเพื่อน: คำตอบไม่ถูกส่งไปเบราว์เซอร์ระหว่างเล่น',
				en: 'Multiplayer: the answer stays on the server during play'
			},
			body: {
				th: 'ระหว่างที่รอบยังเล่นอยู่ server ส่งให้แค่ภาพกับจำนวนคำใบ้ คำตอบและข้อความคำใบ้ที่ยังไม่เปิดอยู่ที่ server เท่านั้น server เป็นคนตรวจคำตอบ และเปิดเผยคำตอบเมื่อจบรอบแล้ว',
				en: 'While a round is running, the server only sends the picture and the number of hints. The answer and unopened hint text stay on the server, which checks every guess and reveals the answer only when the round ends.'
			}
		},
		{
			title: {
				th: '"เกือบถูกแล้ว" เข้มขึ้นเมื่อเล่นกับเพื่อน',
				en: '"Almost there" is stricter in multiplayer'
			},
			body: {
				th: 'การจับคำที่พิมพ์ผิดใช้ fuzzy match เกณฑ์ 0.35 ตอนเล่นคนเดียว แต่ใช้ 0.25 ซึ่งเข้มกว่าตอนเล่นกับเพื่อน เพราะทุกคนในห้องเห็นผล "เกือบถูก" ของคนอื่น ถ้าใจดีเกินไปจะกลายเป็นการใบ้คำตอบให้คนอื่น',
				en: 'Typo matching uses a fuzzy threshold of 0.35 in solo play but a stricter 0.25 in multiplayer. Everyone in the room sees other players’ "almost there" results, so a looser match would leak the answer.'
			}
		},
		{
			title: {
				th: 'ภาพที่ลงแกลเลอรีมาจากข้อมูลฝั่ง server',
				en: 'Gallery posts are built from the server’s copy'
			},
			body: {
				th: 'เมื่อทุกคนในห้องโหวตให้ลงแกลเลอรี realtime server จะเก็บ snapshot ของห้อง (ลายเส้น ชื่อผลงาน และรายชื่อคนวาด) ไว้หลัง ticket ที่ใช้ได้ครั้งเดียว web app นำ ticket ไปแลกข้อมูลจาก server โดยตรง เบราว์เซอร์จึงแต่งข้อมูลผลงานหรือรายชื่อคนวาดเองไม่ได้',
				en: 'When everyone in the room votes to post, the realtime server freezes a snapshot of the room (strokes, title, who drew) behind a one-time ticket. The web app redeems that ticket directly with the server, so a browser cannot make up the artwork data or the list of artists.'
			}
		},
		{
			title: {
				th: 'ไม่ต้องสมัครก็เล่นและสร้างเกมได้',
				en: 'Guests can play and create without an account'
			},
			body: {
				th: 'ตอนที่ guest สร้างเกม server จะออก creatorToken แบบสุ่มให้เบราว์เซอร์เก็บไว้ เวลาจะแก้ไขหรือลบเกม server จะเช็ก token นี้ว่าเป็นเจ้าของจริงหรือไม่',
				en: 'When a guest creates a game, the server issues a random creatorToken that the browser keeps. Editing or deleting the game later requires that token, so the server can tell who owns it.'
			}
		}
	];

	const roles: { who: string; icon: string; body: Text }[] = [
		{
			who: 'Kasidetch',
			icon: '🙋',
			body: {
				th: 'คิดไอเดีย ออกแบบหน้าตาและการเล่น และตรวจ/ทดสอบทุกฟีเจอร์ด้วยตัวเอง',
				en: 'Came up with the idea, designed the look and the gameplay, and reviewed and tested every feature.'
			}
		},
		{
			who: 'Claude',
			icon: '🤖',
			body: {
				th: 'เขียนโค้ดส่วนใหญ่และกำหนดทิศทางการพัฒนา',
				en: 'Wrote most of the code, following my instructions and direction.'
			}
		},
		{
			who: 'ChatGPT',
			icon: '💡',
			body: {
				th: 'ช่วยคิดโครงสร้างและแนวทางของระบบ',
				en: 'Helped think through the system structure.'
			}
		}
	];

	const nextUp: Text[] = [
		{ th: 'เปิดใช้โหมดเล่นกับเพื่อน', en: 'Launch play-with-friends mode' },
		// { th: 'เพิ่มการ login ด้วย Facebook', en: 'Add Facebook login' },
		{ th: 'ทำระบบบัญชีให้ปลอดภัยขึ้น', en: 'Harden account security' },
		{
			th: 'ให้ห้องเล่นต่อได้แม้ server รีสตาร์ต',
			en: 'Let rooms survive a server restart'
		}
		// { th: 'เพิ่ม automated tests', en: 'Add automated tests' }
	];

	const stack: { name: string; body: Text }[] = [
		{
			name: 'SvelteKit',
			body: { th: 'ทำหน้าเว็บและ API ทั้งหมด', en: 'All web pages and the API' }
		},
		{
			name: 'Socket.IO',
			body: {
				th: 'ส่งข้อมูลแบบเรียลไทม์ในห้องเล่นและห้องวาด',
				en: 'Real-time messages in game and drawing rooms'
			}
		},
		{
			name: 'PostgreSQL',
			body: {
				th: 'เก็บผู้ใช้ เกม ภาพ และผลงานในแกลเลอรี',
				en: 'Stores users, games, pictures and gallery artworks'
			}
		},
		{
			name: 'Redis',
			body: {
				th: 'เก็บข้อมูลชั่วคราว เช่น รหัส OTP และสถานะห้อง',
				en: 'Short-lived data such as OTP codes and room state'
			}
		},
		{
			name: 'Cloudflare R2',
			body: { th: 'เก็บไฟล์ภาพที่อัปโหลด', en: 'Stores uploaded images' }
		}
	];

	const headings = {
		how: { th: 'เล่นอย่างไร', en: 'How it works' },
		features: { th: 'ทำอะไรได้บ้าง', en: 'What you can do' },
		screens: { th: 'หน้าจอจริง', en: 'Screens' },
		architecture: { th: 'โครงสร้างระบบ', en: 'How it is built' },
		decisions: { th: 'สิ่งที่ตั้งใจออกแบบไว้', en: 'Deliberate design choices' },
		behind: { th: 'เบื้องหลังการสร้าง', en: 'Behind the build' },
		next: { th: 'สิ่งที่จะทำต่อ', en: 'What’s next' },
		stack: { th: 'สร้างด้วยอะไร', en: 'Built with' },
		contact: { th: 'ติดต่อ', en: 'Contact' }
	};

	const labels = {
		ready: { th: 'ใช้งานได้แล้ว', en: 'Live' },
		wip: { th: 'กำลังพัฒนา', en: 'In progress' },
		open: { th: 'เปิดดู →', en: 'Open →' },
		copy: { th: 'คัดลอก', en: 'Copy' },
		copied: { th: 'คัดลอกแล้ว ✓', en: 'Copied ✓' },
		step: { th: 'ขั้นที่', en: 'Step' }
	};

	const card = 'rounded-2xl border border-primary-100/60 bg-white/85 shadow-sm backdrop-blur-sm';
</script>

<svelte:head>
	<title>Peechy — Portfolio · Kasidetch Kongkaew</title>
	<meta
		name="description"
		content="Peechy case study: a picture-guessing game built with SvelteKit, Socket.IO, PostgreSQL, Redis and Cloudflare R2."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-[64rem] px-md py-xl sm:px-lg sm:py-2xl" {lang}>
	<!-- Language toggle -->
	<div class="mb-lg flex justify-end">
		<div
			class="inline-flex rounded-full border border-primary-100/60 bg-white/85 p-2xs shadow-sm"
			role="group"
			aria-label="Language"
		>
			{#each [{ code: 'th', label: 'ไทย' }, { code: 'en', label: 'EN' }] as option (option.code)}
				<button
					type="button"
					onclick={() => (lang = option.code as Lang)}
					aria-pressed={lang === option.code}
					class="rounded-full px-md py-xs text-sm font-medium transition-colors {lang ===
					option.code
						? 'bg-primary-500 text-white'
						: 'text-gray-700 hover:bg-primary-50'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- 1. Hero -->
	<section class="{card} animate-game-enter px-lg py-2xl text-center sm:px-2xl">
		<p class="text-5xl" aria-hidden="true">🍑</p>
		<h1 class="mt-sm text-4xl font-bold text-gray-900 sm:text-5xl">Peechy</h1>
		<p class="mx-auto mt-md max-w-[36rem] text-lg text-gray-700">{t(hero.tagline)}</p>
		<p class="mt-sm text-sm text-gray-400">{t(hero.byline)}</p>
		<div class="mt-lg flex flex-col justify-center gap-sm sm:flex-row">
			<a
				href="/"
				class="rounded-full bg-btn-primary px-lg py-sm font-medium text-white shadow-sm transition-colors hover:bg-btn-primary-hover active:bg-btn-primary-active"
			>
				{t(hero.play)}
			</a>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-full border border-btn-secondary-border bg-white px-lg py-sm font-medium text-primary-600 transition-colors hover:bg-btn-secondary-hover"
			>
				{t(hero.code)}
			</a>
		</div>
	</section>

	<!-- 2. How to play -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.how)}</h2>
		<ol class="grid gap-md sm:grid-cols-3">
			{#each steps as step, i (i)}
				<li class="{card} p-lg">
					<div class="flex items-center gap-sm">
						<span class="text-2xl" aria-hidden="true">{step.icon}</span>
						<span class="text-xs font-medium text-primary-600">{t(labels.step)} {i + 1}</span>
					</div>
					<h3 class="mt-sm text-lg font-semibold text-gray-900">{t(step.title)}</h3>
					<p class="mt-xs text-gray-700">{t(step.body)}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- 3. Features -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.features)}</h2>
		<div class="grid gap-md sm:grid-cols-2">
			{#each features as feature (feature.icon)}
				<div class="{card} flex flex-col p-lg">
					<div class="flex items-start justify-between gap-sm">
						<div class="flex items-center gap-sm">
							<span class="text-2xl" aria-hidden="true">{feature.icon}</span>
							<h3 class="text-lg font-semibold text-gray-900">{t(feature.title)}</h3>
						</div>
						<span
							class="shrink-0 rounded-full px-sm py-2xs text-xs font-medium {feature.ready
								? 'bg-secondary-mint/60 text-gray-900'
								: 'bg-secondary-yellow/70 text-gray-900'}"
						>
							{feature.ready ? t(labels.ready) : t(labels.wip)}
						</span>
					</div>
					<p class="mt-sm flex-1 text-gray-700">{t(feature.body)}</p>
					{#if feature.href}
						<a
							href={feature.href}
							class="mt-md self-start text-sm font-medium text-primary-600 hover:underline"
						>
							{t(labels.open)}
						</a>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- Screens -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.screens)}</h2>
		<div class="grid grid-cols-2 gap-md lg:grid-cols-4">
			{#each screens as screen (screen.file)}
				<figure class="flex flex-col items-center">
					<div
						class="w-full max-w-[11rem] rounded-[1.75rem] border-[6px] border-gray-900 bg-gray-900 shadow-lg"
					>
						<img
							src="/portfolio/{screen.file}.webp"
							alt={t(screen.label)}
							width="390"
							height="844"
							loading="lazy"
							class="block aspect-[390/844] w-full rounded-[1.35rem] object-cover"
						/>
					</div>
					<figcaption class="mt-sm text-sm text-gray-700">{t(screen.label)}</figcaption>
				</figure>
			{/each}
		</div>
	</section>

	<!-- 4. Architecture -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.architecture)}</h2>
		<div class="{card} p-lg sm:p-xl">
			<div class="flex flex-col items-center gap-sm">
				<div
					class="w-full max-w-[24rem] rounded-xl bg-primary-50 px-md py-sm text-center font-medium text-gray-900"
				>
					💻 {t(architecture.browser)}
				</div>
				<span class="text-xl text-primary-500" aria-hidden="true">↓</span>
				<div class="grid w-full max-w-[36rem] gap-sm sm:grid-cols-2">
					{#each [architecture.web, architecture.realtime] as node (node.title.en)}
						<div class="rounded-xl border border-primary-200 bg-white px-md py-sm text-center">
							<p class="font-semibold text-gray-900">{t(node.title)}</p>
							<p class="text-sm text-gray-700">{t(node.sub)}</p>
						</div>
					{/each}
				</div>
				<span class="text-xl text-primary-500" aria-hidden="true">↓</span>
				<div class="grid w-full max-w-[36rem] grid-cols-3 gap-sm">
					{#each architecture.stores as store (store.name)}
						<div class="rounded-xl bg-secondary-sky/40 px-xs py-sm text-center">
							<p class="text-sm font-semibold text-gray-900">{store.name}</p>
							<p class="text-xs text-gray-700">{t(store.sub)}</p>
						</div>
					{/each}
				</div>
			</div>
			<p class="mx-auto mt-lg max-w-[40rem] text-center text-gray-700">{t(architecture.note)}</p>
		</div>
	</section>

	<!-- 5. Design decisions -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.decisions)}</h2>
		<div class="grid gap-md sm:grid-cols-2">
			{#each decisions as decision, i (i)}
				<div class="{card} p-lg">
					<h3 class="text-lg font-semibold text-gray-900">{t(decision.title)}</h3>
					<p class="mt-xs text-gray-700">{t(decision.body)}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- 6. Behind the build -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.behind)}</h2>
		<div class="grid gap-md sm:grid-cols-3">
			{#each roles as role (role.who)}
				<div class="{card} p-lg">
					<p class="text-2xl" aria-hidden="true">{role.icon}</p>
					<h3 class="mt-xs text-lg font-semibold text-gray-900">{role.who}</h3>
					<p class="mt-xs text-gray-700">{t(role.body)}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- 7. What's next -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.next)}</h2>
		<ul class="{card} grid gap-sm p-lg sm:grid-cols-2">
			{#each nextUp as item (item.en)}
				<li class="flex items-start gap-sm text-gray-700">
					<span class="text-primary-500" aria-hidden="true">→</span>
					<span>{t(item)}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- 8. Tech stack -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.stack)}</h2>
		<div class="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
			{#each stack as tech (tech.name)}
				<div class="{card} p-lg">
					<p class="font-semibold text-gray-900">{tech.name}</p>
					<p class="mt-xs text-sm text-gray-700">{t(tech.body)}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- 9. Contact -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.contact)}</h2>
		<div class="{card} p-lg sm:p-xl">
			<p class="text-lg font-semibold text-gray-900">
				{t(owner.name)} <span class="font-normal text-gray-700">({t(owner.nickname)})</span>
			</p>
			<p class="text-sm text-gray-400">{lang === 'th' ? owner.name.en : owner.name.th}</p>
			<div class="mt-md flex flex-wrap items-center gap-sm">
				<a href="mailto:{EMAIL}" class="break-all text-primary-600 hover:underline">{EMAIL}</a>
				<button
					type="button"
					onclick={copyEmail}
					class="rounded-lg border border-btn-secondary-border px-sm py-2xs text-sm font-medium text-primary-600 transition-colors hover:bg-btn-secondary-hover"
				>
					{copied ? t(labels.copied) : t(labels.copy)}
				</button>
			</div>
			<a href="tel:{PHONE_TEL}" class="mt-sm inline-block text-primary-600 hover:underline">
				{PHONE}
			</a>
			<div class="mt-md flex flex-wrap gap-sm">
				<a
					href={LINKEDIN_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-full border border-btn-secondary-border bg-white px-md py-xs text-sm font-medium text-primary-600 transition-colors hover:bg-btn-secondary-hover"
				>
					LinkedIn
				</a>
				<a
					href={GITHUB_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-full border border-btn-secondary-border bg-white px-md py-xs text-sm font-medium text-primary-600 transition-colors hover:bg-btn-secondary-hover"
				>
					GitHub
				</a>
			</div>
		</div>
	</section>
</div>
