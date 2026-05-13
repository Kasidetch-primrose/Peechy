import { pgTable, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { baseColumns } from './base';
import { users } from './UserModel';
import { games } from './GamesModel';

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
