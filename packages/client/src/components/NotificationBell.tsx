import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { socket } from '../socket'
import { SOCKET_EVENTS } from '@cricket-live/shared'
import type { Notification } from '@cricket-live/shared'
import { notificationsQuery, type PendingInvitation } from '../lib/queries'
import { matchesApi } from '../api'

export function NotificationBell() {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [toasts, setToasts] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery(notificationsQuery())
  const invitations: PendingInvitation[] = data?.invitations ?? []

  function addToast(msg: string) {
    setToasts((prev) => [...prev, msg])
    setTimeout(() => setToasts((prev) => prev.slice(1)), 4000)
  }

  const accept = useMutation({
    mutationFn: (inv: PendingInvitation) =>
      matchesApi.acceptInvitation(inv.matchId, inv.id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const reject = useMutation({
    mutationFn: (inv: PendingInvitation) =>
      matchesApi.rejectInvitation(inv.matchId, inv.id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    function onInvitation(data: Notification) {
      client.invalidateQueries({ queryKey: ['notifications'] })
      addToast(`You were invited to "${data.matchName}"`)
    }

    function onRequestApproved(data: Notification) {
      addToast(`Your request to join "${data.matchName}" was approved!`)
    }

    function onRequestDenied(data: Notification) {
      addToast(`Your request to join "${data.matchName}" was denied.`)
    }

    socket.on(SOCKET_EVENTS.MATCH_INVITATION, onInvitation)
    socket.on(SOCKET_EVENTS.REQUEST_APPROVED, onRequestApproved)
    socket.on(SOCKET_EVENTS.REQUEST_DENIED, onRequestDenied)

    return () => {
      socket.off(SOCKET_EVENTS.MATCH_INVITATION, onInvitation)
      socket.off(SOCKET_EVENTS.REQUEST_APPROVED, onRequestApproved)
      socket.off(SOCKET_EVENTS.REQUEST_DENIED, onRequestDenied)
    }
  }, [client])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const count = invitations.length

  return (
    <>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t, i) => (
          <div
            key={i}
            className="bg-emerald-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg border border-emerald-600"
          >
            {t}
          </div>
        ))}
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
          aria-label="Notifications"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 shadow-xl dark:bg-green-950 dark:border-white/10 rounded-2xl z-40 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-white/10">
              <span className="text-gray-900 dark:text-white font-semibold text-sm">
                Notifications
              </span>
            </div>
            {invitations.length === 0 ? (
              <div className="p-4 text-gray-400 dark:text-white/40 text-sm text-center">
                No pending notifications
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {invitations.map((inv) => (
                  <li key={inv.id} className="p-4">
                    <p className="text-gray-900 dark:text-white text-sm mb-1">
                      You&apos;re invited to{' '}
                      <span className="font-semibold">{inv.matchName ?? inv.matchId}</span>
                    </p>
                    {inv.inviterEmail && (
                      <p className="text-gray-500 dark:text-white/40 text-xs mb-3">
                        from {inv.inviterEmail}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => accept.mutate(inv)}
                        disabled={accept.isPending}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => reject.mutate(inv)}
                        disabled={reject.isPending}
                        className="flex-1 py-1.5 border border-gray-300 text-gray-600 hover:text-gray-900 dark:border-white/20 dark:text-white/60 dark:hover:text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}
