<script lang="ts">
	// Private portfolio page for Kasidetch Kongkaew. The path is not linked publicly
	// (only from the admin's profile) and the page asks search engines not to index it.
	// Every piece of copy has a Thai and an English version; `lang` picks one.
	type Lang = 'th' | 'en';
	type Text = { th: string; en: string };

	let lang = $state<Lang>('th');
	const t = (text: Text) => text[lang];

	const GITHUB_URL = 'https://github.com/Kasidetch-primrose';
	const PEECHY_CODE_URL = 'https://github.com/Kasidetch-primrose/peechy';
	const LINKEDIN_URL = 'https://www.linkedin.com/in/kasidetch-kongkaew-912a56280/';
	const EMAIL = 'kasidetch.k@hotmail.com';
	const PHONE = '098-929-8343';
	const PHONE_TEL = '+66989298343';
	const ASSETS = '/kasidetch-assets';

	const owner = {
		name: { th: 'กษิดิ์เดช กองแก้ว', en: 'Kasidetch Kongkaew' },
		nickname: { th: 'ต้า', en: 'Tar' },
		role: 'Full Stack Developer',
		tagline: {
			th: 'นักพัฒนาจาก Primrose Tech โดยพัฒนาเว็บไซต์ด้วย Svelte แอปมือถือด้วย Flutter และ API ด้วย Go + PostgreSQL รวมถึงแก้ bug ต่าง ๆ ที่เกิดในระบบ',
			en: 'Developer at Primrose Tech. I build web with Svelte, mobile apps with Flutter and APIs with Go + PostgreSQL, and fix bugs in the system.'
		},
		facts: [
			{
				label: { th: 'อายุ', en: 'Age' },
				value: { th: '25 ปี', en: '25' }
			},
			{
				label: { th: 'ที่อยู่', en: 'Based in' },
				value: { th: 'เขตจอมทอง กรุงเทพมหานคร', en: 'Chom Thong District, Bangkok' }
			},
			{
				label: { th: 'ทำงานที่', en: 'Works at' },
				value: {
					th: 'Primrose Tech Co., Ltd. ตั้งแต่ เม.ย. 2024',
					en: 'Primrose Tech Co., Ltd. since Apr 2024'
				}
			}
		]
	};

	// Add entries here to show an "Interests" block under the facts. Left empty, nothing is shown.
	const interests: Text[] = [];

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

	const skills: { icon: string; title: Text; body: Text }[] = [
		{
			icon: '🖥️',
			title: { th: 'Web · Svelte / SvelteKit', en: 'Web · Svelte / SvelteKit' },
			body: {
				th: 'หน้าเว็บ store และ service ด้วย Svelte 5 และ Tailwind',
				en: 'Pages, stores and services with Svelte 5 and Tailwind.'
			}
		},
		{
			icon: '📱',
			title: { th: 'Mobile · Flutter', en: 'Mobile · Flutter' },
			body: {
				th: 'จัดการ state ด้วย Cubit, push notification ด้วย FCM, ปล่อยแอปขึ้น TestFlight และ Google Play',
				en: 'Cubit state, push notifications with FCM, releases to TestFlight and Google Play.'
			}
		},
		{
			icon: '⚙️',
			title: { th: 'API · Go + PostgreSQL', en: 'API · Go + PostgreSQL' },
			body: {
				th: 'REST API ด้วย Fiber และ GORM ตั้งแต่ ส.ค. 2025',
				en: 'REST APIs with Fiber and GORM, since Aug 2025.'
			}
		}
		// {
		// 	icon: '⚡',
		// 	title: { th: 'Realtime · Socket.IO', en: 'Realtime · Socket.IO' },
		// 	body: {
		// 		th: 'ห้องเล่นและห้องวาดแบบเรียลไทม์ใน Peechy',
		// 		en: 'Real-time play and drawing rooms in Peechy.'
		// 	}
		// }
	];

	const layers: { name: string; steps: string[] }[] = [
		{ name: 'Svelte', steps: ['interface', 'service', 'store', 'page'] },
		{ name: 'Flutter', steps: ['model', 'service', 'cubit/state', 'page'] },
		{ name: 'Go', steps: ['model', 'logic', 'controller', 'router'] }
	];

	type Shot = { file: string; label: Text };
	type Project = {
		id: string;
		name: string;
		app: Text;
		tint: string;
		accent: string;
		desc: Text;
		platform: Text;
		stack: string[];
		features: Text[];
		phones: Shot[];
		desktops: Shot[];
	};

	const projects: Project[] = [
		{
			id: 'slc',
			name: 'Seoul Cute',
			app: { th: 'บริษัท Primrose Tech', en: 'Primrose Tech' },
			tint: '#F3EADF',
			accent: '#C49A6C',
			desc: {
				th: 'แพลตฟอร์มสำหรับเลือกซื้อแพ็กเกจศัลยกรรมและหัตถการของโรงพยาบาลในเกาหลี มีเจ้าหน้าที่โรงพยาบาลและทีมแอดมินคอยแนะนำและให้บริการ ผ่อนชำระด้วยบัตรเครดิตก็ทำศัลยกรรมที่เกาหลีกับโรงพยาบาลชั้นนำได้ และมีระบบ Back Office สำหรับจัดการคำสั่งซื้อและคำขอต่าง ๆ',
				en: 'A platform for choosing and buying cosmetic-surgery and procedure packages from hospitals in Korea. Hospital staff and an admin team guide customers, who can pay by credit card in instalments. A back office manages orders and requests.'
			},
			platform: { th: 'มือถือ, เว็บ', en: 'Mobile, web' },
			stack: ['Svelte', 'Flutter', 'Go', 'PostgreSQL', 'FCM', 'Beam'],
			features: [
				{
					th: 'เลือกดูและค้นหาศัลยกรรมและหัตถการตามหมวดหมู่',
					en: 'Browse and search surgeries and procedures by category'
				},
				{
					th: 'แสดงรายชื่อโรงพยาบาลในเครือ ส่งขอคำปรึกษาแพ็กเกจสำหรับผู้ที่สนใจ และขอประเมินราคาสำหรับการทำศัลยกรรม',
					en: 'View a list of affiliated hospitals, request a consultation for interested packages, and request a price estimate for surgery'
				},
				{ th: 'ระบบตะกร้าสินค้าและโค้ดส่วนลด', en: 'Cart system and discount codes' },
				{
					th: 'ชำระด้วยบัตรเครดิตแบบผ่อนชำระ หรือ QR พร้อมเพย์ และระบบขอคืนเงิน',
					en: 'Pay by credit card in instalments or by PromptPay QR, with a refund request system'
				},
				{
					th: 'จองวันทำพร้อมแนบพาสปอร์ตและตั๋วเครื่องบิน',
					en: 'Booking with passport and flight-ticket documents'
				},
				{ th: 'พอร์ทัลสำหรับโรงพยาบาลพาร์ทเนอร์', en: 'Partner portal for hospitals' },
				{
					th: 'Back Office สำหรับทีม Admin เพื่อจัดการโรงพยาบาล แพทย์ แพ็กเกจ คำสั่งซื้อ กฎราคา อัตราแลกเปลี่ยน การโอนเงินโรงพยาบาล และหน้าตาในหน้าต่าง ๆ ของเว็บและแอป',
					en: 'Back office for the admin team to manage hospitals, doctors, packages, orders, pricing rules, exchange rates, hospital payouts and the look of pages in the web and mobile apps'
				}
			],
			phones: [
				{ file: 'slc-home', label: { th: 'หน้าแรก', en: 'Home' } },
				{
					file: 'slc-treatments',
					label: { th: 'เลือกซื้อแพ็กเกจหัตถการ', en: 'Browsing procedure packages' }
				},
				{ file: 'slc-cart', label: { th: 'ตะกร้า', en: 'Cart' } }
			],
			desktops: [
				{
					file: 'slc-bo-hospitals',
					label: { th: 'Back Office: โรงพยาบาล', en: 'Back office: hospitals' }
				},
				{
					file: 'slc-bo-orders',
					label: { th: 'Back Office: คำสั่งซื้อ', en: 'Back office: orders' }
				}
			]
		},
		{
			id: 'csc',
			name: 'SEIS Mobile',
			app: { th: 'บริษัท Primrose Tech', en: 'Primrose Tech' },
			tint: '#FBF0C6',
			accent: '#E9B72E',
			desc: {
				th: 'แอปทะเบียนประวัติราชการ สำหรับข้าราชการใช้จัดเก็บและแก้ไขข้อมูลเกี่ยวกับงานราชการของตัวเอง มีฟังก์ชันสแกน QR code ลงเวลาเข้า-ออกงาน และมี social media สำหรับแจ้งประกาศหรือสอบถามปัญหาที่เกี่ยวข้อง',
				en: 'A civil-service records app. Officials store and edit their own service data, scan a QR code to clock in and out, and use a social feed for announcements and questions.'
			},
			platform: { th: 'มือถือ', en: 'Mobile' },
			stack: ['Flutter', 'GraphQL', 'WebRTC', 'FCM'],
			features: [
				{
					th: 'ข้อมูลส่วนบุคคลและทะเบียนประวัติแบบอิเล็กทรอนิกส์',
					en: 'Personal data and electronic service record'
				},
				{ th: 'สแกน QR code ลงเวลาเข้า-ออกงาน', en: 'QR scan to clock in and out' },
				{
					th: 'ประวัติการลงเวลา ขอลา และระบบอนุมัติการลาสำหรับผู้บังคับบัญชา',
					en: 'Attendance history, leave requests and an approval system for supervisors'
				},
				{
					th: 'ชุมชน (social) สำหรับประกาศและสอบถาม',
					en: 'Community feed for announcements and questions'
				},
				{
					th: 'ระบบแชทและโทรด้วย WebSocket และ WebRTC',
					en: 'Chat and call system using WebSocket and WebRTC'
				}
				// { th: 'ประเมิน แดชบอร์ด และการแจ้งเตือน', en: 'Assessments, dashboards and notifications' }
			],
			phones: [
				{
					file: 'csc-profile',
					label: { th: 'ข้อมูลส่วนบุคคล', en: 'Profile' }
				},
				{ file: 'csc-work', label: { th: 'ลงเวลาและการลา', en: 'Clock in and leave requests' } },
				{ file: 'csc-community', label: { th: 'ชุมชน', en: 'Community' } }
			],
			desktops: []
		},
		{
			id: 'sac',
			name: '7Tools',
			app: { th: 'บริษัท Primrose Tech', en: 'Primrose Tech' },
			tint: '#EFE6FA',
			accent: '#7B57C9',
			desc: {
				th: 'แอปเครื่องมืออำนวยความสะดวกสำหรับบันทึกข้อมูลชุมชนที่ไปสำรวจ มีเครื่องมือบันทึกข้อมูลหลายรูปแบบ เช่น ชื่อชุมชนและที่อยู่ในแผนที่ ผังเครือญาติ เหตุการณ์สำคัญหรือประวัติศาสตร์ และปฏิทินวันสำคัญของชุมชน',
				en: 'A tool app for recording community data from field surveys. Tools cover community name and map location, kinship charts, key events and history, and a calendar of community days.'
			},
			platform: { th: 'มือถือ, เว็บ', en: 'Mobile, web' },
			stack: ['Svelte', 'Flutter', 'FCM'],
			features: [
				{ th: 'โครงการและชุมชนที่ไปสำรวจ', en: 'Projects and the communities surveyed' },
				{
					th: 'เครื่องมือ 7 ชิ้น: แผนที่ เครือญาติ โครงสร้าง ปฏิทิน ประวัติศาสตร์ ประวัติชีวิต ทุนชุมชน',
					en: 'Seven tools: map, kinship, structure, calendar, history, life story, community fund'
				},
				{
					th: 'แนบรูปภาพ วิดีโอ เสียง จดบันทึก และไฟล์',
					en: 'Photos, video, audio, notes and files'
				},
				{
					th: 'เครื่องมือบันทึกข้อมูล: timeline ประวัติศาสตร์ชุมชน',
					en: 'Data-recording tools: community history timeline'
				},
				{ th: 'แจ้งข่าวสารและอัปเดตโครงการ', en: 'Announcements and project updates' }
				// { th: 'แชทและการแจ้งเตือน', en: 'Chat and notifications' },
				// {
				// 	th: 'เก็บข้อมูลด่วนและนัดหมาย (เว็บ)',
				// 	en: 'Quick data collection and appointments (web)'
				// }
			],
			phones: [
				{ file: 'sac-project', label: { th: 'โครงการ', en: 'Project' } },
				{ file: 'sac-tools', label: { th: 'เครื่องมือ 7 ชิ้น', en: 'Seven tools' } }
			],
			desktops: [
				{ file: 'sac-web-home', label: { th: 'เว็บ: หน้าแรก', en: 'Web: landing page' } },
				{ file: 'sac-web-project', label: { th: 'เว็บ: หน้าโครงการ', en: 'Web: project page' } },
				{
					file: 'sac-web-history',
					label: { th: 'เว็บ: เส้นเวลาประวัติศาสตร์ชุมชน', en: 'Web: community history timeline' }
				}
			]
		},
		{
			id: 'peechy',
			name: 'Peechy',
			app: { th: 'โปรเจกต์ส่วนตัว · peechy.app', en: 'Personal project · peechy.app' },
			tint: '#FFE9E0',
			accent: '#E8714E',
			desc: {
				th: 'เกมทายภาพภาษาไทย ภาพถูกซ่อนไว้ใต้ป้าย เปิดป้ายทีละช่องแล้วทาย ยิ่งเปิดน้อยยิ่งได้คะแนนเยอะ',
				en: 'A Thai image-guessing game. The picture hides under tiles. Open one at a time and guess. Fewer tiles opened, higher score.'
			},
			platform: { th: 'เว็บ', en: 'Web' },
			stack: ['SvelteKit', 'Socket.IO', 'PostgreSQL', 'Redis', 'Cloudflare R2'],
			features: [
				{ th: 'เล่นคนเดียว มีคำใบ้ที่หักคะแนน', en: 'Solo play with hints that cost points' },
				{ th: 'สร้างและเผยแพร่เกมของตัวเอง', en: 'Create and publish your own games' },
				{
					th: 'ห้องวาดรูปร่วมกันแบบเรียลไทม์ และแกลเลอรีที่ให้เครดิตทุกคนที่ร่วมวาด',
					en: 'Real-time draw-together rooms and a gallery that credits every drawer'
				},
				{
					th: 'เล่นและสร้างเกมได้โดยไม่ต้องสมัครสมาชิก',
					en: 'Play and create games without signing up'
				}
			],
			phones: [
				{ file: 'peechy-play', label: { th: 'ระหว่างเล่น', en: 'Playing' } },
				{ file: 'peechy-create', label: { th: 'สร้างเกม', en: 'Create a game' } },
				{ file: 'peechy-gallery', label: { th: 'แกลเลอรี', en: 'Gallery' } }
			],
			desktops: []
		}
	];

	// ---- Peechy case study (kept from the earlier page) ----
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
		// {
		// 	title: {
		// 		th: 'ภาพที่ลงแกลเลอรีมาจากข้อมูลฝั่ง server',
		// 		en: 'Gallery posts are built from the server’s copy'
		// 	},
		// 	body: {
		// 		th: 'เมื่อทุกคนในห้องโหวตให้ลงแกลเลอรี realtime server จะเก็บ snapshot ของห้อง (ลายเส้น ชื่อผลงาน และรายชื่อคนวาด) ไว้หลัง ticket ที่ใช้ได้ครั้งเดียว web app นำ ticket ไปแลกข้อมูลจาก server โดยตรง เบราว์เซอร์จึงแต่งข้อมูลผลงานหรือรายชื่อคนวาดเองไม่ได้',
		// 		en: 'When everyone in the room votes to post, the realtime server freezes a snapshot of the room (strokes, title, who drew) behind a one-time ticket. The web app redeems that ticket directly with the server, so a browser cannot make up the artwork data or the list of artists.'
		// 	}
		// },
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
			who: 'Me',
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
		{ th: 'เพิ่ม login ด้วย Facebook', en: 'Add Facebook login' },
		{ th: 'ให้ห้องเล่นต่อได้แม้ server รีสตาร์ต', en: 'Let rooms survive a server restart' }
	];

	const education: { when: Text; title: Text; place: Text }[] = [
		{
			when: { th: '2019 – 2023', en: '2019 – 2023' },
			title: {
				th: 'ปริญญาตรีหลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาพยนตร์และสื่อดิจิทัล',
				en: 'Bachelor of Arts program in cinema and digital media'
			},
			place: {
				th: 'วิทยาลัยนวัตกรรมสื่อสารสังคม มหาวิทยาลัยศรีนครินทรวิโรฒ',
				en: 'College of Social Communication Innovation, Srinakharinwirot University'
			}
		},
		{
			when: { th: 'ก.ย. – ธ.ค. 2023', en: 'Sept – Dec 2023' },
			title: {
				th: 'Full Stack JavaScript Immersive Bootcamp',
				en: 'Full Stack JavaScript Immersive Bootcamp'
			},
			place: { th: 'Cleverse Academy', en: 'Cleverse Academy' }
		},
		{
			when: { th: 'มิ.ย. 2023', en: 'June 2023' },
			title: { th: 'TOEIC', en: 'TOEIC' },
			place: { th: '825 คะแนน', en: '825 points' }
		}
	];

	const headings = {
		education: { th: 'การศึกษาและใบรับรอง', en: 'Education & certifications' },
		about: { th: 'เกี่ยวกับฉัน', en: 'About me' },
		skills: { th: 'ทำอะไรได้บ้าง', en: 'What I do' },
		structure: {
			th: 'โครงสร้างโค้ดที่ใช้เหมือนกันทุก stack',
			en: 'The same structure on every stack'
		},
		projects: { th: 'โครงการ', en: 'Projects' },
		caseStudy: { th: 'Peechy: เจาะลึก', en: 'Peechy: case study' },
		how: { th: 'เล่นอย่างไร', en: 'How it works' },
		features: { th: 'ทำอะไรได้บ้าง', en: 'What you can do' },
		architecture: { th: 'โครงสร้างระบบ', en: 'How it is built' },
		decisions: { th: 'สิ่งที่ตั้งใจออกแบบไว้', en: 'Deliberate design choices' },
		ai: { th: 'การทำงานร่วมกับ AI', en: 'Working with AI coding tools' },
		next: { th: 'สิ่งที่จะทำต่อ', en: 'What’s next' },
		contact: { th: 'ติดต่อ', en: 'Contact' },
		interests: { th: 'ความสนใจ', en: 'Interests' }
	};

	const labels = {
		ready: { th: 'ใช้งานได้แล้ว', en: 'Live' },
		wip: { th: 'กำลังพัฒนา', en: 'In progress' },
		open: { th: 'เปิดดู →', en: 'Open →' },
		copy: { th: 'คัดลอก', en: 'Copy' },
		copied: { th: 'คัดลอกแล้ว ✓', en: 'Copied ✓' },
		step: { th: 'ขั้นที่', en: 'Step' },
		platform: { th: 'แพลตฟอร์ม', en: 'Platform' },
		stack: { th: 'Tech stack', en: 'Tech stack' },
		features: { th: 'ฟีเจอร์', en: 'Features' },
		aiNote: {
			th: 'คอมมิตที่ทำร่วมกับ AI จะบันทึกต้นเหตุ เทสต์ที่เพิ่ม และสิ่งที่ไม่ได้แก้ไว้เสมอ',
			en: 'Commits made with AI record the cause, the tests added and what was left unchanged.'
		},
		code: { th: 'ดูโค้ดบน GitHub', en: 'View code on GitHub' },
		play: { th: 'ลองเล่นเลย', en: 'Try it now' }
	};

	const card = 'rounded-2xl border border-primary-100/60 bg-white/85 shadow-sm backdrop-blur-sm';
	const chip = 'rounded-full border border-gray-200 bg-white px-sm py-2xs text-sm text-gray-900';
