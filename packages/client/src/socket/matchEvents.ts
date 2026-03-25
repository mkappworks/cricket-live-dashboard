import { SOCKET_EVENTS } from '@cricket-live/shared'
import { socket } from './client'

export const matchEvents = {
  joinMatch: (matchId: string) => {
    socket.emit(SOCKET_EVENTS.JOIN_MATCH, { matchId })
  },

  leaveMatch: (matchId: string) => {
    socket.emit(SOCKET_EVENTS.LEAVE_MATCH, { matchId })
  },

  addBall: (payload: {
    matchId: string
    runs: number
    isWicket: boolean
    isExtra: boolean
    extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye'
  }) => {
    socket.emit(SOCKET_EVENTS.ADD_BALL, payload)
  },

  resetMatch: (matchId: string) => {
    socket.emit(SOCKET_EVENTS.RESET_MATCH, { matchId })
  },
}
