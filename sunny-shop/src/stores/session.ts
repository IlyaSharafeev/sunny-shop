import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useStorage } from '@/composables/useStorage'
import { useApi } from '@/composables/useApi'
import { useHistoryStore, type CheckedItem, type ShoppingSession } from './history'
import { useSyncStatus } from '@/composables/useSyncStatus'

const { setSyncing, setSynced, setError } = useSyncStatus()

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
      price: i.price ?? 0,
    }))

    setSyncing()
    try {
      await api.put('/api/session', { items }, true)
      setSynced()
    } catch {
      setError()
    }
  }, 2000)

  async function fetchFromServer() {
    try {
      const data = await api.get<{ items: { productClientId: string; quantity: number; price: number }[] }>('/api/session')
      if (!data) return
      checkedItems.value = data.items.map(i => ({ productId: i.productClientId, quantity: i.quantity, price: i.price ?? 0 }))
      persist()
    } catch {
      // offline — ignore
    }
  }

  function updatePrice(productId: string, price: number) {
    const item = checkedItems.value.find(i => i.productId === productId)
    if (item) {
      item.price = price >= 0 ? price : 0
      persist()
      syncToServer()
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

  const totalCost = computed(() =>
    checkedItems.value.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)
  )

  const getPrice = computed(() => (productId: string): number =>
    checkedItems.value.find(i => i.productId === productId)?.price ?? 0
  )

  return { checkedItems, toggle, updateQty, updatePrice, finishSession, clearCurrent, loadFromSession, fetchFromServer, isChecked, getQty, getPrice, checkedCount, totalCost }
})
