import { useState } from 'react'
import { matchEvents } from '../socket'

interface Props {
  matchId: string
}

export function ScorerControl({ matchId }: Props) {
  const [runs, setRuns] = useState(0)
  const [isWicket, setIsWicket] = useState(false)
  const [isExtra, setIsExtra] = useState(false)
  const [extraType, setExtraType] = useState<'wide' | 'no-ball' | 'bye' | 'leg-bye' | ''>('')

  function submitBall() {
    matchEvents.addBall({
      matchId,
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
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-300 dark:bg-black/80 dark:border-white/10 backdrop-blur-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
        <span className="text-gray-500 dark:text-white/60 text-xs font-semibold uppercase tracking-wider">
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
                  : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Wicket toggle */}
        <button
          onClick={() => {
            setIsWicket((w) => !w)
            setRuns(0)
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
            isWicket
              ? 'bg-red-500 border-red-400 text-white'
              : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20'
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
              : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20'
          }`}
        >
          Extra
        </button>

        {isExtra && (
          <select
            value={extraType}
            onChange={(e) => setExtraType(e.target.value as typeof extraType)}
            className="bg-gray-100 border border-gray-300 text-gray-800 dark:bg-white/10 dark:border-white/20 dark:text-white text-sm rounded-lg px-2 py-1.5"
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
          onClick={() => matchEvents.resetMatch(matchId)}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/60 dark:hover:text-white font-medium rounded-lg text-sm transition-colors border border-gray-200 dark:border-white/10"
        >
          Reset Over
        </button>
      </div>
    </div>
  )
}
