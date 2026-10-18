import {
	pgTable,
	text,
	varchar,
	boolean,
	integer,
	timestamp,
	primaryKey,
	uniqueIndex,
	jsonb
} from 'drizzle-orm/pg-core';
import { baseColumns } from './base';

export const users = pgTable('users', {
	...baseColumns,
	name: varchar('name', { length: 255 }),
	username: varchar('username', { length: 255 }).notNull().unique(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	password: text('password').notNull(),
	isVerified: boolean('is_verified').default(false).notNull(),
	isAdmin: boolean('is_admin').default(false).notNull(),
	// Full (downscaled) uploaded picture; the circle shown everywhere is cut from it by avatarCrop.
	avatarUrl: text('avatar_url'),
	avatarCrop: jsonb('avatar_crop').$type<{ x: number; y: number; zoom: number; aspect: number }>()
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

export const userOAuthAccounts = pgTable(
	'user_oauth_accounts',
	{
		...baseColumns,
		userId: integer('user_id').notNull(),
		provider: varchar('provider', { length: 50 }).notNull(),
		providerUserId: varchar('provider_user_id', { length: 255 }).notNull()
	},
	(t) => ({
		uniqAccount: uniqueIndex('uq_oauth_provider_account').on(t.provider, t.providerUserId)
	})
);
