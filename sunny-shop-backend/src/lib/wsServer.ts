import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Server } from 'http'
import jwt from 'jsonwebtoken'
import prisma from './prisma'
import { config } from '../config'

interface WsClient extends WebSocket {
  userId?: string
  userName?: string
  shareCode?: string
}

interface Room {
  ownerId: string
  clients: Set<WsClient>
}

const rooms = new Map<string, Room>()

function broadcast(room: Room, data: object, exclude?: WsClient) {
  const msg = JSON.stringify(data)
  for (const client of room.clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

function broadcastAll(room: Room, data: object) {
  const msg = JSON.stringify(data)
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

async function getSessionSnapshot(ownerId: string) {
  const session = await prisma.shoppingSession.findFirst({
    where: { userId: ownerId, clientId: 'current' },
    include: { items: true },
  })
  return session?.items ?? []
}

export function setupWsServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws: WsClient, req: IncomingMessage) => {
    try {
      const url = new URL(req.url!, `http://localhost`)
      const token = url.searchParams.get('token')
      const shareCode = url.searchParams.get('shareCode')

      if (!token || !shareCode) {
        ws.close(1008, 'Missing token or shareCode')
        return
      }

      // Validate JWT
      let userId: string
      try {
        const payload = jwt.verify(token, config.jwtSecret) as { userId: string }
        userId = payload.userId
      } catch {
        ws.close(1008, 'Invalid token')
        return
      }

      // Validate shareCode
      const sharedSession = await prisma.sharedSession.findUnique({
        where: { shareCode },
      })

      if (!sharedSession || sharedSession.expiresAt < new Date()) {
        ws.close(1008, 'Invalid or expired share code')
        return
      }

      // Get user name
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      })
      if (!user) { ws.close(1008, 'User not found'); return }

      ws.userId = userId
      ws.userName = user.name ?? 'Гість'
      ws.shareCode = shareCode

      // Add to room
      let room = rooms.get(shareCode)
      if (!room) {
        room = { ownerId: sharedSession.ownerId, clients: new Set() }
        rooms.set(shareCode, room)
      }
      room.clients.add(ws)

      // Notify others that someone joined
      broadcast(room, {
        type: 'MEMBER_JOIN',
        name: ws.userName,
        isOwner: userId === sharedSession.ownerId,
      }, ws)

      // Send current participant list to new client
      const participantNames = [...room.clients]
        .filter(c => c !== ws && c.readyState === WebSocket.OPEN)
        .map(c => ({ name: c.userName ?? 'Гість', isOwner: c.userId === sharedSession.ownerId }))

      // Send current session state + participants to new client
      const items = await getSessionSnapshot(sharedSession.ownerId)
      ws.send(JSON.stringify({
        type: 'INIT',
        items,
        ownerName: (await prisma.user.findUnique({ where: { id: sharedSession.ownerId }, select: { name: true } }))?.name ?? 'Власник',
        participants: participantNames,
      }))

      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString()) as {
            type: string
            productClientId?: string
            price?: number
            qty?: number
          }
          const room = rooms.get(shareCode!)
          if (!room) return

          const ownerId = room.ownerId

          if (msg.type === 'TOGGLE' && msg.productClientId) {
            const session = await prisma.shoppingSession.findFirst({
              where: { userId: ownerId, clientId: 'current' },
              include: { items: true },
            })
            if (!session) return

            const existing = session.items.find(i => i.productClientId === msg.productClientId)
            if (existing) {
              await prisma.sessionItem.delete({ where: { id: existing.id } })
            } else {
              await prisma.sessionItem.create({
                data: {
                  sessionId: session.id,
                  productClientId: msg.productClientId,
                  price: msg.price ?? 0,
                  quantity: 1,
                },
              })
            }
          } else if (msg.type === 'SET_QTY' && msg.productClientId && msg.qty !== undefined) {
            const session = await prisma.shoppingSession.findFirst({
              where: { userId: ownerId, clientId: 'current' },
              include: { items: true },
            })
            if (!session) return
            const item = session.items.find(i => i.productClientId === msg.productClientId)
            if (item) {
              if (msg.qty <= 0) {
                await prisma.sessionItem.delete({ where: { id: item.id } })
              } else {
                await prisma.sessionItem.update({ where: { id: item.id }, data: { quantity: msg.qty } })
              }
            }
          } else if (msg.type === 'SET_PRICE' && msg.productClientId && msg.price !== undefined) {
            const session = await prisma.shoppingSession.findFirst({
              where: { userId: ownerId, clientId: 'current' },
              include: { items: true },
            })
            if (!session) return
            const item = session.items.find(i => i.productClientId === msg.productClientId)
            if (item) {
              await prisma.sessionItem.update({ where: { id: item.id }, data: { price: msg.price } })
            }
          } else {
            return // unknown message type
          }

          // Broadcast updated session to all in room
          const updatedItems = await getSessionSnapshot(ownerId)
          broadcastAll(room, { type: 'SESSION_UPDATE', items: updatedItems })
        } catch (err) {
          console.error('WS message error:', err)
        }
      })

      ws.on('close', () => {
        const room = rooms.get(shareCode!)
        if (!room) return
        room.clients.delete(ws)
        if (room.clients.size === 0) {
          rooms.delete(shareCode!)
        } else {
          broadcast(room, { type: 'MEMBER_LEAVE', name: ws.userName ?? 'Гість' })
        }
      })
    } catch (err) {
      console.error('WS connection error:', err)
      ws.close(1011, 'Internal error')
    }
  })

  return wss
}
