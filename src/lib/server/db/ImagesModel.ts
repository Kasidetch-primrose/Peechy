import { pgTable, integer, text, varchar } from 'drizzle-orm/pg-core';
import { baseColumns } from './base';
import { games } from './GamesModel';

export const images = pgTable('images', {
	...baseColumns,
	gameId: integer('game_id')
		.notNull()
		.references(() => games.id),
	name: varchar('name', { length: 255 }),
	imageUrl: text('image_url').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	answer: varchar('answer', { length: 255 }).notNull(),
	hint: text('hint'),
	gridSize: integer('grid_size').notNull(), // e.g. 5 → 5×5 grid
	orderIndex: integer('order_index').notNull(),
	timeLimit: integer('time_limit'), // seconds, null = no limit
	maxReveal: integer('max_reveal') // max tiles before forced reveal, null = no limit
});
