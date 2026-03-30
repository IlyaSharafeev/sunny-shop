import { useToast } from './useToast'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

async function tryRefresh(): Promise<boolean> {
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

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  silent = false,
): Promise<T | null> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(method, path, body, silent)

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    // Redirect to login and notify
    const toast = useToast()
    toast.warning('Сесія закінчилась, увійдіть знову')
    // Use dynamic import to avoid circular deps
    import('@/router').then(({ default: router }) => router.push('/login'))
    return null
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message = err.error || `HTTP ${res.status}`
    if (!silent) {
      const toast = useToast()
      toast.error(message)
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export function useApi() {
  return {
    get:    <T = any>(path: string, silent?: boolean)              => request<T>('GET',    path, undefined, silent),
    post:   <T = any>(path: string, body: any, silent?: boolean)   => request<T>('POST',   path, body,      silent),
    put:    <T = any>(path: string, body: any, silent?: boolean)   => request<T>('PUT',    path, body,      silent),
    patch:  <T = any>(path: string, body: any, silent?: boolean)   => request<T>('PATCH',  path, body,      silent),
    delete: <T = any>(path: string, silent?: boolean)              => request<T>('DELETE', path, undefined, silent),
  }
}
