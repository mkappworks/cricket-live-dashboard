import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { sql } from 'drizzle-orm'
import { db } from './db/client.js'
import { statsRouter } from './routes/stats.js'
import { registerSocketHandlers, initMatchState } from './socket/handlers.js'

const PORT = 3001
const CLIENT_URL = 'http://localhost:5173'

const app = express()
app.use(cors({ origin: CLIENT_URL }))
app.use(express.json())

async function ensureSchema() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS over_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      over_number INTEGER NOT NULL,
      runs INTEGER NOT NULL,
      wickets INTEGER NOT NULL,
      extras INTEGER NOT NULL,
      balls TEXT NOT NULL,
      bowler TEXT,
      created_at INTEGER,
      UNIQUE(match_id, over_number)
    )
  `)
}

app.use('/api/stats', statsRouter)

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  registerSocketHandlers(io, socket)
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

async function start() {
  await ensureSchema()
  await initMatchState()

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch(console.error)
