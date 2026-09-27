import { pgTable, uuid, integer, text, varchar, timestamp, serial, index } from 'drizzle-orm/pg-core';
import { users } from './UserModel';

// A published Draw Together drawing: a frozen snapshot, not tied to the live room.
// The id is a random uuid (not serial) so "unlisted" links can't be guessed.
export const artworks = pgTable(
	'artworks',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		title: varchar('title', { length: 100 }).notNull(),
		description: text('description'),
		imageUrl: text('image_url').notNull(),
		thumbnailUrl: text('thumbnail_url'),
		sourceUrl: text('source_url'), // R2 JSON with the strokes (replay / remix later)
		canvasRatio: varchar('canvas_ratio', { length: 8 }).notNull(),
		creatorId: integer('creator_id').references(() => users.id), // null = guest
		creatorName: varchar('creator_name', { length: 60 }).notNull(),
		publishedAt: timestamp('published_at').defaultNow().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		deletedAt: timestamp('deleted_at')
	},
	(t) => [index('artworks_gallery_idx').on(t.publishedAt)]
);

// Everyone who was in the room when the artwork was approved.
export const artworkCollaborators = pgTable('artwork_collaborators', {
	id: serial('id').primaryKey(),
	artworkId: uuid('artwork_id')
		.notNull()
		.references(() => artworks.id),
	userId: integer('user_id').references(() => users.id), // null = guest
	displayName: varchar('display_name', { length: 60 }).notNull(),
	role: varchar('role', { length: 16 }).default('collaborator').notNull(), // creator | collaborator
	createdAt: timestamp('created_at').defaultNow().notNull()
});
