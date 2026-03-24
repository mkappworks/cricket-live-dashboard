import type { Server, Socket } from 'socket.io'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { overStats } from '../db/schema.js'
import type { BallResult, BallInput, MatchState, OverStat } from '../types/cricket.js'

const DEFAULT_MATCH_ID = 'match-1'

// In-memory match state — ephemeral, resets on server restart
const matchState: MatchState = {
  matchId: DEFAULT_MATCH_ID,
  currentOver: 1,
  currentBalls: [],
  completedOvers: [],
}

async function loadCompletedOvers(matchId: string): Promise<OverStat[]> {
  const rows = await db
    .select()
    .from(overStats)
    .where(eq(overStats.matchId, matchId))
    .orderBy(asc(overStats.overNumber))

  return rows.map((row) => ({
    id: row.id,
    matchId: row.matchId,
    overNumber: row.overNumber,
    runs: row.runs,
    wickets: row.wickets,
    extras: row.extras,
    balls: JSON.parse(row.balls) as BallResult[],
    bowler: row.bowler ?? undefined,
  }))
}

export async function initMatchState() {
  matchState.completedOvers = await loadCompletedOvers(DEFAULT_MATCH_ID)
  matchState.currentOver = matchState.completedOvers.length + 1
}

export function registerSocketHandlers(io: Server, socket: Socket) {
  // Send current state to the newly connected client
  socket.emit('match_state', matchState)

  socket.on('add_ball', async (input: BallInput) => {
    const ballNumber = matchState.currentBalls.length + 1

    const ball: BallResult = {
      ball: ballNumber,
      runs: input.runs ?? 0,
      isWicket: input.isWicket ?? false,
      isExtra: input.isExtra ?? false,
      extraType: input.extraType,
      description: input.description,
    }

    matchState.currentBalls.push(ball)

    // Emit ball_update to all connected clients
    io.emit('ball_update', { ball, over: matchState.currentOver })

    // Over is complete after 6 legal deliveries
    // (extras like wides/no-balls don't count toward the 6, but for simplicity we count all balls)
    const legalBalls = matchState.currentBalls.filter(
      (b) => !b.isExtra || (b.extraType !== 'wide' && b.extraType !== 'no-ball')
    )

    if (legalBalls.length >= 6) {
      const overRuns = matchState.currentBalls.reduce((sum, b) => sum + b.runs, 0)
      const overWickets = matchState.currentBalls.filter((b) => b.isWicket).length
      const overExtras = matchState.currentBalls.filter((b) => b.isExtra).length

      const completedOver: OverStat = {
        matchId: matchState.matchId,
        overNumber: matchState.currentOver,
        runs: overRuns,
        wickets: overWickets,
        extras: overExtras,
        balls: [...matchState.currentBalls],
      }

      // Persist to SQLite
      const [inserted] = await db
        .insert(overStats)
        .values({
          matchId: completedOver.matchId,
          overNumber: completedOver.overNumber,
          runs: completedOver.runs,
          wickets: completedOver.wickets,
          extras: completedOver.extras,
          balls: JSON.stringify(completedOver.balls),
        })
        .returning()

      completedOver.id = inserted.id

      matchState.completedOvers.push(completedOver)
      matchState.currentOver += 1
      matchState.currentBalls = []

      // Emit over_complete to all clients
      io.emit('over_complete', completedOver)
    }
  })

  socket.on('reset_match', async () => {
    // Clear in-memory state only; DB records remain
    matchState.currentBalls = []
    matchState.currentOver = matchState.completedOvers.length + 1
    io.emit('match_state', matchState)
  })
}
