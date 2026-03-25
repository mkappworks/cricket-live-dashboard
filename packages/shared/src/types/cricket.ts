export type BallResult = {
  ball: number
  runs: number
  isWicket: boolean
  isExtra: boolean
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye'
  description?: string
}

export type OverStat = {
  id?: number
  matchId: string
  overNumber: number
  runs: number
  wickets: number
  extras: number
  balls: BallResult[]
  bowler?: string
}

export type MatchState = {
  matchId: string
  currentOver: number
  currentBalls: BallResult[]
  completedOvers: OverStat[]
}

export type BallInput = {
  runs: number
  isWicket?: boolean
  isExtra?: boolean
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye'
  description?: string
  matchId?: string
}

export type Match = {
  id: string
  name: string
  creatorId: string
  createdAt: Date
}

export type MatchMember = {
  matchId: string
  userId: string
  role: 'creator' | 'member'
  joinedAt: Date
}

export type MatchInvitation = {
  id: string
  matchId: string
  invitedEmail: string
  invitedById: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

export type MatchAccessRequest = {
  id: string
  matchId: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export type NotificationType =
  | 'invitation'
  | 'access_request'
  | 'invitation_accepted'
  | 'request_approved'
  | 'request_denied'

export type Notification = {
  type: NotificationType
  matchId: string
  matchName: string
  invitationId?: string
  requestId?: string
  fromUserEmail?: string
}

export type PaginatedMatches = {
  matches: (Match & { memberCount: number; creatorEmail: string; isMember: boolean })[]
  total: number
  page: number
  limit: number
}
