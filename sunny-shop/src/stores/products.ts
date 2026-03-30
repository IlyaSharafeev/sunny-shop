import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useStorage } from '@/composables/useStorage'
import { useApi } from '@/composables/useApi'

export type StoreId = 'zhanet' | 'lidl' | 'mladost' | 'sklad' | 'any'
export type Unit = 'кг' | 'л' | 'шт' | 'г' | 'пач' | 'бан' | '—'

export interface Store {
  id: StoreId
  name: string
  color: string
  emoji?: string
}

export interface Product {
  id: string
  name: string
  storeId: StoreId
  unit: Unit
  isCustom: boolean
  isReminder?: boolean
}

export const STORES: Store[] = [
  { id: 'zhanet',  name: 'Жанет',         color: '#e91e63', emoji: '🌸' },
  { id: 'lidl',    name: 'Лідл',          color: '#1565c0', emoji: '🔵' },
  { id: 'mladost', name: 'Младост',       color: '#2e7d32', emoji: '🌿' },
  { id: 'sklad',   name: 'Склад Младост', color: '#6d4c41', emoji: '📦' },
  { id: 'any',     name: 'Будь-який',     color: '#757575', emoji: '🏪' },
]

const SEED_PRODUCTS: Product[] = [
  // Жанет
  { id: 'zh-01', name: "М'ясо фарш",          storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-02', name: 'Куряча грудка',        storeId: 'zhanet', unit: 'шт', isCustom: false },
  { id: 'zh-03', name: "М'ясо шматок",         storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-04', name: 'Крила курячі',         storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-05', name: 'Ковбаса паличка',      storeId: 'zhanet', unit: 'шт', isCustom: false },
  { id: 'zh-06', name: 'Крабові палички',      storeId: 'zhanet', unit: 'пач', isCustom: false },
  { id: 'zh-07', name: 'Сир',                  storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-08', name: 'Плавлені сирки',       storeId: 'zhanet', unit: 'шт', isCustom: false },
  { id: 'zh-09', name: 'Яйця',                 storeId: 'zhanet', unit: 'шт', isCustom: false },
  { id: 'zh-10', name: 'Творог',               storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-11', name: 'Булочка',              storeId: 'zhanet', unit: 'шт', isCustom: false },
  { id: 'zh-12', name: 'Кебаб',               storeId: 'zhanet', unit: 'шт', isCustom: false },
  { id: 'zh-13', name: 'Помідори',             storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-14', name: 'Огірки',               storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-15', name: 'Перець болгарський',   storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-16', name: 'Мариновані огірки',    storeId: 'zhanet', unit: 'бан', isCustom: false },
  { id: 'zh-17', name: 'Зелень',               storeId: 'zhanet', unit: 'пач', isCustom: false },
  { id: 'zh-18', name: 'Гриби',                storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-19', name: 'Буряк',                storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-20', name: 'Морква',               storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-21', name: 'Цибуля',               storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-22', name: 'Картопля',             storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-23', name: 'Яблука',               storeId: 'zhanet', unit: 'кг',  isCustom: false },
  { id: 'zh-24', name: 'Швепс / Напої',        storeId: 'zhanet', unit: 'л',   isCustom: false },
  { id: 'zh-25', name: 'Алкоголь',             storeId: 'zhanet', unit: 'шт', isCustom: false },
  // Лідл
  { id: 'li-01', name: 'Хліб',                 storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-02', name: 'Молоко',               storeId: 'lidl', unit: 'л',   isCustom: false },
  { id: 'li-03', name: 'Масло вершкове',       storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-04', name: 'Пончики',              storeId: 'lidl', unit: 'пач', isCustom: false },
  { id: 'li-05', name: 'Макарони',             storeId: 'lidl', unit: 'пач', isCustom: false },
  { id: 'li-06', name: 'Рис',                  storeId: 'lidl', unit: 'кг',  isCustom: false },
  { id: 'li-07', name: 'Борошно',              storeId: 'lidl', unit: 'кг',  isCustom: false },
  { id: 'li-08', name: 'Цукор',                storeId: 'lidl', unit: 'кг',  isCustom: false },
  { id: 'li-09', name: 'Сіль',                 storeId: 'lidl', unit: 'пач', isCustom: false },
  { id: 'li-10', name: 'Олія соняшникова',     storeId: 'lidl', unit: 'л',   isCustom: false },
  { id: 'li-11', name: 'Майонез',              storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-12', name: 'Соус',                 storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-13', name: 'Тунець',               storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-14', name: 'Лаваш',                storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-15', name: 'Хлопья / Мюслі',      storeId: 'lidl', unit: 'пач', isCustom: false },
  { id: 'li-16', name: 'Чіпси',                storeId: 'lidl', unit: 'пач', isCustom: false },
  { id: 'li-17', name: 'Акційна полка ⭐',     storeId: 'lidl', unit: '—',   isCustom: false, isReminder: true },
  // Младост
  { id: 'ml-01', name: 'Апельсини',            storeId: 'mladost', unit: 'кг',  isCustom: false },
  { id: 'ml-02', name: 'Банани',               storeId: 'mladost', unit: 'кг',  isCustom: false },
  { id: 'ml-03', name: 'Норі',                 storeId: 'mladost', unit: 'пач', isCustom: false },
  { id: 'ml-04', name: 'Крючки (снеки)',       storeId: 'mladost', unit: 'пач', isCustom: false },
  { id: 'ml-05', name: 'Желейні цукерки',      storeId: 'mladost', unit: 'пач', isCustom: false },
  { id: 'ml-06', name: 'Чай',                  storeId: 'mladost', unit: 'пач', isCustom: false },
  { id: 'ml-07', name: 'Мед',                  storeId: 'mladost', unit: 'шт',  isCustom: false },
  { id: 'ml-08', name: 'Соус ягідний',         storeId: 'mladost', unit: 'шт',  isCustom: false },
  // Будь-який
  { id: 'an-01', name: 'Дезодоранти',          storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-02', name: 'Презервативи',         storeId: 'any', unit: 'пач', isCustom: false },
  { id: 'an-03', name: 'Краплі для очей',      storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-04', name: 'Гель для інтиму',      storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-05', name: 'Серветки столові',     storeId: 'any', unit: 'пач', isCustom: false },
  { id: 'an-06', name: 'Кісточки для унітазу', storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-07', name: 'Полички для ванни',    storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-08', name: 'Кружка',               storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-09', name: 'Філадельфія',          storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-10', name: 'Жуйки Теніс',          storeId: 'any', unit: 'пач', isCustom: false },
  { id: 'an-11', name: 'Шоколад',              storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-12', name: 'Сухарики',             storeId: 'any', unit: 'пач', isCustom: false },
  { id: 'an-13', name: 'Печиво',               storeId: 'any', unit: 'пач', isCustom: false },
  // Жанет — додаткові
  { id: 'zh-26', name: 'Сметана',              storeId: 'zhanet', unit: 'л',   isCustom: false },
  { id: 'zh-27', name: 'Кефір',                storeId: 'zhanet', unit: 'л',   isCustom: false },
  { id: 'zh-28', name: 'Масло вершкове',       storeId: 'zhanet', unit: 'шт',  isCustom: false },
  { id: 'zh-29', name: 'Оселедець',            storeId: 'zhanet', unit: 'шт',  isCustom: false },
  { id: 'zh-30', name: 'Часник',               storeId: 'zhanet', unit: 'шт',  isCustom: false },
  // Лідл — додаткові
  { id: 'li-18', name: 'Кетчуп',               storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-19', name: 'Гірчиця',              storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-20', name: 'Оцет',                 storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-21', name: 'Консерви (боби)',       storeId: 'lidl', unit: 'шт',  isCustom: false },
  { id: 'li-22', name: 'Вівсянка',             storeId: 'lidl', unit: 'пач', isCustom: false },
  // Младост — додаткові
  { id: 'ml-09', name: 'Виноград',             storeId: 'mladost', unit: 'кг',  isCustom: false },
  { id: 'ml-10', name: 'Лимон',                storeId: 'mladost', unit: 'шт',  isCustom: false },
  { id: 'ml-11', name: 'Груші',                storeId: 'mladost', unit: 'кг',  isCustom: false },
  // Будь-який — додаткові
  { id: 'an-14', name: 'Туалетний папір',      storeId: 'any', unit: 'пач', isCustom: false },
  { id: 'an-15', name: 'Мило',                 storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-16', name: 'Шампунь',              storeId: 'any', unit: 'шт',  isCustom: false },
  { id: 'an-17', name: 'Зубна паста',          storeId: 'any', unit: 'шт',  isCustom: false },
]

export const useProductsStore = defineStore('products', () => {
  const storage = useStorage()
  const api = useApi()

  function getInitialProducts(): Product[] {
    const stored = storage.get<Product[]>('products')
    if (stored) {
      const existingIds = new Set(stored.map(p => p.id))
      const newSeed = SEED_PRODUCTS.filter(p => !existingIds.has(p.id))
      if (newSeed.length > 0) {
        const merged = [...stored, ...newSeed]
        storage.set('products', merged)
        return merged
      }
      return stored
    }
    return [...SEED_PRODUCTS]
  }

  const products = ref<Product[]>(getInitialProducts())

  // Track updatedAt per product for server-side conflict resolution
  const updatedAtMap = ref<Record<string, string>>(
    storage.get<Record<string, string>>('products_updatedAt') ?? {}
  )

  function persist() {
    storage.set('products', products.value)
    storage.set('products_updatedAt', updatedAtMap.value)
  }

  function touchProduct(id: string) {
    updatedAtMap.value[id] = new Date().toISOString()
  }

  // Sync to server (debounced 2s)
  const syncToServer = useDebounceFn(async () => {
    const { useAuthStore } = await import('./auth')
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return

    const payload = products.value.map(p => ({
      clientId: p.id,
      name: p.name,
      storeId: p.storeId,
      unit: p.unit,
      isCustom: p.isCustom,
      isReminder: p.isReminder ?? false,
      isDeleted: false,
      updatedAt: updatedAtMap.value[p.id] ?? new Date(0).toISOString(),
    }))

    try {
      const data = await api.post<{ products: any[] }>('/api/products/sync', { products: payload })
      if (data) {
        // Merge server products back (server is source of truth for non-custom)
        const serverIds = new Set(data.products.map((p: any) => p.clientId))
        // Add any server products not locally known
        for (const sp of data.products) {
          if (!products.value.find(p => p.id === sp.clientId)) {
            products.value.push({
              id: sp.clientId,
              name: sp.name,
              storeId: sp.storeId as StoreId,
              unit: sp.unit as Unit,
              isCustom: sp.isCustom,
              isReminder: sp.isReminder,
            })
          }
        }
        // Remove products that server deleted and aren't custom local
        products.value = products.value.filter(p => p.isCustom || serverIds.has(p.id))
        persist()
      }
    } catch {
      // offline — ignore
    }
  }, 2000)

  // Fetch from server on login and merge
  async function fetchFromServer() {
    try {
      const data = await api.get<{ products: any[] }>('/api/products')
      if (!data) return

      const now = new Date().toISOString()
      for (const sp of data.products) {
        const local = products.value.find(p => p.id === sp.clientId)
        if (!local) {
          products.value.push({
            id: sp.clientId,
            name: sp.name,
            storeId: sp.storeId as StoreId,
            unit: sp.unit as Unit,
            isCustom: sp.isCustom,
            isReminder: sp.isReminder,
          })
          updatedAtMap.value[sp.clientId] = now
        }
      }
      persist()
    } catch {
      // offline — ignore
    }
  }

  function addCustomProduct(name: string, storeId: StoreId, unit: Unit) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    products.value.push({ id, name, storeId, unit, isCustom: true })
    touchProduct(id)
    persist()
    syncToServer()
  }

  function deleteProduct(id: string) {
    const idx = products.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      products.value.splice(idx, 1)
      persist()
      // Fire-and-forget soft delete on server
      api.delete(`/api/products/${encodeURIComponent(id)}`).catch(() => {})
    }
  }

  function resetToSeed() {
    products.value = [...SEED_PRODUCTS]
    updatedAtMap.value = {}
    persist()
  }

  const productsByStore = computed((): Map<StoreId, Product[]> => {
    const map = new Map<StoreId, Product[]>()
    for (const store of STORES) {
      map.set(store.id, products.value.filter(p => p.storeId === store.id))
    }
    return map
  })

  return { products, addCustomProduct, deleteProduct, resetToSeed, productsByStore, fetchFromServer, syncToServer }
})
