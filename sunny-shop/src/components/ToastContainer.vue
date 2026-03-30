<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const toast = useToast()
const icons: Record<string, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toast.items"
        :key="t.id"
        :class="['toast', `toast--${t.type}`]"
        role="alert"
        @click="toast.remove(t.id)"
      >
        <span class="toast-icon">{{ icons[t.type] }}</span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  min-width: 240px;
  max-width: 360px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  cursor: pointer;
  pointer-events: auto;
  color: #fff;
  word-break: break-word;
}

.toast--success { background: #2e7d32; }
.toast--error   { background: #c62828; }
.toast--warning { background: #e65100; }
.toast--info    { background: #1565c0; }

.toast-icon { font-size: 16px; flex-shrink: 0; font-weight: 700; }
.toast-msg  { flex: 1; line-height: 1.4; }

.toast-enter-active { transition: all 250ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: all 200ms ease; }
.toast-enter-from   { opacity: 0; transform: translateX(60px); }
.toast-leave-to     { opacity: 0; transform: translateX(60px); }
.toast-move         { transition: transform 250ms ease; }
</style>
