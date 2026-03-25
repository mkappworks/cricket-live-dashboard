import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import { statsRouter } from './routes/stats.js'
import { matchesRouter, setIo } from './routes/matches.js'
import { requireAuth } from './middleware/requireAuth.js'
import { registerSocketHandlers } from './socket/handlers.js'
import { userSocketMap } from './socket/userSocketMap.js'

const PORT = 3001
const CLIENT_URL = 'http://localhost:5173'

const app = express()
app.use(cors({ origin: CLIENT_URL, credentials: true }))
app.use(express.json())

// better-auth handles all /api/auth/* routes
app.all('/api/auth/*', toNodeHandler(auth))

app.use('/api/stats', statsRouter)
app.use('/api/matches', requireAuth, matchesRouter)

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Inject io into matches router for real-time notifications
setIo(io)

// Socket.io auth middleware
io.use(async (socket, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(socket.handshake.headers),
    })
    if (!session) {
      return next(new Error('Unauthorized'))
    }
    socket.data.userId = session.user.id
    socket.data.user = session.user
    next()
  } catch {
    next(new Error('Auth error'))
  }
})

io.on('connection', (socket) => {
  const userId: string = socket.data.userId
  console.log(`Client connected: ${socket.id} (user: ${userId})`)
  userSocketMap.set(userId, socket.id)

  registerSocketHandlers(io, socket)

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
    userSocketMap.delete(userId)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
