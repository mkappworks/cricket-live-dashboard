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
