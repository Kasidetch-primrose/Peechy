<script lang="ts">
	const lastUpdated = '13 กันยายน 2569';
</script>

<svelte:head>
	<title>วิธีขอลบข้อมูล - Peechy</title>
	<meta name="description" content="วิธีขอให้ Peechy ลบบัญชีและข้อมูลส่วนบุคคลของท่าน" />
</svelte:head>

<div class="mx-auto w-full max-w-[48rem] px-4 py-12">
	<div class="animate-game-enter">
		<div class="mb-6">
			<a
				href="/"
				class="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 hover:underline"
			>
				← กลับหน้าหลัก
			</a>
		</div>

		<div
			class="rounded-2xl border-2 border-primary-200/60 bg-white/90 p-6 shadow-md shadow-primary-200/30 backdrop-blur-sm sm:p-10"
		>
			<h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">วิธีขอลบข้อมูล</h1>
			<p class="mt-2 text-sm text-gray-500">อัปเดตล่าสุด: {lastUpdated}</p>

			<div
				class="prose prose-sm mt-8 max-w-none sm:prose-base prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-500 prose-li:text-gray-700"
			>
				<p>
					ท่านสามารถขอให้ Peechy ลบบัญชีและข้อมูลส่วนบุคคลของท่านได้ทุกเมื่อ
					ไม่ว่าจะสมัครสมาชิกด้วยอีเมล หรือเข้าสู่ระบบผ่าน Google, Facebook หรือ TikTok
				</p>

				<h2>วิธีขอลบข้อมูล</h2>
				<p>
					ส่งอีเมลแจ้งความประสงค์ขอลบบัญชีมาที่
					<a href="mailto:k060318@hotmail.com">k060318@hotmail.com</a>
					โดยระบุ:
				</p>
				<ul>
					<li>ชื่อผู้ใช้ (username) หรืออีเมลที่ใช้สมัครสมาชิก</li>
					<li>ผู้ให้บริการที่ใช้เข้าสู่ระบบ (อีเมล/Google/Facebook/TikTok) หากทราบ</li>
				</ul>
				<p>ทีมงานจะดำเนินการยืนยันตัวตนและลบข้อมูลให้ภายใน 30 วันนับจากวันที่ได้รับคำขอ</p>

				<h2>ข้อมูลที่จะถูกลบ</h2>
				<ul>
					<li>ข้อมูลบัญชี (ชื่อผู้ใช้ อีเมล รหัสผ่านที่เข้ารหัสไว้)</li>
					<li>การเชื่อมต่อบัญชีกับผู้ให้บริการภายนอก (Google/Facebook/TikTok)</li>
					<li>เกมและรูปภาพที่ท่านสร้างไว้</li>
					<li>ประวัติการเล่นเกมและคะแนน</li>
				</ul>
				<p>
					ดูรายละเอียดการเก็บและใช้ข้อมูลเพิ่มเติมได้ที่
					<a href="/legal/privacy">นโยบายความเป็นส่วนตัว</a>
				</p>
			</div>
		</div>
	</div>
</div>
