import type { BallResult } from '../types/cricket'

type Props = {
  overNumber: number
  balls: BallResult[]
}

function getBallStyle(ball: BallResult): string {
  if (ball.isWicket) return 'bg-red-500 text-white border-red-600'
  if (ball.runs === 6) return 'bg-green-500 text-white border-green-600'
  if (ball.runs === 4) return 'bg-emerald-400 text-white border-emerald-500'
  if (ball.isExtra) return 'bg-blue-400 text-white border-blue-500'
  if (ball.runs === 0) return 'bg-gray-200 text-gray-600 border-gray-300'
  return 'bg-yellow-300 text-gray-800 border-yellow-400'
}

function getBallLabel(ball: BallResult): string {
  if (ball.isWicket) return 'W'
  if (ball.isExtra) {
    const shortMap: Record<string, string> = {
      wide: 'Wd',
      'no-ball': 'Nb',
      bye: 'B',
      'leg-bye': 'Lb',
    }
    return ball.extraType ? shortMap[ball.extraType] ?? 'E' : 'E'
  }
  return String(ball.runs)
}

export function LiveOverPanel({ overNumber, balls }: Props) {
  const slots = Array.from({ length: 6 }, (_, i) => balls[i] ?? null)

  const totalRuns = balls.reduce((s, b) => s + b.runs, 0)
  const wickets = balls.filter((b) => b.isWicket).length

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          Over {overNumber}
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Live)
          </span>
        </h2>
        {balls.length > 0 && (
          <span className="text-sm text-gray-600 font-medium">
            {totalRuns} runs · {wickets} wkt{wickets !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Ball slots */}
      <div className="flex gap-3 items-center">
        {slots.map((ball, idx) =>
          ball ? (
            <div
              key={idx}
              title={ball.description}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${getBallStyle(ball)}`}
            >
              {getBallLabel(ball)}
            </div>
          ) : (
            <div
              key={idx}
              className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs"
            >
              {idx + 1}
            </div>
          )
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Wicket
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> 6
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-400" /> 4
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-400" /> Extra
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-gray-200" /> Dot
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-300" /> Runs
        </span>
      </div>

      {balls.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-2">
          Waiting for first ball...
        </p>
      )}
    </div>
  )
}
