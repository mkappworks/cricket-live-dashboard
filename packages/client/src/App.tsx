import { useEffect, useState } from 'react'
import { socket } from './socket'
import { LiveOverPanel } from './components/LiveOverPanel'
import { OverStatsPanel } from './components/OverStatsPanel'
import type { BallResult, MatchState, OverStat } from './types/cricket'

export default function App() {
  const [currentOver, setCurrentOver] = useState(1)
  const [currentBalls, setCurrentBalls] = useState<BallResult[]>([])
  const [completedOvers, setCompletedOvers] = useState<OverStat[]>([])
  const [connected, setConnected] = useState(false)

  // Hydrate completed overs from REST on mount
  useEffect(() => {
    fetch('/api/stats/match-1')
      .then((r) => r.json())
      .then((data: OverStat[]) => {
        setCompletedOvers(data)
      })
      .catch(console.error)
  }, [])

  // Socket.io event listeners
  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('match_state', (state: MatchState) => {
      setCurrentOver(state.currentOver)
      setCurrentBalls(state.currentBalls)
      setCompletedOvers(state.completedOvers)
    })

    socket.on('ball_update', ({ ball, over }: { ball: BallResult; over: number }) => {
      setCurrentOver(over)
      setCurrentBalls((prev) => [...prev, ball])
    })

    socket.on('over_complete', (over: OverStat) => {
      setCompletedOvers((prev) => [...prev, over])
      setCurrentBalls([])
      setCurrentOver((n) => n + 1)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('match_state')
      socket.off('ball_update')
      socket.off('over_complete')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-900 text-gray-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏏</span>
            <h1 className="text-white font-bold text-xl tracking-tight">
              Cricket Live Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
            />
            <span className="text-sm text-white/70">
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main panels */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveOverPanel overNumber={currentOver} balls={currentBalls} />
        <OverStatsPanel completedOvers={completedOvers} />
      </main>

      {/* Scorer control (dev/demo tool) */}
      <ScorerControl />
    </div>
  )
}

function ScorerControl() {
  const [runs, setRuns] = useState(0)
  const [isWicket, setIsWicket] = useState(false)
  const [isExtra, setIsExtra] = useState(false)
  const [extraType, setExtraType] = useState<'wide' | 'no-ball' | 'bye' | 'leg-bye' | ''>('')

  function submitBall() {
    socket.emit('add_ball', {
      runs,
      isWicket,
      isExtra,
      extraType: isExtra && extraType ? extraType : undefined,
    })
    setRuns(0)
    setIsWicket(false)
    setIsExtra(false)
    setExtraType('')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
        <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
          Scorer
        </span>

        {/* Quick run buttons */}
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button
              key={r}
              onClick={() => setRuns(r)}
              className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${
                runs === r && !isWicket
                  ? 'bg-yellow-400 border-yellow-300 text-gray-900'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Wicket toggle */}
        <button
          onClick={() => { setIsWicket((w) => !w); setRuns(0) }}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
            isWicket
              ? 'bg-red-500 border-red-400 text-white'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          W Wicket
        </button>

        {/* Extra toggle */}
        <button
          onClick={() => setIsExtra((e) => !e)}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
            isExtra
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          Extra
        </button>

        {isExtra && (
          <select
            value={extraType}
            onChange={(e) => setExtraType(e.target.value as typeof extraType)}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-2 py-1.5"
          >
            <option value="">Type</option>
            <option value="wide">Wide</option>
            <option value="no-ball">No Ball</option>
            <option value="bye">Bye</option>
            <option value="leg-bye">Leg Bye</option>
          </select>
        )}

        {/* Submit */}
        <button
          onClick={submitBall}
          className="ml-auto px-5 py-1.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg text-sm transition-colors"
        >
          Add Ball →
        </button>

        {/* Reset over */}
        <button
          onClick={() => socket.emit('reset_match')}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white font-medium rounded-lg text-sm transition-colors border border-white/10"
        >
          Reset Over
        </button>
      </div>
    </div>
  )
}
