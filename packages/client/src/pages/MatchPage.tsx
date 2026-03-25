import { useEffect, useState } from 'react'
import { useParams, useLoaderData, Link } from '@tanstack/react-router'
import type { BallResult, MatchState, OverStat } from '@cricket-live/shared'
import { SOCKET_EVENTS } from '@cricket-live/shared'
import { socket, matchEvents } from '../socket'
import { LiveOverPanel } from '../components/LiveOverPanel'
import { OverStatsPanel } from '../components/OverStatsPanel'
import { ScorerControl } from '../components/ScorerControl'
import { InviteUserModal } from '../components/InviteUserModal'

export function MatchPage() {
  const { id } = useParams({ from: '/match/$id' })
  const { isCreator } = useLoaderData({ from: '/match/$id' })

  const [currentOver, setCurrentOver] = useState(1)
  const [currentBalls, setCurrentBalls] = useState<BallResult[]>([])
  const [completedOvers, setCompletedOvers] = useState<OverStat[]>([])
  const [connected, setConnected] = useState(socket.connected)
  const [showInvite, setShowInvite] = useState(false)

  // Join the socket match on mount
  useEffect(() => {
    matchEvents.joinMatch(id)
    return () => {
      matchEvents.leaveMatch(id)
    }
  }, [id])

  // Socket event listeners
  useEffect(() => {
    function onConnect() {
      setConnected(true)
    }
    function onDisconnect() {
      setConnected(false)
    }

    function onMatchState(state: MatchState) {
      setCurrentOver(state.currentOver)
      setCurrentBalls(state.currentBalls)
      setCompletedOvers(state.completedOvers)
    }

    function onBallUpdate({ ball, over }: { ball: BallResult; over: number }) {
      setCurrentOver(over)
      setCurrentBalls((prev) => [...prev, ball])
    }

    function onOverComplete(over: OverStat) {
      setCompletedOvers((prev) => [...prev, over])
      setCurrentBalls([])
      setCurrentOver((n) => n + 1)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on(SOCKET_EVENTS.MATCH_STATE, onMatchState)
    socket.on(SOCKET_EVENTS.BALL_UPDATE, onBallUpdate)
    socket.on(SOCKET_EVENTS.OVER_COMPLETE, onOverComplete)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(SOCKET_EVENTS.MATCH_STATE, onMatchState)
      socket.off(SOCKET_EVENTS.BALL_UPDATE, onBallUpdate)
      socket.off(SOCKET_EVENTS.OVER_COMPLETE, onOverComplete)
    }
  }, [])

  return (
    <div className="text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-white/80 border-b border-gray-200 dark:bg-black/20 dark:border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white text-sm transition-colors no-underline"
            >
              ← Matches
            </Link>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
              />
              <span className="text-sm text-gray-600 dark:text-white/70">
                {connected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm px-4 py-1.5 border border-gray-300 text-gray-600 hover:text-gray-900 dark:border-white/20 dark:text-white/70 dark:hover:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Invite
            </button>
          )}
        </div>
      </div>

      {/* Main panels */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveOverPanel overNumber={currentOver} balls={currentBalls} />
        <OverStatsPanel completedOvers={completedOvers} />
      </main>

      {/* Scorer control — creator only */}
      {isCreator && <ScorerControl matchId={id} />}

      {showInvite && <InviteUserModal matchId={id} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
