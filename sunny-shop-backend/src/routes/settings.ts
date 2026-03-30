import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { ensureUserSettings } from '../services/authService'

const router = Router()

const patchSettingsSchema = z.object({
  locale: z.string().optional(),
  accentColor: z.string().optional(),
  colorScheme: z.string().optional(),
  sortMode: z.string().optional(),
  activeStore: z.string().optional(),
})

// GET /api/settings
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  await ensureUserSettings(userId)
  const settings = await prisma.userSettings.findUnique({ where: { userId } })

  res.json(settings)
})

// PATCH /api/settings
router.patch('/', requireAuth, validate(patchSettingsSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const data = req.body as z.infer<typeof patchSettingsSchema>

  await ensureUserSettings(userId)
  const settings = await prisma.userSettings.update({
    where: { userId },
    data,
  })

  res.json({ settings })
})

export default router
