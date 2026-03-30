import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { useToast } from './useToast'

const api = useApi()
const toast = useToast()

const isSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

const permission = ref<NotificationPermission>(
    isSupported ? Notification.permission : 'denied'
)
const isSubscribed = ref(false)
const isLoading = ref(false)

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const registration = await navigator.serviceWorker.ready
    return registration ?? null
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function checkSubscribed() {
  if (!isSupported) return
  const reg = await getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  isSubscribed.value = !!sub
}

async function subscribe() {
  if (!isSupported || isLoading.value) return
  isLoading.value = true

  try {
    const perm = await Notification.requestPermission()
    permission.value = perm
    if (perm !== 'granted') {
      toast.warning('Дозвіл на сповіщення не надано')
      return
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    if (!vapidKey) throw new Error('VITE_VAPID_PUBLIC_KEY not set')

    const reg = await getRegistration()
    if (!reg) throw new Error('No service worker')

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const json = sub.toJSON()
    await api.post('/api/push/subscribe', {
      endpoint: sub.endpoint,
      keys: {
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      },
    }, true)

    isSubscribed.value = true
    toast.success('Сповіщення увімкнено')
  } catch (e: any) {
    toast.error('Не вдалося підписатись на сповіщення')
    console.error('Push subscribe error:', e)
  } finally {
    isLoading.value = false
  }
}

async function unsubscribe() {
  if (!isSupported || isLoading.value) return
  isLoading.value = true

  try {
    const reg = await getRegistration()
    if (reg) {
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
    }

    await api.delete('/api/push/unsubscribe')
    isSubscribed.value = false
    toast.success('Сповіщення вимкнено')
  } catch {
    toast.error('Помилка при відписці')
  } finally {
    isLoading.value = false
  }
}

async function sendTest() {
  try {
    await api.post('/api/push/test', {}, true)
    toast.info('Тестове сповіщення відправлено')
  } catch {
    toast.error('Не вдалося відправити тест')
  }
}

export function usePushNotifications() {
  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    checkSubscribed,
    subscribe,
    unsubscribe,
    sendTest,
  }
}