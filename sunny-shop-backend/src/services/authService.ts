import bcrypt from 'bcrypt'
import prisma from '../lib/prisma'
import { signAccessToken, createRefreshToken } from '../lib/jwt'

export interface UserPublic {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  hasPassword: boolean
  googleId: string | null
  appleId: string | null
}

type UserRecord = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  passwordHash: string | null
  googleId: string | null
  appleId: string | null
}

export function toUserPublic(user: UserRecord): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    hasPassword: !!user.passwordHash,
    googleId: user.googleId,
    appleId: user.appleId,
  }
}

export async function createAuthTokens(
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken(userId)
  const refreshToken = await createRefreshToken(userId)
  return { accessToken, refreshToken }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  passwordHash: string | null,
  password: string
): Promise<boolean> {
  if (!passwordHash) return false
  return bcrypt.compare(password, passwordHash)
}

export async function ensureUserSettings(userId: string): Promise<void> {
  const existing = await prisma.userSettings.findUnique({ where: { userId } })
  if (!existing) {
    await prisma.userSettings.create({ data: { userId } })
  }
}
