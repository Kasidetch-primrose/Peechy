import { pgTable, integer, text } from 'drizzle-orm/pg-core';
import { baseColumns } from './base';
import { images } from './ImagesModel';

export const imageHints = pgTable('image_hints', {
	...baseColumns,
	imageId: integer('image_id')
		.notNull()
		.references(() => images.id),
	hint: text('hint').notNull(),
	orderIndex: integer('order_index').notNull().default(0)
});
