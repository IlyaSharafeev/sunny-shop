# Sunny Shop — Backend Specification

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 5
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL (Railway free tier — 1GB)
- **Auth**: JWT (access + refresh tokens) + Google OAuth2 + Apple Sign In
- **Deploy**: Railway (free tier, deploy from GitHub)
- **Validation**: zod
- **Password hash**: bcrypt (for custom email/password auth)

---

## Project structure

```
sunny-shop-backend/
  prisma/
    schema.prisma
    migrations/
  src/
    index.ts              # Express app entry
    config.ts             # env vars
    middleware/
      auth.ts             # JWT verify middleware
      validate.ts         # zod validation middleware
      errorHandler.ts     # global error handler
    routes/
      auth.ts             # /api/auth/*
      products.ts         # /api/products/*
      session.ts          # /api/session/*
      history.ts          # /api/history/*
      settings.ts         # /api/settings/*
    services/
      authService.ts      # token generation, OAuth verification
      syncService.ts      # merge/sync logic
    lib/
      prisma.ts           # Prisma client singleton
      jwt.ts              # sign/verify helpers
      google.ts           # Google token verification
      apple.ts            # Apple token verification
  .env.example
  package.json
  tsconfig.json
  railway.json
```

---

## Environment variables (.env.example)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/sunny_shop"

# JWT
JWT_ACCESS_SECRET="your-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Apple Sign In
APPLE_CLIENT_ID="com.yourapp.sunnyshop"
APPLE_TEAM_ID="YOUR_TEAM_ID"
APPLE_KEY_ID="YOUR_KEY_ID"
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# App
PORT=3000
CLIENT_URL="https://automatization-in-store.vercel.app"
NODE_ENV="production"
```

---

## Prisma Schema (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  avatarUrl     String?
  passwordHash  String?   // null for OAuth-only users

  googleId      String?   @unique
  appleId       String?   @unique

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  products      Product[]
  sessions      ShoppingSession[]
  settings      UserSettings?
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Product {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  clientId  String   // original id from frontend (e.g. "zh-01", or uuid for custom)
  name      String
  storeId   String   // 'zhanet' | 'lidl' | 'mladost' | 'sklad' | 'any'
  unit      String   // 'кг' | 'л' | 'шт' | 'г' | 'пач' | 'бан' | '—'
  isCustom  Boolean  @default(false)
  isReminder Boolean @default(false)
  isDeleted Boolean  @default(false) // soft delete
  position  Int      @default(0)     // for manual ordering

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, clientId])
}

model ShoppingSession {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  clientId  String        // original id from frontend
  date      DateTime
  items     SessionItem[]

  createdAt DateTime      @default(now())

  @@unique([userId, clientId])
}

model SessionItem {
  id         String          @id @default(cuid())
  sessionId  String
  session    ShoppingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  productClientId String    // references Product.clientId
  quantity        Int
}

model UserSettings {
  id           String  @id @default(cuid())
  userId       String  @unique
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  locale       String  @default("uk")     // 'uk' | 'ru'
  accentColor  String  @default("#4CAF50")
  colorScheme  String  @default("light")  // 'light' | 'dark'
  sortMode     String  @default("default")
  activeStore  String  @default("zhanet")

  updatedAt    DateTime @updatedAt
}
```

---

## API Routes

### Auth — `/api/auth`

#### POST /api/auth/register
Custom email + password registration.
```ts
// Body
{ email: string, password: string, name?: string }

// Response 201
{ user: UserPublic, accessToken: string, refreshToken: string }
```

#### POST /api/auth/login
```ts
// Body
{ email: string, password: string }

// Response 200
{ user: UserPublic, accessToken: string, refreshToken: string }
```

#### POST /api/auth/google
Verify Google ID token from frontend (after Google Sign-In SDK).
```ts
// Body
{ idToken: string }  // Google credential from google.accounts.id.initialize

// Response 200 (or 201 if new user)
{ user: UserPublic, accessToken: string, refreshToken: string, isNew: boolean }
```

Verification:
```ts
import { OAuth2Client } from 'google-auth-library'
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const ticket = await client.verifyIdToken({
  idToken,
  audience: process.env.GOOGLE_CLIENT_ID
})
const payload = ticket.getPayload()
// payload.sub = Google user ID
// payload.email, payload.name, payload.picture
```

#### POST /api/auth/apple
Verify Apple identity token from frontend.
```ts
// Body
{ identityToken: string, user?: { name?: { firstName?: string, lastName?: string } } }

// Response 200 or 201
{ user: UserPublic, accessToken: string, refreshToken: string, isNew: boolean }
```

