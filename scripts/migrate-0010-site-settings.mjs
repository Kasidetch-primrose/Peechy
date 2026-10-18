// Applies drizzle/0010_site_settings.sql (idempotent).
// Usage: node --env-file=prod.env scripts/migrate-0010-site-settings.mjs
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { max: 1, ssl: new URL(url).hostname === 'localhost' ? false : 'require' });
const exists = async () =>
	(await sql`select to_regclass('public.site_settings') as t`)[0].t !== null;

console.log('host:', new URL(url).hostname);
console.log('before: site_settings exists =', await exists());
await sql`CREATE TABLE IF NOT EXISTS "site_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
)`;
await sql`DO $$ BEGIN
	ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
console.log('after: site_settings exists =', await exists());
await sql.end();
