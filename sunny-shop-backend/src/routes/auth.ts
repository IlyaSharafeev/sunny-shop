import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { rotateRefreshToken } from '../lib/jwt'
import { verifyGoogleToken } from '../lib/google'
import { verifyAppleToken } from '../lib/apple'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import {
  toUserPublic,
  createAuthTokens,
  hashPassword,
  verifyPassword,
  ensureUserSettings,
} from '../services/authService'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const googleSchema = z.object({
  idToken: z.string().min(1),
})

const appleSchema = z.object({
  identityToken: z.string().min(1),
  user: z
    .object({
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
})

const googleTokenSchema = z.object({
  accessToken: z.string().min(1),
})

const setPasswordSchema = z.object({
  password: z.string().min(8),
})

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as z.infer<typeof registerSchema>

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({ data: { email, passwordHash, name } })
  await ensureUserSettings(user.id)

  const tokens = await createAuthTokens(user.id)
  res.status(201).json({ user: toUserPublic(user), ...tokens })
})

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof loginSchema>

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  await ensureUserSettings(user.id)
  const tokens = await createAuthTokens(user.id)
  res.json({ user: toUserPublic(user), ...tokens })
})

// POST /api/auth/google
router.post('/google', validate(googleSchema), async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body as z.infer<typeof googleSchema>

  let payload
  try {
    payload = await verifyGoogleToken(idToken)
  } catch {
    res.status(401).json({ error: 'Invalid Google token' })
    return
  }

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } })
  let isNew = false

  if (!user) {
    // Check if email already exists
    if (payload.email) {
      user = await prisma.user.findUnique({ where: { email: payload.email } })
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, avatarUrl: payload.picture ?? user.avatarUrl },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: payload.sub,
          email: payload.email ?? null,
          name: payload.name ?? null,
          avatarUrl: payload.picture ?? null,
        },
      })
      isNew = true
    }
  }

  await ensureUserSettings(user.id)
  const tokens = await createAuthTokens(user.id)
  res.status(isNew ? 201 : 200).json({ user: toUserPublic(user), ...tokens, isNew })
})

// POST /api/auth/google-token (OAuth2 access_token, no FedCM)
router.post('/google-token', validate(googleTokenSchema), async (req: Request, res: Response): Promise<void> => {
  const { accessToken } = req.body as z.infer<typeof googleTokenSchema>

  let googleUser: { sub: string; email?: string; name?: string; picture?: string }
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!userInfoRes.ok) throw new Error('Failed to fetch user info')
    googleUser = await userInfoRes.json() as { sub: string; email?: string; name?: string; picture?: string }
    if (!googleUser.sub) throw new Error('No sub in user info')
  } catch {
    res.status(401).json({ error: 'Invalid Google token' })
    return
  }

  let user = await prisma.user.findUnique({ where: { googleId: googleUser.sub } })
  let isNew = false

  if (!user) {
    if (googleUser.email) {
      user = await prisma.user.findUnique({ where: { email: googleUser.email } })
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.sub, avatarUrl: googleUser.picture ?? user.avatarUrl },
        })
      }
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: googleUser.sub,
          email: googleUser.email ?? null,
          name: googleUser.name ?? null,
          avatarUrl: googleUser.picture ?? null,
        },
      })
      isNew = true
    }
  }

  await ensureUserSettings(user.id)
  const tokens = await createAuthTokens(user.id)
  res.status(isNew ? 201 : 200).json({ user: toUserPublic(user), ...tokens, isNew })
})

// POST /api/auth/set-password
router.post('/set-password', requireAuth, validate(setPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const { password } = req.body as z.infer<typeof setPasswordSchema>

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  res.json({ user: toUserPublic(user) })
})

// POST /api/auth/apple
router.post('/apple', validate(appleSchema), async (req: Request, res: Response): Promise<void> => {
  const { identityToken, user: appleUser } = req.body as z.infer<typeof appleSchema>

  let payload
  try {
    payload = await verifyAppleToken(identityToken)
  } catch {
    res.status(401).json({ error: 'Invalid Apple token' })
    return
  }

  let user = await prisma.user.findUnique({ where: { appleId: payload.sub } })
  let isNew = false

  if (!user) {
    const firstName = appleUser?.name?.firstName ?? ''
    const lastName = appleUser?.name?.lastName ?? ''
    const name = [firstName, lastName].filter(Boolean).join(' ') || null

    user = await prisma.user.create({
      data: {
        appleId: payload.sub,
        email: payload.email ?? null,
        name,
      },
    })
    isNew = true
  }

  await ensureUserSettings(user.id)
  const tokens = await createAuthTokens(user.id)
  res.status(isNew ? 201 : 200).json({ user: toUserPublic(user), ...tokens, isNew })
})

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>

  const result = await rotateRefreshToken(refreshToken)
  if (!result) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
    return
  }

  res.json(result)
})

// POST /api/auth/logout
router.post('/logout', requireAuth, validate(logoutSchema), async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as z.infer<typeof logoutSchema>
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  res.json({ success: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ user: toUserPublic(user) })
})

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, validate(updateProfileSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).userId!
  const { name } = req.body as z.infer<typeof updateProfileSchema>

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...(name !== undefined && { name }) },
  })

  res.json({ user: toUserPublic(user) })
})

export default router
