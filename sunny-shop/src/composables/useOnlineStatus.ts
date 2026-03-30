import { ref } from 'vue'

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

if (typeof window !== 'undefined') {
  window.addEventListener('online',  () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })
}

export function useOnlineStatus() {
  return { isOnline }
}
