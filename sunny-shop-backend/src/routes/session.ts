import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const CURRENT_SESSION_CLIENT_ID = 'current'

const checkedItemSchema = z.object({
  productClientId: z.string().min(1),
  quantity: z.number().int().positive(),
})

const putSessionSchema = z.object({
  items: z.array(checkedItemSchema),
})

// GET /api/session
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  const session = await prisma.shoppingSession.findUnique({
    where: { userId_clientId: { userId, clientId: CURRENT_SESSION_CLIENT_ID } },
    include: { items: true },
  })

  const items = session?.items.map((item) => ({
    productClientId: item.productClientId,
    quantity: item.quantity,
  })) ?? []

  res.json({ items })
})

// PUT /api/session
router.put('/', requireAuth, validate(putSessionSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const { items } = req.body as z.infer<typeof putSessionSchema>

  // Upsert the current session
  const session = await prisma.shoppingSession.upsert({
    where: { userId_clientId: { userId, clientId: CURRENT_SESSION_CLIENT_ID } },
    create: {
      userId,
      clientId: CURRENT_SESSION_CLIENT_ID,
      date: new Date(),
    },
    update: {
      date: new Date(),
    },
  })

  // Replace all items
  await prisma.sessionItem.deleteMany({ where: { sessionId: session.id } })
  if (items.length > 0) {
    await prisma.sessionItem.createMany({
      data: items.map((item) => ({
        sessionId: session.id,
        productClientId: item.productClientId,
        quantity: item.quantity,
      })),
    })
  }

  res.json({ items })
})

export default router
