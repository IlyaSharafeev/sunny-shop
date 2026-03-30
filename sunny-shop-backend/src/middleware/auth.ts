import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { config } from '../config'

export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' })
    return
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as { userId: string }
    ;(req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
