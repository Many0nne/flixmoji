import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { ClientToServerEvents, ServerToClientEvents } from './types'
import { registerRoomHandlers } from './rooms/handlers'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())

const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

// In-memory room store
import { Room } from './types'
export const rooms = new Map<string, Room>()

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`)
  registerRoomHandlers(io, socket, rooms)

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    // Handled inside registerRoomHandlers
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`[server] Flixmoji server running on port ${PORT}`)
})
