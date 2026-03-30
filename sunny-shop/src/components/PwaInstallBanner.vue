<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()
const showBanner = ref(false)
let deferredPrompt: any = null

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    const dismissed = localStorage.getItem('pwa-dismissed')
    if (!dismissed) {
      setTimeout(() => { showBanner.value = true }, 3000)
    }
  })
})

async function install() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    if ('vibrate' in navigator) navigator.vibrate([10, 30, 10])
  }
  showBanner.value = false
  deferredPrompt = null
}

function dismiss() {
  showBanner.value = false
  localStorage.setItem('pwa-dismissed', '1')
}
</script>

<template>
  <Transition name="slide-up">
    <div v-if="showBanner" class="pwa-banner">
      <span>📲 {{ i18n.t('pwa.install') }}</span>
      <div class="pwa-actions">
        <button class="pwa-install-btn" @click="install">{{ i18n.t('pwa.installBtn') }}</button>
        <button class="pwa-dismiss-btn" @click="dismiss">✕</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-banner {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 448px;
  background: var(--card);
  border: 1.5px solid var(--primary);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.pwa-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pwa-install-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  min-height: 36px;
}

.pwa-dismiss-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  min-height: 36px;
  min-width: 36px;
}

.slide-up-enter-active {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease;
}
.slide-up-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}
.slide-up-enter-from {
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
}
</style>