Verification using `apple-signin-auth` package:
```ts
import appleSignin from 'apple-signin-auth'
const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
  audience: process.env.APPLE_CLIENT_ID,
  ignoreExpiration: false,
})
// appleIdTokenClaims.sub = Apple user ID
```

#### POST /api/auth/refresh
```ts
// Body
{ refreshToken: string }

// Response 200
{ accessToken: string, refreshToken: string }
```

#### POST /api/auth/logout
```ts
// Headers: Authorization: Bearer <accessToken>
// Body: { refreshToken: string }

// Response 200
{ success: true }
```
Deletes refresh token from DB.

#### GET /api/auth/me
```ts
// Headers: Authorization: Bearer <accessToken>

// Response 200
{ user: UserPublic }
```

```ts
// UserPublic type
type UserPublic = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  hasPassword: boolean
  googleId: string | null
  appleId: string | null
}
```

---

### Products — `/api/products`
All routes require `Authorization: Bearer <token>`.

#### GET /api/products
Returns all non-deleted products for the user.
```ts
// Response 200
{ products: Product[] }
```

#### POST /api/products/sync
Full sync — client sends its entire products array, server merges.
```ts
// Body
{ products: ProductInput[] }

// ProductInput
{
  clientId: string
  name: string
  storeId: string
  unit: string
  isCustom: boolean
  isReminder?: boolean
  isDeleted?: boolean
  updatedAt: string // ISO — for conflict resolution: latest wins
}

// Response 200
{ products: Product[] } // full merged list from server
```

Merge logic:
```
For each incoming product:
  - if exists by (userId, clientId): update if incoming.updatedAt > stored.updatedAt
  - if not exists: create
Return all non-deleted products for user
```

#### DELETE /api/products/:clientId
Soft delete (sets isDeleted: true).
```ts
// Response 200
{ success: true }
```

---

### Current Session — `/api/session`
All routes require auth.

#### GET /api/session
```ts
// Response 200
{ items: CheckedItem[] }
// CheckedItem: { productClientId: string, quantity: number }
```

#### PUT /api/session
Replace entire current session (called on every change — debounced 2s on frontend).
```ts
// Body
{ items: CheckedItem[] }

// Response 200
{ items: CheckedItem[] }
```

Note: "current session" is stored as a special ShoppingSession with clientId = "current".

---

### History — `/api/history`
All routes require auth.

#### GET /api/history
```ts
// Response 200
{ sessions: ShoppingSession[] }
// ordered by date desc, max 30
```

#### POST /api/history/sync
```ts
// Body
{ sessions: SessionInput[] }
// SessionInput: { clientId: string, date: string, items: CheckedItem[] }

// Response 200
{ sessions: ShoppingSession[] }
```

Merge: upsert by (userId, clientId). Keep max 30, drop oldest.

#### DELETE /api/history/:clientId
```ts
// Response 200
{ success: true }
```

#### DELETE /api/history
Clears all history for user.
```ts
// Response 200
{ success: true }
```

---

### Settings — `/api/settings`
All routes require auth.

#### GET /api/settings
```ts
// Response 200
{
  locale: string
  accentColor: string
  colorScheme: string
  sortMode: string
  activeStore: string
}
```

#### PATCH /api/settings
```ts
// Body (all fields optional)
{
  locale?: string
  accentColor?: string
  colorScheme?: string
  sortMode?: string
  activeStore?: string
}

// Response 200
{ settings: UserSettings }
```

---

## JWT Middleware (src/middleware/auth.ts)

```ts
import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

---

## Token generation (src/lib/jwt.ts)

```ts
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import prisma from './prisma'

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
  })
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

export async function rotateRefreshToken(oldToken: string): Promise<{ accessToken: string, refreshToken: string } | null> {
  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } })
  if (!stored || stored.expiresAt < new Date()) return null

  await prisma.refreshToken.delete({ where: { token: oldToken } })
  const accessToken = signAccessToken(stored.userId)
  const refreshToken = await createRefreshToken(stored.userId)
  return { accessToken, refreshToken }
}
```

---

## CORS config

```ts
import cors from 'cors'

