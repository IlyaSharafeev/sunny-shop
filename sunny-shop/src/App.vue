<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'
import { useProductsStore } from '@/stores/products'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useTheme } from '@/composables/useTheme'
import BottomNav from '@/components/BottomNav.vue'
import PwaInstallBanner from '@/components/PwaInstallBanner.vue'

const sessionStore = useSessionStore()
const historyStore = useHistoryStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
useTheme() // load saved theme before first render

onMounted(async () => {
  // Try to restore auth session
  await authStore.init()

  // If logged in, sync data from server
  if (authStore.isLoggedIn) {
    await Promise.all([
      productsStore.fetchFromServer(),
      sessionStore.fetchFromServer(),
      historyStore.fetchFromServer(),
      settingsStore.fetchFromServer(),
    ])
  }

  // Pre-check frequent items if session is empty
  if (sessionStore.checkedCount === 0) {
    const frequent = historyStore.getFrequentProductIds(12)
    if (frequent.length > 0) {
      frequent.forEach(id => sessionStore.toggle(id))
    }
  }
})
</script>

<template>
  <div class="app-wrapper">
    <RouterView v-slot="{ Component, route }">
      <Transition name="slide">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
    <BottomNav />
    <PwaInstallBanner />
  </div>
</template>

<style scoped>
.app-wrapper {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--bg);
  position: relative;
  overflow-x: hidden;
}
</style>
