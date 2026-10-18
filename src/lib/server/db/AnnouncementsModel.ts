import { pgTable, varchar, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { baseColumns } from './base';
import { users } from './UserModel';

// Site announcements managed from /admin. Plain text only (never rendered as HTML).
export const announcements = pgTable(
	'announcements',
	{
		...baseColumns,
		title: varchar('title', { length: 120 }).notNull(),
		message: text('message').notNull(),
		tone: varchar('tone', { length: 16 }).default('info').notNull(), // info | success | warning | event
		display: varchar('display', { length: 16 }).default('banner').notNull(), // banner | popup | both
		linkUrl: text('link_url'),
		linkLabel: varchar('link_label', { length: 60 }),
		isActive: boolean('is_active').default(false).notNull(),
		startsAt: timestamp('starts_at'), // null = from now
		endsAt: timestamp('ends_at'), // null = no end
		createdBy: integer('created_by').references(() => users.id),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [index('announcements_active_idx').on(t.isActive, t.deletedAt)]
);
