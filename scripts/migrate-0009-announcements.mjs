// Applies drizzle/0009_announcements.sql (idempotent).
// Usage: node --env-file=prod.env scripts/migrate-0009-announcements.mjs
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { max: 1, ssl: new URL(url).hostname === 'localhost' ? false : 'require' });
const exists = async () =>
	(await sql`select to_regclass('public.announcements') as t`)[0].t !== null;

console.log('host:', new URL(url).hostname);
console.log('before: announcements exists =', await exists());
await sql`CREATE TABLE IF NOT EXISTS "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"title" varchar(120) NOT NULL,
	"message" text NOT NULL,
	"tone" varchar(16) DEFAULT 'info' NOT NULL,
	"display" varchar(16) DEFAULT 'banner' NOT NULL,
	"link_url" text,
	"link_label" varchar(60),
	"is_active" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
)`;
await sql`DO $$ BEGIN
	ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
await sql`CREATE INDEX IF NOT EXISTS "announcements_active_idx" ON "announcements" USING btree ("is_active","deleted_at")`;
console.log('after: announcements exists =', await exists());
await sql.end();
