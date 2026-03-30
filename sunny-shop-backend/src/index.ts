import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { config } from './config'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import sessionRoutes from './routes/session'
import historyRoutes from './routes/history'
import settingsRoutes from './routes/settings'
import pushRoutes from './routes/push'
import { errorHandler } from './middleware/errorHandler'

const app = express()
app.set('trust proxy', 1)

// Security headers
app.use(helmet())

// Body parsing
app.use(express.json())

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        'https://sunny-shop-alpha.vercel.app',
        'https://automatization-in-store.vercel.app',
        'http://localhost:5173',
        'http://localhost:4173',
      ]
      if (!origin || allowed.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
)

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
})

// Health check (no auth, no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/products', apiLimiter, productRoutes)
app.use('/api/session', apiLimiter, sessionRoutes)
app.use('/api/history', apiLimiter, historyRoutes)
app.use('/api/settings', apiLimiter, settingsRoutes)
app.use('/api/push', apiLimiter, pushRoutes)

// Global error handler
app.use(errorHandler)

const port = parseInt(process.env.PORT || '3000', 10)
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`)
})

export default app
