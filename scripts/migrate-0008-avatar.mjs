// Applies drizzle/0008_add_user_avatar.sql (idempotent).
// Usage: node --env-file=prod.env scripts/migrate-0008-avatar.mjs
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { max: 1, ssl: new URL(url).hostname === 'localhost' ? false : 'require' });
const columns = () =>
	sql`select column_name, data_type from information_schema.columns
	    where table_name = 'users' and column_name like 'avatar%'`;

console.log('host:', new URL(url).hostname);
console.log('before:', (await columns()).map((r) => r.column_name));
await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`;
await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_crop" jsonb`;
console.log('after:', (await columns()).map((r) => `${r.column_name}:${r.data_type}`));
await sql.end();
