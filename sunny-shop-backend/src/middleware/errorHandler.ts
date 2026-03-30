import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error(err)
  const e = err as { status?: number; statusCode?: number; message?: string }
  const status = e.status ?? e.statusCode ?? 500
  const message = e.message ?? 'Internal server error'
  res.status(status).json({ error: message })
}
