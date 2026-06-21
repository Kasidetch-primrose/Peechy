CREATE TABLE "user_oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"user_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multiplayer_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"room_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rank" integer
);
--> statement-breakpoint
CREATE TABLE "multiplayer_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"code" varchar(5) NOT NULL,
	"game_id" integer NOT NULL,
	"host_id" integer NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "creator_token" text;--> statement-breakpoint
ALTER TABLE "multiplayer_results" ADD CONSTRAINT "multiplayer_results_room_id_multiplayer_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."multiplayer_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiplayer_results" ADD CONSTRAINT "multiplayer_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiplayer_rooms" ADD CONSTRAINT "multiplayer_rooms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiplayer_rooms" ADD CONSTRAINT "multiplayer_rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oauth_provider_account" ON "user_oauth_accounts" USING btree ("provider","provider_user_id");