</script>

<svelte:head>
	<title>Kasidetch Kongkaew — Portfolio</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta
		name="description"
		content="Portfolio of Kasidetch Kongkaew, Full Stack Developer: Seoul Cute, SEIS Mobile, 7Tools and Peechy."
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
	<section class="{card} animate-game-enter px-lg py-2xl sm:px-2xl">
		<p class="text-sm font-medium tracking-widest text-primary-600 uppercase">Portfolio</p>
		<h1 class="mt-xs text-4xl font-bold text-gray-900 sm:text-5xl">{owner.name.en}</h1>
		<p class="mt-xs text-xl text-gray-700">
			{owner.name.th} · {t(owner.nickname)}
			{#if lang === 'th'}<span class="text-gray-400">({owner.nickname.en})</span>{:else}<span
					class="text-gray-400">({owner.nickname.th})</span
				>{/if}
		</p>
		<p class="mt-sm text-lg font-semibold text-primary-600">{owner.role}</p>
		<p class="mt-md max-w-[40rem] text-gray-700">{t(owner.tagline)}</p>

		<div class="mt-lg flex flex-wrap gap-sm">
			{#each projects as project (project.id)}
				<a
					href="#{project.id}"
					class="rounded-full border border-btn-secondary-border bg-white px-md py-xs text-sm font-medium text-primary-600 transition-colors hover:bg-btn-secondary-hover"
				>
					{project.name}
				</a>
			{/each}
			<a
				href="#contact"
				class="rounded-full bg-btn-primary px-md py-xs text-sm font-medium text-white shadow-sm transition-colors hover:bg-btn-primary-hover active:bg-btn-primary-active"
			>
				{t(headings.contact)}
			</a>
		</div>
	</section>

	<!-- 2. About -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.about)}</h2>
		<div class="{card} p-lg sm:p-xl">
			<dl class="grid gap-md sm:grid-cols-3">
				{#each owner.facts as fact (fact.label.en)}
					<div>
						<dt class="text-xs font-semibold tracking-widest text-gray-400 uppercase">
							{t(fact.label)}
						</dt>
						<dd class="mt-2xs font-medium text-gray-900">{t(fact.value)}</dd>
					</div>
				{/each}
			</dl>
			{#if interests.length > 0}
				<div class="mt-md border-t border-gray-100 pt-md">
					<p class="text-xs font-semibold tracking-widest text-gray-400 uppercase">
						{t(headings.interests)}
					</p>
					<ul class="mt-xs flex flex-wrap gap-xs">
						{#each interests as item (item.en)}
							<li class={chip}>{t(item)}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</section>

	<!-- Education -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.education)}</h2>
		<div class="grid gap-md sm:grid-cols-3">
			{#each education as item (item.title.en)}
				<div class="{card} p-lg">
					<p class="text-xs font-semibold tracking-widest text-primary-600 uppercase">
						{t(item.when)}
					</p>
					<h3 class="mt-xs font-semibold text-gray-900">{t(item.title)}</h3>
					<p class="mt-xs text-sm text-gray-700">{t(item.place)}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- 3. Skills -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.skills)}</h2>
		<div class="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
			{#each skills as skill (skill.title.en)}
				<div class="{card} p-lg">
					<p class="text-2xl" aria-hidden="true">{skill.icon}</p>
					<h3 class="mt-sm font-semibold text-gray-900">{t(skill.title)}</h3>
					<p class="mt-xs text-sm text-gray-700">{t(skill.body)}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- 4. Structure -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.structure)}</h2>
		<div class="{card} grid gap-sm p-lg">
			{#each layers as layer (layer.name)}
				<div class="flex flex-wrap items-center gap-xs">
					<span class="w-20 shrink-0 font-semibold text-gray-900">{layer.name}</span>
					{#each layer.steps as step, i (step)}
						<span
							class="rounded-lg border border-primary-200 bg-white px-sm py-2xs text-sm text-gray-900"
							>{step}</span
						>
						{#if i < layer.steps.length - 1}<span class="text-primary-500" aria-hidden="true"
								>→</span
							>{/if}
					{/each}
				</div>
			{/each}
		</div>
	</section>

	<!-- 5. Projects -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.projects)}</h2>
		<div class="grid gap-xl">
			{#each projects as project (project.id)}
				<article
					id={project.id}
					class="scroll-mt-lg overflow-hidden rounded-2xl border border-primary-100/60 shadow-sm"
					style="background-color: {project.tint}"
				>
					<div class="grid gap-lg p-lg sm:p-xl lg:grid-cols-[1fr_1.15fr]">
						<div>
							<div class="flex items-center gap-sm">
								<span
									class="inline-block h-3 w-3 rounded-full"
									style="background-color: {project.accent}"
									aria-hidden="true"
								></span>
								<h3 class="text-2xl font-bold text-gray-900">{project.name}</h3>
							</div>
							<p class="mt-2xs text-sm text-gray-700">{t(project.app)}</p>

							<p class="mt-md text-gray-900">{t(project.desc)}</p>

							<p class="mt-md text-xs font-semibold tracking-widest text-gray-700 uppercase">
								{t(labels.platform)}
							</p>
							<p class="mt-2xs font-medium text-gray-900">{t(project.platform)}</p>

							<p class="mt-md text-xs font-semibold tracking-widest text-gray-700 uppercase">
								{t(labels.stack)}
							</p>
							<ul class="mt-xs flex flex-wrap gap-xs">
								{#each project.stack as tech (tech)}
									<li class={chip}>{tech}</li>
								{/each}
							</ul>

							<p class="mt-md text-xs font-semibold tracking-widest text-gray-700 uppercase">
								{t(labels.features)}
							</p>
							<ul class="mt-xs grid gap-xs">
								{#each project.features as item (item.en)}
									<li class="flex items-start gap-xs text-gray-900">
										<span
											class="mt-[0.15rem] text-xs"
											style="color: {project.accent}"
											aria-hidden="true">▸</span
										>
										<span>{t(item)}</span>
									</li>
								{/each}
							</ul>

							{#if project.id === 'peechy'}
								<div class="mt-lg flex flex-col gap-sm sm:flex-row">
									<a
										href="/"
										class="rounded-full bg-btn-primary px-lg py-sm text-center font-medium text-white shadow-sm transition-colors hover:bg-btn-primary-hover active:bg-btn-primary-active"
									>
										{t(labels.play)}
									</a>
									<a
										href={PEECHY_CODE_URL}
										target="_blank"
										rel="noopener noreferrer"
										class="rounded-full border border-btn-secondary-border bg-white px-lg py-sm text-center font-medium text-primary-600 transition-colors hover:bg-btn-secondary-hover"
									>
										{t(labels.code)}
									</a>
								</div>
							{/if}
						</div>

						<!-- Screenshots -->
						<div class="flex flex-col gap-lg">
							<div
								class="grid items-start gap-sm"
								style="grid-template-columns: repeat({project.phones.length}, minmax(0, 1fr))"
							>
								{#each project.phones as shot (shot.file)}
									<figure class="flex flex-col items-center">
										<div
											class="w-full max-w-[10rem] rounded-[1.6rem] border-[5px] border-gray-900 bg-gray-900 shadow-lg"
										>
											<img
												src="{ASSETS}/{shot.file}.webp"
												alt={t(shot.label)}
												width="620"
												height="1342"
												loading="lazy"
												class="block aspect-[620/1342] w-full rounded-[1.25rem] object-cover"
											/>
										</div>
										<figcaption class="mt-xs text-center text-xs text-gray-700">
											{t(shot.label)}
										</figcaption>
									</figure>
								{/each}
							</div>

							{#if project.desktops.length > 0}
								<div
									class="grid gap-sm {project.desktops.length > 2
										? 'sm:grid-cols-3'
										: 'sm:grid-cols-2'}"
								>
									{#each project.desktops as shot (shot.file)}
										<figure>
											<img
												src="{ASSETS}/{shot.file}.webp"
												alt={t(shot.label)}
												width="1500"
												height="852"
												loading="lazy"
												class="block w-full rounded-lg border border-gray-300 shadow-md"
											/>
											<figcaption class="mt-xs text-xs text-gray-700">{t(shot.label)}</figcaption>
										</figure>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<!-- 6. Peechy case study -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.caseStudy)}</h2>

		<h3 class="mb-sm text-lg font-semibold text-gray-900">{t(headings.how)}</h3>
		<ol class="grid gap-md sm:grid-cols-3">
			{#each steps as step, i (i)}
				<li class="{card} p-lg">
					<div class="flex items-center gap-sm">
						<span class="text-2xl" aria-hidden="true">{step.icon}</span>
						<span class="text-xs font-medium text-primary-600">{t(labels.step)} {i + 1}</span>
					</div>
					<h4 class="mt-sm text-lg font-semibold text-gray-900">{t(step.title)}</h4>
					<p class="mt-xs text-gray-700">{t(step.body)}</p>
				</li>
			{/each}
		</ol>

		<h3 class="mt-xl mb-sm text-lg font-semibold text-gray-900">{t(headings.features)}</h3>
		<div class="grid gap-md sm:grid-cols-2">
			{#each features as feature (feature.icon)}
				<div class="{card} flex flex-col p-lg">
					<div class="flex items-start justify-between gap-sm">
						<div class="flex items-center gap-sm">
							<span class="text-2xl" aria-hidden="true">{feature.icon}</span>
							<h4 class="text-lg font-semibold text-gray-900">{t(feature.title)}</h4>
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

		<h3 class="mt-xl mb-sm text-lg font-semibold text-gray-900">{t(headings.architecture)}</h3>
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

		<h3 class="mt-xl mb-sm text-lg font-semibold text-gray-900">{t(headings.decisions)}</h3>
		<div class="grid gap-md sm:grid-cols-2">
			{#each decisions as decision, i (i)}
				<div class="{card} p-lg">
					<h4 class="text-lg font-semibold text-gray-900">{t(decision.title)}</h4>
					<p class="mt-xs text-gray-700">{t(decision.body)}</p>
				</div>
			{/each}
		</div>

		<h3 class="mt-xl mb-sm text-lg font-semibold text-gray-900">{t(headings.next)}</h3>
		<ul class="{card} grid gap-sm p-lg sm:grid-cols-2">
			{#each nextUp as item (item.en)}
				<li class="flex items-start gap-sm text-gray-700">
					<span class="text-primary-500" aria-hidden="true">→</span>
					<span>{t(item)}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- 7. AI -->
	<section class="mt-2xl">
		<h2 class="mb-md text-2xl font-bold text-gray-900">{t(headings.ai)}</h2>
		<div class="grid gap-md sm:grid-cols-3">
			{#each roles as role (role.who)}
				<div class="{card} p-lg">
					<p class="text-2xl" aria-hidden="true">{role.icon}</p>
					<h3 class="mt-xs text-lg font-semibold text-gray-900">{role.who}</h3>
					<p class="mt-xs text-gray-700">{t(role.body)}</p>
				</div>
			{/each}
		</div>
		<p class="mt-md text-gray-700">{t(labels.aiNote)}</p>
	</section>

	<!-- 8. Contact -->
	<section id="contact" class="mt-2xl scroll-mt-lg">
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
