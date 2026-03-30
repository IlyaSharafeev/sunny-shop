import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { syncProducts } from '../services/syncService'

const router = Router()

const productInputSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  storeId: z.string().min(1),
  unit: z.string().min(1),
  isCustom: z.boolean(),
  isReminder: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
})

const syncSchema = z.object({
  products: z.array(productInputSchema),
})

// GET /api/products
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  const products = await prisma.product.findMany({
    where: { userId, isDeleted: false },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })

  res.json({ products })
})

// POST /api/products/sync
router.post('/sync', requireAuth, validate(syncSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const { products } = req.body as z.infer<typeof syncSchema>

  const merged = await syncProducts(userId, products)
  res.json({ products: merged })
})

// DELETE /api/products/:clientId
router.delete('/:clientId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const clientId = req.params['clientId'] as string

  await prisma.product.updateMany({
    where: { userId, clientId },
    data: { isDeleted: true },
  })

  res.json({ success: true })
})

export default router
