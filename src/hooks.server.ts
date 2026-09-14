import type { Handle } from '@sveltejs/kit';
// import { purgeExpiredAnonymousGames } from '$lib/server/logic/games';

// todo ลบเกมหลังจาก 60 วัน (สำหรับเกมที่สร้างโดยผู้ใช้ที่ไม่สมัครสมาชิก)
// ! DISABLED (2026-09-14): anonymous games cleanup was firing on every server
// ! startup and deleting guest-created games after 60 days. Re-enable once the
// ! cutoff/behavior is confirmed.
// purgeExpiredAnonymousGames().catch((e) =>
// 	console.error('[purge] anonymous games cleanup failed:', e)
// );

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
