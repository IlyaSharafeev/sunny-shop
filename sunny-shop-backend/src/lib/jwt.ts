import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import prisma from './prisma'

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires as jwt.SignOptions['expiresIn'],
  })
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } })
  if (!stored || stored.expiresAt < new Date()) return null

  await prisma.refreshToken.delete({ where: { token: oldToken } })
  const accessToken = signAccessToken(stored.userId)
  const refreshToken = await createRefreshToken(stored.userId)
  return { accessToken, refreshToken }
}
