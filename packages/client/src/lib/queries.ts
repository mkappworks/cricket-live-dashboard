import { matchesApi } from '../api'

const LIMIT = 20

export interface MatchItem {
  id: string
  name: string
  creatorId: string
  creatorEmail: string
  memberCount: number
  isMember: boolean
  createdAt: string | null
}

export interface PaginatedMatches {
  matches: MatchItem[]
  total: number
  page: number
  limit: number
}

export interface MembershipData {
  isMember: boolean
  isCreator: boolean
}

export interface PendingInvitation {
  id: string
  matchId: string
  matchName: string | null
  inviterEmail: string | null
  createdAt: Date | null
}

export function matchesQuery(page: number) {
  return {
    queryKey: ['matches', page] as const,
    queryFn: async () => {
      const { data } = await matchesApi.list(page, LIMIT)
      return data as PaginatedMatches
    },
  }
}

export function membershipQuery(matchId: string) {
  return {
    queryKey: ['membership', matchId] as const,
    queryFn: async () => {
      const { data } = await matchesApi.getMembership(matchId)
      return data as MembershipData
    },
  }
}

export function notificationsQuery() {
  return {
    queryKey: ['notifications'] as const,
    queryFn: async () => {
      const { data } = await matchesApi.getNotifications()
      return data as { invitations: PendingInvitation[] }
    },
  }
}
