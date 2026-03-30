import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { syncHistory } from '../services/syncService'

const router = Router()

const sessionItemSchema = z.object({
  productClientId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().min(0).default(0),
})

const sessionInputSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  items: z.array(sessionItemSchema),
})

const syncSchema = z.object({
  sessions: z.array(sessionInputSchema),
})

// GET /api/history
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  const sessions = await prisma.shoppingSession.findMany({
    where: { userId, clientId: { not: 'current' } },
    include: { items: true },
    orderBy: { date: 'desc' },
    take: 30,
  })

  res.json({ sessions })
})

// POST /api/history/sync
router.post('/sync', requireAuth, validate(syncSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const { sessions } = req.body as z.infer<typeof syncSchema>

  const merged = await syncHistory(userId, sessions)
  res.json({ sessions: merged })
})

// DELETE /api/history (clear all) — must come before /:clientId
router.delete('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  await prisma.shoppingSession.deleteMany({
    where: { userId, clientId: { not: 'current' } },
  })

  res.json({ success: true })
})

// DELETE /api/history/:clientId
router.delete('/:clientId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const clientId = req.params['clientId'] as string

  await prisma.shoppingSession.deleteMany({ where: { userId, clientId } })
  res.json({ success: true })
})

export default router
