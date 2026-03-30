import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

export interface UserPublic {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  hasPassword: boolean
  googleId: string | null
  appleId: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const api = useApi()

  const user = ref<UserPublic | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const loading = ref(false)

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

  async function init() {
    if (!accessToken.value) return
    try {
      const data = await api.get<{ user: UserPublic }>('/api/auth/me')
      if (data) user.value = data.user
      else logout()
    } catch {
      logout()
    }
  }

  async function register(email: string, password: string, name?: string) {
    loading.value = true
    try {
      const data = await api.post<{ user: UserPublic; accessToken: string; refreshToken: string }>(
        '/api/auth/register',
        { email, password, name }
      )
      if (!data) throw new Error('Registration failed')
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return data
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const data = await api.post<{ user: UserPublic; accessToken: string; refreshToken: string }>(
        '/api/auth/login',
        { email, password }
      )
      if (!data) throw new Error('Login failed')
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return data
    } finally {
      loading.value = false
    }
  }

  async function loginWithGoogle(idToken: string) {
    loading.value = true
    try {
      const data = await api.post<{ user: UserPublic; accessToken: string; refreshToken: string; isNew: boolean }>(
        '/api/auth/google',
        { idToken }
      )
      if (!data) throw new Error('Google login failed')
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return data
    } finally {
      loading.value = false
    }
  }

  async function loginWithApple(identityToken: string, appleUser?: { name?: { firstName?: string; lastName?: string } }) {
    loading.value = true
    try {
      const data = await api.post<{ user: UserPublic; accessToken: string; refreshToken: string; isNew: boolean }>(
        '/api/auth/apple',
        { identityToken, user: appleUser }
      )
      if (!data) throw new Error('Apple login failed')
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return data
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    // Clear all store state before invalidating tokens
    const { useProductsStore } = await import('./products')
    const { useSessionStore } = await import('./session')
    const { useHistoryStore } = await import('./history')
    const { useSettingsStore } = await import('./settings')
    useProductsStore().resetToSeed()
    useSessionStore().clearCurrent()
    useHistoryStore().clearHistory()
    useSettingsStore().resetToDefaults()

    const rt = refreshToken.value
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    if (rt) {
      try {
        await api.post('/api/auth/logout', { refreshToken: rt })
      } catch {
        // ignore
      }
    }
  }

  return {
    user,
    isLoggedIn,
    loading,
    accessToken,
    setTokens,
    setUser,
    init,
    register,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
  }
})
