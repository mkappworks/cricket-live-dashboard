import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '../lib/auth-client'
import { socket } from '../socket'
import { SOCKET_EVENTS } from '@cricket-live/shared'
import { CreateMatchModal } from '../components/CreateMatchModal'
import { matchesQuery } from '../lib/queries'
import { matchesApi } from '../api'
import { useEffect } from 'react'

const LIMIT = 20

export function HomePage() {
  const { data: session } = authClient.useSession()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery(matchesQuery(page))

  const requestAccess = useMutation({
    mutationFn: (matchId: string) => matchesApi.requestAccess(matchId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['matches'] }),
  })

  const deleteMatch = useMutation({
    mutationFn: (matchId: string) => matchesApi.delete(matchId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['matches'] }),
  })

  // Re-fetch when access request is approved via socket
  useEffect(() => {
    function onApproved() {
      client.invalidateQueries({ queryKey: ['matches'] })
    }
    socket.on(SOCKET_EVENTS.REQUEST_APPROVED, onApproved)
    return () => {
      socket.off(SOCKET_EVENTS.REQUEST_APPROVED, onApproved)
    }
  }, [client])

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('Delete this match? All data will be lost.')) return
    deleteMatch.mutate(matchId)
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-gray-900 dark:text-white text-2xl font-bold">Matches</h2>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            {data ? `${data.total} match${data.total !== 1 ? 'es' : ''}` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
        >
          + New match
        </button>
      </div>

      {isLoading && (
        <div className="text-gray-400 dark:text-white/40 text-center py-20">Loading…</div>
      )}

      {!isLoading && data && data.matches.length === 0 && (
        <div className="text-gray-400 dark:text-white/40 text-center py-20">
          No matches yet. Create the first one!
        </div>
      )}

      {data && data.matches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.matches.map((match) => {
            const isCreator = match.creatorId === session?.user.id
            return (
              <div
                key={match.id}
                className="bg-white border border-gray-200 shadow-sm dark:bg-black/30 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-gray-900 dark:text-white font-semibold text-base leading-tight">
                    {match.name}
                  </h3>
                  {isCreator && (
                    <span className="shrink-0 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-700/40 px-2 py-0.5 rounded-full">
                      creator
                    </span>
                  )}
                </div>
                <div className="text-gray-500 dark:text-white/40 text-xs space-y-0.5">
                  <p>by {match.creatorEmail}</p>
                  <p>
                    {match.memberCount} member{match.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  {match.isMember ? (
                    <Link
                      to="/match/$id"
                      params={{ id: match.id }}
                      className="flex-1 text-center py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors no-underline"
                    >
                      View match
                    </Link>
                  ) : (
                    <button
                      onClick={() => requestAccess.mutate(match.id)}
                      disabled={requestAccess.isPending && requestAccess.variables === match.id}
                      className="flex-1 py-2 border border-gray-300 text-gray-600 hover:text-gray-900 text-sm rounded-xl hover:bg-gray-50 dark:border-white/20 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {requestAccess.isPending && requestAccess.variables === match.id
                        ? 'Requesting…'
                        : 'Request to join'}
                    </button>
                  )}
                  {isCreator && (
                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="p-2 text-red-400/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      aria-label="Delete match"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 text-gray-600 dark:border-white/20 dark:text-white/70 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-500 dark:text-white/50 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 text-gray-600 dark:border-white/20 dark:text-white/70 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {showCreate && (
        <CreateMatchModal
          onClose={() => {
            setShowCreate(false)
            client.invalidateQueries({ queryKey: ['matches'] })
          }}
        />
      )}
    </main>
  )
}
