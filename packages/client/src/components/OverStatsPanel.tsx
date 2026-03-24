import type { OverStat } from '@cricket-live/shared'

type Props = {
  completedOvers: OverStat[]
}

function economy(runs: number, overNumber: number): string {
  return (runs / overNumber).toFixed(2)
}

export function OverStatsPanel({ completedOvers }: Props) {
  const sorted = [...completedOvers].sort((a, b) => b.overNumber - a.overNumber)

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800">
          Over Statistics
          <span className="text-sm font-normal text-gray-500 ml-2">(Persisted)</span>
        </h2>
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-gray-400 text-sm">No overs completed yet.</p>
        </div>
      </div>
    )
  }

  const totalRuns = completedOvers.reduce((s, o) => s + o.runs, 0)
  const totalWickets = completedOvers.reduce((s, o) => s + o.wickets, 0)

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          Over Statistics
          <span className="text-sm font-normal text-gray-500 ml-2">(Persisted)</span>
        </h2>
        <span className="text-sm text-gray-600 font-medium">
          {totalRuns} runs · {totalWickets} wkts · Eco {economy(totalRuns, completedOvers.length)}
        </span>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-2 pr-4">Over</th>
              <th className="pb-2 pr-4">Balls</th>
              <th className="pb-2 pr-4">Runs</th>
              <th className="pb-2 pr-4">Wkts</th>
              <th className="pb-2 pr-4">Extras</th>
              <th className="pb-2">Economy</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((over) => (
              <tr
                key={over.overNumber}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-semibold text-gray-800">
                  {over.overNumber}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1">
                    {over.balls.map((ball, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                          ${ball.isWicket ? 'bg-red-100 text-red-700' : ball.runs === 6 ? 'bg-green-100 text-green-700' : ball.runs === 4 ? 'bg-emerald-100 text-emerald-700' : ball.isExtra ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {ball.isWicket ? 'W' : ball.runs}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-4 font-medium">{over.runs}</td>
                <td className="py-2 pr-4">
                  {over.wickets > 0 ? (
                    <span className="text-red-600 font-semibold">{over.wickets}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-gray-500">{over.extras}</td>
                <td className="py-2 font-medium text-indigo-600">
                  {economy(over.runs, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
