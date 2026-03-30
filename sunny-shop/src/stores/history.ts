import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@/composables/useStorage'
import { useApi } from '@/composables/useApi'
import { useSyncStatus } from '@/composables/useSyncStatus'

const { setSyncing, setSynced, setError } = useSyncStatus()

export interface CheckedItem {
  productId: string
  quantity: number
  price?: number
}

export interface ShoppingSession {
  id: string
  date: string
  items: CheckedItem[]
}

const MAX_SESSIONS = 30

export const useHistoryStore = defineStore('history', () => {
  const storage = useStorage()
  const api = useApi()

  const sessions = ref<ShoppingSession[]>(storage.get<ShoppingSession[]>('history') ?? [])

  function persist() {
    storage.set('history', sessions.value)
  }

  async function syncToServer() {
    const { useAuthStore } = await import('./auth')
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return

    const payload = sessions.value.map(s => ({
      clientId: s.id,
      date: s.date,
      items: s.items.map(i => ({ productClientId: i.productId, quantity: i.quantity })),
    }))

    setSyncing()
    try {
      await api.post('/api/history/sync', { sessions: payload }, true)
      setSynced()
    } catch {
      setError()
    }
  }

  async function fetchFromServer() {
    try {
      const data = await api.get<{ sessions: any[] }>('/api/history')
      if (!data) return

      const localIds = new Set(sessions.value.map(s => s.id))
      for (const ss of data.sessions) {
        if (!localIds.has(ss.clientId)) {
          sessions.value.push({
            id: ss.clientId,
            date: ss.date,
            items: (ss.items ?? []).map((i: any) => ({ productId: i.productClientId, quantity: i.quantity })),
          })
        }
      }
      sessions.value.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      if (sessions.value.length > MAX_SESSIONS) sessions.value = sessions.value.slice(0, MAX_SESSIONS)
      persist()
    } catch {
      // offline — ignore
    }
  }

  function addSession(session: ShoppingSession) {
    sessions.value.unshift(session)
    if (sessions.value.length > MAX_SESSIONS) {
      sessions.value = sessions.value.slice(0, MAX_SESSIONS)
    }
    persist()
    syncToServer()
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter(s => s.id !== id)
    persist()
    api.delete(`/api/history/${encodeURIComponent(id)}`).catch(() => {})
  }

  function clearHistory() {
    sessions.value = []
    persist()
    api.delete('/api/history').catch(() => {})
  }

  const getFrequentProductIds = computed(() => (topN = 12): string[] => {
    if (sessions.value.length < 2) return []
    const counts = new Map<string, number>()
    for (const session of sessions.value) {
      for (const item of session.items) {
        counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([id]) => id)
  })

  const lastSession = computed((): ShoppingSession | null =>
    sessions.value.length > 0 ? (sessions.value[0] ?? null) : null
  )

  return { sessions, addSession, deleteSession, clearHistory, fetchFromServer, getFrequentProductIds, lastSession }
})
