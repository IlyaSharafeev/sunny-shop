const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

let _logged = false

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

async function request<T = any>(method: string, path: string, body?: any): Promise<T | null> {
  const token = localStorage.getItem('accessToken')
  if (!_logged) {
    console.log('[useApi] BASE_URL =', BASE_URL)
    _logged = true
  }
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
    if (refreshed) return request<T>(method, path, body)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return null
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export function useApi() {
  return {
    get: <T = any>(path: string) => request<T>('GET', path),
    post: <T = any>(path: string, body: any) => request<T>('POST', path, body),
    put: <T = any>(path: string, body: any) => request<T>('PUT', path, body),
    patch: <T = any>(path: string, body: any) => request<T>('PATCH', path, body),
    delete: <T = any>(path: string) => request<T>('DELETE', path),
  }
}
