import { eq, asc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { matchCurrentState, overStats } from '../db/schema.js'
import type { BallResult, MatchState } from '@cricket-live/shared'

export async function loadMatchState(matchId: string): Promise<MatchState> {
  const [current] = await db
    .select()
    .from(matchCurrentState)
    .where(eq(matchCurrentState.matchId, matchId))

  const completed = await db
    .select()
    .from(overStats)
    .where(eq(overStats.matchId, matchId))
    .orderBy(asc(overStats.overNumber))

  return {
    matchId,
    currentOver: current?.currentOver ?? 1,
    currentBalls: current ? (JSON.parse(current.currentBalls) as BallResult[]) : [],
    completedOvers: completed.map((row) => ({
      id: row.id,
      matchId: row.matchId,
      overNumber: row.overNumber,
      runs: row.runs,
      wickets: row.wickets,
      extras: row.extras,
      balls: JSON.parse(row.balls) as BallResult[],
      bowler: row.bowler ?? undefined,
    })),
  }
}

export async function persistCurrentState(
  matchId: string,
  currentOver: number,
  currentBalls: BallResult[]
): Promise<void> {
  await db
    .update(matchCurrentState)
    .set({
      currentOver,
      currentBalls: JSON.stringify(currentBalls),
      updatedAt: new Date(),
    })
    .where(eq(matchCurrentState.matchId, matchId))
}
