<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import { useI18nStore } from '@/stores/i18n'
import HistoryCard from '@/components/HistoryCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()
const historyStore = useHistoryStore()
const i18n = useI18nStore()

const showClearConfirm = ref(false)
const expandedId = ref<string | null>(null)

const sessions = computed(() => historyStore.sessions)

onMounted(() => {
  if (historyStore.sessions.length > 0) {
    const last = [...historyStore.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]
    if (last) expandedId.value = last.id
  }
})

function handleClearHistory() {
  showClearConfirm.value = false
  historyStore.clearHistory()
}
</script>

<template>
  <div class="history-view">
    <header class="top-header">
      <button class="back-btn" @click="router.push('/')">
        ‹
      </button>
      <span class="title">{{ i18n.t('history.title') }}</span>
      <span class="spacer" />
    </header>

    <main class="content">
      <template v-if="sessions.length === 0">
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="20" width="40" height="36" rx="4" stroke="#9e9e9e" stroke-width="2.5" fill="none"/>
            <path d="M22 20V16a10 10 0 0 1 20 0v4" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M24 36h16M24 43h10" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <p class="empty-text">{{ i18n.t('history.empty') }}</p>
        </div>
      </template>

      <template v-else>
        <HistoryCard
          v-for="session in sessions"
          :key="session.id"
          :session="session"
          :initial-expanded="expandedId === session.id"
        />
      </template>
    </main>

    <div class="bottom-actions">
      <button class="btn-new" @click="router.push('/')">
        {{ i18n.t('history.newSession') }}
      </button>
      <button class="btn-danger" @click="showClearConfirm = true">
        {{ i18n.t('history.clearHistory') }}
      </button>
    </div>

    <ConfirmDialog
      :visible="showClearConfirm"
      :message="i18n.t('history.clearConfirm')"
      @confirm="handleClearHistory"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<style scoped>
.history-view {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.top-header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 60px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 8px 0 4px;
  z-index: 20;
  gap: 4px;
}

.back-btn {
  width: 44px;
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--text);
  line-height: 1;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.spacer {
  flex: 1;
}

.content {
  margin-top: 60px;
  padding: 12px;
  padding-bottom: calc(140px + env(safe-area-inset-bottom));
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  gap: 16px;
}

.empty-icon {
  width: 80px;
  height: 80px;
}

.empty-text {
  font-size: 16px;
  color: var(--muted);
  text-align: center;
}

.bottom-actions {
  position: fixed;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  background: var(--card);
  border-top: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}

.btn-new {
  min-height: 44px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
}

.btn-danger {
  min-height: 44px;
  color: var(--danger);
  font-size: 14px;
  font-weight: 500;
}
</style>
