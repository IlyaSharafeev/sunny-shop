import { Router, Request, Response } from 'express'
import { z } from 'zod'
import webpush from 'web-push'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:admin@sunny-shop.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (_req: Request, res: Response): void => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    res.status(503).json({ error: 'Push notifications not configured' })
    return
  }
  res.json({ publicKey: key })
})

// POST /api/push/subscribe
router.post('/subscribe', requireAuth, validate(subscribeSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const { endpoint, keys } = req.body as z.infer<typeof subscribeSchema>

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  })

  res.json({ success: true })
})

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  await prisma.pushSubscription.deleteMany({ where: { userId } })
  res.json({ success: true })
})

// POST /api/push/test — send test push to current user
router.post('/test', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })

  if (subs.length === 0) {
    res.status(404).json({ error: 'No subscription found' })
    return
  }

  const payload = JSON.stringify({
    title: 'Sunny Shop 🛒',
    body: 'Не забудь про закупи! Список чекає на тебе.',
    url: '/shopping',
  })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err: any) => {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
        throw err
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  res.json({ sent: succeeded, total: subs.length })
})

export default router
