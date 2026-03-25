import { Outlet, Link } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client'
import { NotificationBell } from '../components/NotificationBell'
import { connectSocket, disconnectSocket } from '../socket'
import { useEffect } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

export function RootLayout() {
  const { data: session } = authClient.useSession()
  const { dark, toggle } = useDarkMode()

  useEffect(() => {
    if (session) {
      connectSocket()
    } else {
      disconnectSocket()
    }
  }, [session])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-green-950 dark:via-green-900 dark:to-emerald-900">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 dark:bg-black/30 dark:border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <span className="text-2xl">🏏</span>
            <h1 className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">
              Cricket Live
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {session && (
              <>
                <span className="text-sm text-gray-500 dark:text-white/60 hidden sm:block">
                  {session.user.email}
                </span>
                <NotificationBell />
                <Link
                  to="/settings"
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-colors no-underline"
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
                <button
                  onClick={() => authClient.signOut()}
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-white/70 dark:hover:text-white px-3 py-1.5 rounded-lg border border-gray-300 hover:border-gray-400 dark:border-white/20 dark:hover:border-white/40 transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
            {!session && (
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-white/70 dark:hover:text-white px-3 py-1.5 rounded-lg border border-gray-300 hover:border-gray-400 dark:border-white/20 dark:hover:border-white/40 transition-colors no-underline"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
