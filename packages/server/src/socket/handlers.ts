import type { Server, Socket } from 'socket.io'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { overStats, matchMembers, matchCurrentState } from '../db/schema.js'
import type { BallResult, BallInput } from '@cricket-live/shared'
import { SOCKET_EVENTS } from '@cricket-live/shared'
import { loadMatchState, persistCurrentState } from './matchStateManager.js'

export function registerSocketHandlers(io: Server, socket: Socket) {
  const userId: string = socket.data.userId

  socket.on(SOCKET_EVENTS.JOIN_MATCH, async ({ matchId }: { matchId: string }) => {
    // Verify the user is a member of the match
    const [member] = await db
      .select()
      .from(matchMembers)
      .where(and(eq(matchMembers.matchId, matchId), eq(matchMembers.userId, userId)))

    if (!member) {
      socket.emit('error', { message: 'Not a member of this match' })
      return
    }

    socket.join(`match:${matchId}`)

    const state = await loadMatchState(matchId)
    socket.emit(SOCKET_EVENTS.MATCH_STATE, state)
  })

  socket.on(SOCKET_EVENTS.LEAVE_MATCH, ({ matchId }: { matchId: string }) => {
    socket.leave(`match:${matchId}`)
  })

  socket.on(SOCKET_EVENTS.ADD_BALL, async (input: BallInput) => {
    const { matchId } = input
    if (!matchId) return

    // Only the creator can add balls
    const [member] = await db
      .select()
      .from(matchMembers)
      .where(and(eq(matchMembers.matchId, matchId), eq(matchMembers.userId, userId)))

    if (!member || member.role !== 'creator') {
      socket.emit('error', { message: 'Only the creator can score' })
      return
    }

    const [current] = await db
      .select()
      .from(matchCurrentState)
      .where(eq(matchCurrentState.matchId, matchId))

    if (!current) return

    const currentBalls: BallResult[] = JSON.parse(current.currentBalls)
    const ballNumber = currentBalls.length + 1

    const ball: BallResult = {
      ball: ballNumber,
      runs: input.runs ?? 0,
      isWicket: input.isWicket ?? false,
      isExtra: input.isExtra ?? false,
      extraType: input.extraType,
      description: input.description,
    }

    const updatedBalls = [...currentBalls, ball]

    // Persist current ball immediately
    await persistCurrentState(matchId, current.currentOver, updatedBalls)

    io.to(`match:${matchId}`).emit(SOCKET_EVENTS.BALL_UPDATE, {
      ball,
      over: current.currentOver,
    })

    // Over completes after 6 legal deliveries
    const legalBalls = updatedBalls.filter(
      (b) => !b.isExtra || (b.extraType !== 'wide' && b.extraType !== 'no-ball')
    )

    if (legalBalls.length >= 6) {
      const overRuns = updatedBalls.reduce((sum, b) => sum + b.runs, 0)
      const overWickets = updatedBalls.filter((b) => b.isWicket).length
      const overExtras = updatedBalls.filter((b) => b.isExtra).length

      const [inserted] = await db
        .insert(overStats)
        .values({
          matchId,
          overNumber: current.currentOver,
          runs: overRuns,
          wickets: overWickets,
          extras: overExtras,
          balls: JSON.stringify(updatedBalls),
        })
        .returning()

      const completedOver = {
        id: inserted.id,
        matchId,
        overNumber: current.currentOver,
        runs: overRuns,
        wickets: overWickets,
        extras: overExtras,
        balls: updatedBalls,
      }

      // Reset current state for the next over
      await persistCurrentState(matchId, current.currentOver + 1, [])

      io.to(`match:${matchId}`).emit(SOCKET_EVENTS.OVER_COMPLETE, completedOver)
    }
  })

  socket.on(SOCKET_EVENTS.RESET_MATCH, async ({ matchId }: { matchId: string }) => {
    if (!matchId) return

    const [member] = await db
      .select()
      .from(matchMembers)
      .where(and(eq(matchMembers.matchId, matchId), eq(matchMembers.userId, userId)))

    if (!member || member.role !== 'creator') {
      socket.emit('error', { message: 'Only the creator can reset the match' })
      return
    }

    const completedCount = await db.select().from(overStats).where(eq(overStats.matchId, matchId))

    const nextOver = completedCount.length + 1
    await persistCurrentState(matchId, nextOver, [])

    const state = await loadMatchState(matchId)
    io.to(`match:${matchId}`).emit(SOCKET_EVENTS.MATCH_STATE, state)
  })
}
