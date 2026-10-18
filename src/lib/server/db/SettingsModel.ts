import { pgTable, varchar, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './UserModel';

// Site-wide settings edited from /admin, one row per key (e.g. 'announcements').
export const siteSettings = pgTable('site_settings', {
	key: varchar('key', { length: 64 }).primaryKey(),
	value: jsonb('value').notNull(),
	updatedBy: integer('updated_by').references(() => users.id),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});