app.use(cors({
  origin: [
    process.env.CLIENT_URL!,
    'http://localhost:5173', // Vite dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))
```

---

## Error handler (src/middleware/errorHandler.ts)

```ts
import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err)
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(status).json({ error: message })
}
```

---

## package.json dependencies

```json
{
  "dependencies": {
    "express": "^5.0.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "google-auth-library": "^9.0.0",
    "apple-signin-auth": "^1.7.0",
    "zod": "^3.22.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "uuid": "^9.0.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^7.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.0",
    "@types/uuid": "^9.0.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "ts-node": "^10.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

---

## railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run db:migrate && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

## Security

- `helmet()` — security headers
- `express-rate-limit` — 100 req/15min on auth routes, 300 req/15min on API
- All inputs validated with `zod`
- Refresh tokens stored in DB (can be revoked)
- Access tokens short-lived (15 min)
- Passwords hashed with bcrypt (rounds: 12)
- Soft delete for products (never lose data)

---

## Frontend integration (changes to sunny-shop Vue app)

### New composable: `composables/useApi.ts`

```ts
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useApi() {
  async function request(method: string, path: string, body?: any) {
    const token = localStorage.getItem('accessToken')
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401) {
      // Try refresh
      const refreshed = await tryRefresh()
      if (refreshed) return request(method, path, body)
      // Refresh failed — logout
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return null
    }

    return res.json()
  }

  async function tryRefresh() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return false
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false
      const data = await res.json()
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      return true
    } catch {
      return false
    }
  }

  return {
    get: (path: string) => request('GET', path),
    post: (path: string, body: any) => request('POST', path, body),
    put: (path: string, body: any) => request('PUT', path, body),
    patch: (path: string, body: any) => request('PATCH', path, body),
    delete: (path: string) => request('DELETE', path),
  }
}
```

### Sync strategy — debounced auto-sync

Every time user makes a change (check product, add product, finish session):
1. Save to localStorage immediately (existing behavior — offline first)
2. If logged in: debounce 2 seconds, then sync to backend

```ts
// In each Pinia store, after mutations:
import { useDebounceFn } from '@vueuse/core'

const syncToServer = useDebounceFn(async () => {
  if (!authStore.isLoggedIn) return
  await api.post('/api/products/sync', { products: this.products })
}, 2000)
```

On app startup if logged in:
1. Fetch from server
2. Merge with localStorage (server wins for conflicts, local custom products are preserved)
3. Apply merged state

### Add `.env` to Vue project

```env
VITE_API_URL=https://your-backend.railway.app
```

---

## Deployment steps (Railway)

1. Push backend to GitHub repo (separate from frontend)
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the backend repo
4. Add PostgreSQL plugin: + New → Database → PostgreSQL
5. Add env variables in Railway dashboard (all from .env.example)
6. Railway auto-deploys on every push to main
7. Copy the Railway URL → paste as `VITE_API_URL` in Vercel env vars

---

## Auth flow for Vue frontend

### Google Sign In

```ts
// In LoginView.vue — use Google Identity Services
// Load script: https://accounts.google.com/gsi/client

window.google.accounts.id.initialize({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  callback: async (response) => {
    const data = await api.post('/api/auth/google', {
      idToken: response.credential
    })
    authStore.setTokens(data.accessToken, data.refreshToken)
    authStore.setUser(data.user)
    router.push('/')
  }
})
window.google.accounts.id.renderButton(
  document.getElementById('google-btn'),
  { theme: 'outline', size: 'large', width: 280 }
)
```

### Apple Sign In

```ts
// Load script: https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js

AppleID.auth.init({
  clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
  scope: 'name email',
  redirectURI: window.location.origin,
  usePopup: true
})

document.addEventListener('AppleIDSignInOnSuccess', async (event: any) => {
  const data = await api.post('/api/auth/apple', {
    identityToken: event.detail.authorization.id_token,
    user: event.detail.user
  })
  authStore.setTokens(data.accessToken, data.refreshToken)
  authStore.setUser(data.user)
  router.push('/')
})
```

### `stores/auth.ts` (new Pinia store in Vue app)

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserPublic | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value)

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }

  function setUser(u: UserPublic) {
    user.value = u
  }

  function logout() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  return { user, isLoggedIn, accessToken, setTokens, setUser, logout }
})
```

---

## Summary — what gets synced per user

| Data | Endpoint | Strategy |
|------|----------|----------|
| Product catalog | POST /api/products/sync | Merge by clientId, latest updatedAt wins |
| Current session | PUT /api/session | Replace (debounced 2s) |
| History | POST /api/history/sync | Merge by clientId |
| Theme/locale/sort | PATCH /api/settings | Replace on change |

All data is per-user. User logs in on phone → sees same list as on tablet/web.
