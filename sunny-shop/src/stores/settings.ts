import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useApi } from '@/composables/useApi'
import { useStorage } from '@/composables/useStorage'
import {
  themeAccentColor,
  themeColorScheme,
  setAccentColorGlobal,
  setColorSchemeGlobal,
} from '@/composables/useTheme'

export const useSettingsStore = defineStore('settings', () => {
  const api = useApi()
  const storage = useStorage()

  const sortMode = ref<'default' | 'alpha' | 'frequency'>(
    (storage.get<string>('sortMode') as 'default' | 'alpha' | 'frequency') ?? 'default'
  )
  const activeStore = ref<string>(storage.get<string>('activeStore') ?? 'zhanet')
  const onboardingCompleted = ref<boolean>(storage.get<boolean>('onboardingCompleted') ?? false)

  const syncToServer = useDebounceFn(async () => {
    const { useAuthStore } = await import('./auth')
    if (!useAuthStore().isLoggedIn) return
    const { useI18nStore } = await import('./i18n')
    const i18nStore = useI18nStore()

    try {
      await api.patch('/api/settings', {
        locale: i18nStore.locale,
        accentColor: themeAccentColor.value,
        colorScheme: themeColorScheme.value,
        sortMode: sortMode.value,
        activeStore: activeStore.value,
        onboardingCompleted: onboardingCompleted.value,
      })
    } catch {
      // offline — ignore
    }
  }, 2000)

  async function fetchFromServer() {
    try {
      const data = await api.get<{
        locale?: string
        accentColor?: string
        colorScheme?: string
        sortMode?: string
        activeStore?: string
        onboardingCompleted?: boolean
        storesConfig?: string | null
      }>('/api/settings')
      if (!data) return

      const { useI18nStore } = await import('./i18n')
      const i18nStore = useI18nStore()

      if (data.locale) i18nStore.setLocale(data.locale as 'uk' | 'ru')
      if (data.accentColor) setAccentColorGlobal(data.accentColor)
      if (data.colorScheme) setColorSchemeGlobal(data.colorScheme as 'light' | 'dark')
      if (data.sortMode) {
        sortMode.value = data.sortMode as 'default' | 'alpha' | 'frequency'
        storage.set('sortMode', data.sortMode)
      }
      if (data.activeStore) {
        activeStore.value = data.activeStore
        storage.set('activeStore', data.activeStore)
      }
      if (data.onboardingCompleted !== undefined) {
        onboardingCompleted.value = data.onboardingCompleted
        storage.set('onboardingCompleted', data.onboardingCompleted)
      }
    } catch {
      // offline — ignore
    }
  }

  function completeOnboarding() {
    onboardingCompleted.value = true
    storage.set('onboardingCompleted', true)
    syncToServer()
  }

  function resetToDefaults() {
    sortMode.value = 'default'
    activeStore.value = 'zhanet'
    onboardingCompleted.value = false
    storage.set('sortMode', 'default')
    storage.set('activeStore', 'zhanet')
    storage.set('onboardingCompleted', false)
  }

  return { sortMode, activeStore, onboardingCompleted, completeOnboarding, fetchFromServer, syncToServer, resetToDefaults }
})
