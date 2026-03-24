import { Router } from 'express'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { overStats } from '../db/schema.js'
import type { BallResult } from '@cricket-live/shared'

export const statsRouter = Router()

statsRouter.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params

    const rows = await db
      .select()
      .from(overStats)
      .where(eq(overStats.matchId, matchId))
      .orderBy(asc(overStats.overNumber))

    const result = rows.map((row) => ({
      id: row.id,
      matchId: row.matchId,
      overNumber: row.overNumber,
      runs: row.runs,
      wickets: row.wickets,
      extras: row.extras,
      balls: JSON.parse(row.balls) as BallResult[],
      bowler: row.bowler,
      createdAt: row.createdAt,
    }))

    res.json(result)
  } catch (err) {
    console.error('Error fetching stats:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})
