import { io } from 'socket.io-client'

export const socket = io('http://localhost:3001', {
  autoConnect: false,
  withCredentials: true,
})

export function connectSocket() {
  if (!socket.connected) socket.connect()
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect()
}
