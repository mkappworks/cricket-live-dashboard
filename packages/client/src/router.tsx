import {
  createRouter,
  createRoute,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MatchPage } from './pages/MatchPage'
import { SettingsPage } from './pages/SettingsPage'
import { authClient } from './lib/auth-client'
import { queryClient } from './lib/query-client'
import { membershipQuery } from './lib/queries'

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) throw redirect({ to: '/login' })
  },
  component: HomePage,
})

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$id',
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) throw redirect({ to: '/login' })
  },
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(membershipQuery(params.id))
    if (!data.isMember) throw redirect({ to: '/' })
    return data
  },
  component: MatchPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) throw redirect({ to: '/login' })
  },
  component: SettingsPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (session.data) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

const routeTree = rootRoute.addChildren([homeRoute, matchRoute, settingsRoute, loginRoute])

export const router = createRouter({ routeTree, context: { queryClient } })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
