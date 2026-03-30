<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()
const authStore = useAuthStore()
</script>

<template>
  <nav class="bottom-nav">
    <button
      class="nav-tab"
      :class="{ active: route.path === '/' }"
      @click="router.push('/')"
    >
      <span class="nav-icon">🛒</span>
      <span class="nav-label">{{ i18n.t('nav.list') }}</span>
    </button>
    <button
      class="nav-tab"
      :class="{ active: route.path === '/history' }"
      @click="router.push('/history')"
    >
      <span class="nav-icon">📋</span>
      <span class="nav-label">{{ i18n.t('nav.history') }}</span>
    </button>
    <button
      class="nav-tab"
      :class="{ active: route.path === '/login' }"
      @click="router.push('/login')"
    >
      <span class="nav-icon">{{ authStore.isLoggedIn ? '👤' : '🔑' }}</span>
      <span class="nav-label">{{ authStore.isLoggedIn ? (authStore.user?.name?.split(' ')[0] ?? 'Профіль') : 'Увійти' }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 64px;
  background: var(--card);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--muted);
  font-size: 11px;
  transition: color 150ms ease;
}

.nav-tab.active {
  color: var(--primary);
}

.nav-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-label {
  font-weight: 500;
}
</style>
