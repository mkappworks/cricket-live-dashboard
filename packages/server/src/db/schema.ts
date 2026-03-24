import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const overStats = sqliteTable('over_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: text('match_id').notNull(),
  overNumber: integer('over_number').notNull(),
  runs: integer('runs').notNull(),
  wickets: integer('wickets').notNull(),
  extras: integer('extras').notNull(),
  balls: text('balls').notNull(), // JSON string: BallResult[]
  bowler: text('bowler'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
})

export type InsertOverStat = typeof overStats.$inferInsert
export type SelectOverStat = typeof overStats.$inferSelect
