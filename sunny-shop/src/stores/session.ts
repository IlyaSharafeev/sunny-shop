import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useStorage } from '@/composables/useStorage'
import { useApi } from '@/composables/useApi'
import { useHistoryStore, type CheckedItem, type ShoppingSession } from './history'

export const useSessionStore = defineStore('session', () => {
  const storage = useStorage()
  const api = useApi()

  const checkedItems = ref<CheckedItem[]>(storage.get<CheckedItem[]>('session') ?? [])

  function persist() {
    storage.set('session', checkedItems.value)
  }

  const syncToServer = useDebounceFn(async () => {
    const { useAuthStore } = await import('./auth')
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return

    const items = checkedItems.value.map(i => ({
      productClientId: i.productId,
      quantity: i.quantity,
    }))

    try {
      await api.put('/api/session', { items })
    } catch {
      // offline — ignore
    }
  }, 2000)

  async function fetchFromServer() {
    try {
      const data = await api.get<{ items: { productClientId: string; quantity: number }[] }>('/api/session')
      if (!data) return
      checkedItems.value = data.items.map(i => ({ productId: i.productClientId, quantity: i.quantity }))
      persist()
    } catch {
      // offline — ignore
    }
  }

  function toggle(productId: string) {
    const idx = checkedItems.value.findIndex(i => i.productId === productId)
    if (idx === -1) {
      checkedItems.value.push({ productId, quantity: 1 })
    } else {
      checkedItems.value.splice(idx, 1)
    }
    persist()
    syncToServer()
  }

  function updateQty(productId: string, quantity: number) {
    const idx = checkedItems.value.findIndex(i => i.productId === productId)
    if (quantity <= 0) {
      if (idx !== -1) checkedItems.value.splice(idx, 1)
    } else {
      if (idx !== -1) { const item = checkedItems.value[idx]; if (item) item.quantity = quantity }
      else checkedItems.value.push({ productId, quantity })
    }
    persist()
    syncToServer()
  }

  function finishSession() {
    const historyStore = useHistoryStore()
    const session: ShoppingSession = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString(),
      items: [...checkedItems.value.map(i => ({ ...i }))],
    }
    historyStore.addSession(session)
    checkedItems.value = []
    persist()
    syncToServer()
  }

  function clearCurrent() {
    checkedItems.value = []
    persist()
    syncToServer()
  }

  function loadFromSession(items: CheckedItem[]) {
    checkedItems.value = items.map(item => ({ ...item }))
    persist()
    syncToServer()
  }

  const isChecked = computed(() => (productId: string): boolean => {
    return checkedItems.value.some(i => i.productId === productId)
  })

  const getQty = computed(() => (productId: string): number => {
    return checkedItems.value.find(i => i.productId === productId)?.quantity ?? 1
  })

  const checkedCount = computed(() => checkedItems.value.length)

  return { checkedItems, toggle, updateQty, finishSession, clearCurrent, loadFromSession, fetchFromServer, isChecked, getQty, checkedCount }
})
