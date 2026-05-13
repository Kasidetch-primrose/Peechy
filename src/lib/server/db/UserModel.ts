import {
	pgTable,
	text,
	varchar,
	boolean,
	integer,
	timestamp,
	primaryKey
} from 'drizzle-orm/pg-core';
import { baseColumns } from './base';

export const users = pgTable('users', {
	...baseColumns,
	name: varchar('name', { length: 255 }),
	username: varchar('username', { length: 255 }).notNull().unique(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	password: text('password').notNull(),
	isVerified: boolean('is_verified').default(false).notNull()
});

export const userGameLikes = pgTable(
	'user_game_likes',
	{
		userId: integer('user_id').notNull(),
		gameId: integer('game_id').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.gameId] })
	})
);

export const userSavedGames = pgTable(
	'user_saved_games',
	{
		userId: integer('user_id').notNull(),
		gameId: integer('game_id').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.gameId] })
	})
);
