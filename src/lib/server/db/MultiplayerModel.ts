import { pgTable, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { baseColumns } from './base';
import { users } from './UserModel';
import { games } from './GamesModel';

export const multiplayerRooms = pgTable('multiplayer_rooms', {
	...baseColumns,
	code: varchar('code', { length: 5 }).notNull(),
	gameId: integer('game_id')
		.notNull()
		.references(() => games.id),
	hostId: integer('host_id')
		.notNull()
		.references(() => users.id),
	finishedAt: timestamp('finished_at')
});

export const multiplayerResults = pgTable('multiplayer_results', {
	...baseColumns,
	roomId: integer('room_id')
		.notNull()
		.references(() => multiplayerRooms.id),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	score: integer('score').default(0).notNull(),
	rank: integer('rank')
});
