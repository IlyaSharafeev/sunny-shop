import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@/composables/useStorage'

export interface CheckedItem {
  productId: string
  quantity: number
}

export interface ShoppingSession {
  id: string
  date: string
  items: CheckedItem[]
}

const MAX_SESSIONS = 30

export const useHistoryStore = defineStore('history', () => {
  const storage = useStorage()

  const sessions = ref<ShoppingSession[]>(storage.get<ShoppingSession[]>('history') ?? [])

  function persist() {
    storage.set('history', sessions.value)
  }

  function addSession(session: ShoppingSession) {
    sessions.value.unshift(session)
    if (sessions.value.length > MAX_SESSIONS) {
      sessions.value = sessions.value.slice(0, MAX_SESSIONS)
    }
    persist()
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter(s => s.id !== id)
    persist()
  }

  function clearHistory() {
    sessions.value = []
    persist()
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

  return { sessions, addSession, deleteSession, clearHistory, getFrequentProductIds, lastSession }
})
