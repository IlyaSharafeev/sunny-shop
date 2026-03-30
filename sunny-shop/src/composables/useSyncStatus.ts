import { ref } from 'vue'

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error'

const status = ref<SyncState>('idle')
let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) { clearTimeout(timer); timer = null }
}

export function useSyncStatus() {
  function setSyncing() {
    clearTimer()
    status.value = 'syncing'
  }
  function setSynced() {
    clearTimer()
    status.value = 'synced'
    timer = setTimeout(() => { status.value = 'idle'; timer = null }, 2000)
  }
  function setError() {
    clearTimer()
    status.value = 'error'
    timer = setTimeout(() => { status.value = 'idle'; timer = null }, 4000)
  }
  return { status, setSyncing, setSynced, setError }
}
