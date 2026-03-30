import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any[] }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Push notification handler ──────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let data: { title?: string; body?: string; url?: string } = {}
  try {
    data = event.data.json()
  } catch {
    data = { body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Sunny Shop 🛒', {
      body: data.body ?? 'Не забудь про закупи!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'shopping-reminder',
      renotify: true,
      data: { url: data.url ?? '/shopping' },
    })
  )
})

// ── Notification click handler ─────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = (event.notification.data as any)?.url ?? '/shopping'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        const existing = clientList.find(c => c.url.startsWith(self.location.origin))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
