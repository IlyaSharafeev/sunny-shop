import { Router, Request, Response } from 'express'
import { randomBytes } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/share — create a share code (owner only)
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  // Delete existing share codes for this user
  await prisma.sharedSession.deleteMany({ where: { ownerId: userId } })

  const shareCode = randomBytes(4).toString('hex').toUpperCase() // e.g. "A3F9B2C1"
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  await prisma.sharedSession.create({
    data: { shareCode, ownerId: userId, expiresAt },
  })

  res.json({ shareCode, expiresAt })
})

// GET /api/share/:code — validate code and get owner info
router.get('/:code', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params

  const shared = await prisma.sharedSession.findUnique({
    where: { shareCode: code },
    include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
  })

  if (!shared || shared.expiresAt < new Date()) {
    res.status(404).json({ error: 'Share code not found or expired' })
    return
  }

  res.json({
    shareCode: shared.shareCode,
    ownerName: shared.owner.name ?? 'Власник',
    ownerAvatar: shared.owner.avatarUrl,
    expiresAt: shared.expiresAt,
  })
})

// DELETE /api/share — revoke own share code
router.delete('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  await prisma.sharedSession.deleteMany({ where: { ownerId: userId } })
  res.json({ ok: true })
})

export default router
