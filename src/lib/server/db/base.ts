import { serial, timestamp } from 'drizzle-orm/pg-core';

export const baseColumns = {
	id: serial('id').primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	deletedAt: timestamp('deleted_at') // null = active, not null = soft deleted
};
