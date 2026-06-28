import { pgTable, integer, text, varchar, boolean, jsonb, real } from 'drizzle-orm/pg-core';
import { baseColumns } from './base';
import { users } from './UserModel';

export const games = pgTable('games', {
	...baseColumns,
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	creatorId: integer('creator_id').references(() => users.id),
	creatorToken: text('creator_token'),
	difficulty: varchar('difficulty', { length: 50 }),
	isPublic: boolean('is_public').default(true),
	likes: integer('likes').default(0),
	playCount: integer('play_count').default(0),
	thumbnailUrl: text('thumbnail_url'),
	thumbnailPositionX: real('thumbnail_position_x').default(50),
	thumbnailPositionY: real('thumbnail_position_y').default(50)
});

export const gameSessions = pgTable('game_sessions', {
	...baseColumns,
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	gameId: integer('game_id')
		.notNull()
		.references(() => games.id),
	currentImageIndex: integer('current_image_index').default(0).notNull(),
	revealedTiles: jsonb('revealed_tiles').$type<number[]>().default([]),
	undoStack: jsonb('undo_stack').$type<number[][]>().default([]),
	score: integer('score').default(0),
	isFinished: boolean('is_finished').default(false)
});
