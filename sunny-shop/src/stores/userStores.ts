import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@/composables/useStorage'

export interface UserStore {
  id: string
  name: string
  color: string
  emoji: string
  visible: boolean
  position: number
  isDefault: boolean
}

const DEFAULT_STORES: UserStore[] = [
  { id: 'zhanet',  name: 'Жанет',         color: '#e91e63', emoji: '🌸', visible: true, position: 0, isDefault: true },
  { id: 'lidl',    name: 'Лідл',          color: '#1565c0', emoji: '🔵', visible: true, position: 1, isDefault: true },
  { id: 'mladost', name: 'Младост',       color: '#2e7d32', emoji: '🌿', visible: true, position: 2, isDefault: true },
  { id: 'sklad',   name: 'Склад Младост', color: '#6d4c41', emoji: '📦', visible: true, position: 3, isDefault: true },
  { id: 'any',     name: 'Будь-який',     color: '#757575', emoji: '🏪', visible: true, position: 4, isDefault: true },
]

export const PRESET_COLORS = [
  '#e91e63', '#f44336', '#ff9800', '#ffc107',
  '#4caf50', '#2e7d32', '#1565c0', '#9c27b0',
  '#00bcd4', '#607d8b', '#6d4c41', '#757575',
]

export const EMOJI_OPTIONS = [
  '🏪', '🛒', '🌸', '🌿', '📦', '🏬', '🌊', '🍎',
  '🥩', '🧴', '💊', '🍕', '🧺', '🏷️', '⭐', '🌻',
]

export const useStoresStore = defineStore('userStores', () => {
  const storage = useStorage()

  function getInitial(): UserStore[] {
    const saved = storage.get<UserStore[]>('userStores')
    if (!saved) return DEFAULT_STORES.map(d => ({ ...d }))
    // Merge: add any new default stores not yet in saved list
    const ids = new Set(saved.map(s => s.id))
    const maxPos = saved.reduce((m, s) => Math.max(m, s.position), -1)
    const newDefaults = DEFAULT_STORES
      .filter(d => !ids.has(d.id))
      .map((d, i) => ({ ...d, position: maxPos + 1 + i }))
    return [...saved, ...newDefaults]
  }

  const stores = ref<UserStore[]>(getInitial())

  const visibleStores = computed(() =>
    [...stores.value].filter(s => s.visible).sort((a, b) => a.position - b.position)
  )

  const allSorted = computed(() =>
    [...stores.value].sort((a, b) => a.position - b.position)
  )

  function persist() {
    storage.set('userStores', stores.value)
  }

  function toggleVisibility(id: string) {
    const s = stores.value.find(s => s.id === id)
    if (s) { s.visible = !s.visible; persist() }
  }

  function rename(id: string, name: string) {
    const s = stores.value.find(s => s.id === id)
    if (s && name.trim()) { s.name = name.trim(); persist() }
  }

  function updateColor(id: string, color: string) {
    const s = stores.value.find(s => s.id === id)
    if (s) { s.color = color; persist() }
  }

  function updateEmoji(id: string, emoji: string) {
    const s = stores.value.find(s => s.id === id)
    if (s) { s.emoji = emoji; persist() }
  }

  function deleteStore(id: string) {
    const idx = stores.value.findIndex(s => s.id === id && !s.isDefault)
    if (idx !== -1) { stores.value.splice(idx, 1); persist() }
  }

  function addStore(name: string, color: string, emoji: string): string {
    const id = `custom-${Date.now()}`
    const maxPos = stores.value.reduce((m, s) => Math.max(m, s.position), -1)
    stores.value.push({
      id,
      name: name.trim(),
      color,
      emoji,
      visible: true,
      position: maxPos + 1,
      isDefault: false,
    })
    persist()
    return id
  }

  function reorder(newOrder: string[]) {
    newOrder.forEach((id, idx) => {
      const s = stores.value.find(s => s.id === id)
      if (s) s.position = idx
    })
    persist()
  }

  function getById(id: string): UserStore | undefined {
    return stores.value.find(s => s.id === id)
  }

  return {
    stores,
    visibleStores,
    allSorted,
    toggleVisibility,
    rename,
    updateColor,
    updateEmoji,
    deleteStore,
    addStore,
    reorder,
    getById,
  }
})
