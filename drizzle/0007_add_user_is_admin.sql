ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "thumbnail_position_x" real DEFAULT 50;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "thumbnail_position_y" real DEFAULT 50;