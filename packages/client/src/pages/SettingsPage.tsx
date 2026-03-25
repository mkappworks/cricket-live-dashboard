import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '../lib/auth-client'

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function parseUserAgent(ua: string | null | undefined) {
  if (!ua) return 'Unknown device'
  if (/iPhone|iPad/.test(ua)) return 'iPhone / iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Chrome/.test(ua)) return 'Chrome'
  if (/Firefox/.test(ua)) return 'Firefox'
  if (/Safari/.test(ua)) return 'Safari'
  return ua.slice(0, 60)
}

export function SettingsPage() {
  const client = useQueryClient()
  const { data: currentSession } = authClient.useSession()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const result = await authClient.listSessions()
      return result.data ?? []
    },
  })

  const revoke = useMutation({
    mutationFn: async (token: string) => authClient.revokeSession({ token }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['sessions'] }),
  })

  const revokeOthers = useMutation({
    mutationFn: async () => authClient.revokeOtherSessions(),
    onSuccess: () => client.invalidateQueries({ queryKey: ['sessions'] }),
  })

  const currentToken = currentSession?.session.token

  const otherSessions = sessions?.filter((s) => s.token !== currentToken) ?? []

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h2 className="text-gray-900 dark:text-white text-2xl font-bold mb-8">Account Settings</h2>

      {/* Sessions section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-800 dark:text-white/80 font-semibold text-lg">Active Sessions</h3>
          {otherSessions.length > 0 && (
            <button
              onClick={() => revokeOthers.mutate()}
              disabled={revokeOthers.isPending}
              className="text-sm px-4 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700/40 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {revokeOthers.isPending ? 'Signing out…' : 'Sign out all other devices'}
            </button>
          )}
        </div>

        {isLoading && (
          <p className="text-gray-400 dark:text-white/40 text-sm py-8 text-center">Loading sessions…</p>
        )}

        {!isLoading && sessions && sessions.length === 0 && (
          <p className="text-gray-400 dark:text-white/40 text-sm py-8 text-center">
            No active sessions found.
          </p>
        )}

        <div className="space-y-3">
          {sessions?.map((session) => {
            const isCurrent = session.token === currentToken
            return (
              <div
                key={session.id}
                className={`bg-white border rounded-2xl p-5 flex items-start justify-between gap-4 dark:bg-black/30 ${
                  isCurrent
                    ? 'border-emerald-300 dark:border-emerald-700/60'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-white font-medium text-sm">
                      {parseUserAgent(session.userAgent)}
                    </p>
                    {isCurrent && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700/40 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  {session.ipAddress && (
                    <p className="text-gray-500 dark:text-white/40 text-xs">IP: {session.ipAddress}</p>
                  )}
                  <p className="text-gray-400 dark:text-white/30 text-xs">
                    Started: {formatDate(session.createdAt)} · Expires:{' '}
                    {formatDate(session.expiresAt)}
                  </p>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => revoke.mutate(session.token)}
                    disabled={revoke.isPending}
                    className="shrink-0 text-sm px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700/40 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
