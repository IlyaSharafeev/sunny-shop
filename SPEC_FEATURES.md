# Sunny Shop — Features Update

This file extends SPEC.md and SPEC_UX.md. Read both first, then apply everything here.

---

## New Dependencies

```bash
npm install canvas-confetti html2canvas
npm install -D vite-plugin-pwa
```

---

## Feature 1: Confetti on Session Finish

### What
When user taps "Завершити ✓" — full-screen confetti explosion before navigating to history.

### Implementation

Install: `canvas-confetti` (already in deps above)

In `HomeView.vue`, replace the finish handler:

```ts
import confetti from 'canvas-confetti'

async function handleFinish() {
  // 1. Trigger confetti
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.7 },
    colors: ['#4CAF50', '#FF9800', '#e91e63', '#1565c0', '#2e7d32', '#fff'],
    disableForReducedMotion: true
  })

  // Second burst after 200ms for double pop effect
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.6 },
      startVelocity: 20,
      colors: ['#4CAF50', '#FF9800', '#ffffff'],
      disableForReducedMotion: true
    })
  }, 200)

  // 2. Haptic
  if ('vibrate' in navigator) navigator.vibrate([30, 50, 30, 50, 60])

  // 3. Wait a beat then finish
  await new Promise(resolve => setTimeout(resolve, 600))

  // 4. Save session and navigate
  sessionStore.finishSession()
  router.push('/history')
}
```

TypeScript declaration (if needed):
```ts
// src/env.d.ts — add:
declare module 'canvas-confetti'
```

---

## Feature 2: Repeat Last Purchase

### What
In HistoryView, each session card has a "🔁 Повторити" button that loads that session's items into the current checklist with one tap.

### Implementation

In `stores/session.ts` — add action:
```ts
loadFromSession(items: CheckedItem[]) {
  this.checkedItems = items.map(item => ({ ...item }))
}
```

In `stores/history.ts` — add getter:
```ts
get lastSession(): ShoppingSession | null {
  return this.sessions.length > 0 ? this.sessions[this.sessions.length - 1] : null
}
```

In `HistoryCard.vue` — add repeat button:
```vue
<button class="repeat-btn" @click="handleRepeat">
  🔁 {{ t('history.repeat') }}
</button>
```

```ts
function handleRepeat() {
  sessionStore.loadFromSession(props.session.items)
  if ('vibrate' in navigator) navigator.vibrate([10, 40, 10])
  router.push('/')
}
```

Button style:
```css
.repeat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 12px;
  width: 100%;
  justify-content: center;
}
.repeat-btn:active {
  background: rgba(76, 175, 80, 0.08);
  transform: scale(0.97);
}
```

Also add a "🔁 Повторити останній" shortcut button in HomeView bottom bar when checkedItems is empty and history exists:
```vue
<button
  v-if="sessionStore.checkedCount === 0 && historyStore.lastSession"
  class="repeat-last-btn"
  @click="repeatLast"
>
  🔁 {{ t('home.repeatLast') }}
</button>
```

```ts
function repeatLast() {
  if (historyStore.lastSession) {
    sessionStore.loadFromSession(historyStore.lastSession.items)
    if ('vibrate' in navigator) navigator.vibrate([10, 40, 10])
  }
}
```

Add i18n keys:
- `history.repeat` → uk: "Повторити", ru: "Повторить"
- `home.repeatLast` → uk: "Повторити останній закуп", ru: "Повторить последнюю покупку"

---

## Feature 3: Double Tap = ×2 Quantity

### What
Double-tap on a checked product row → quantity doubles instantly with a bounce animation.

### Implementation

In `ProductRow.vue`:

```ts
import { ref } from 'vue'
import { animate, spring } from 'motion'

const lastTap = ref(0)
const qtyEl = ref<HTMLElement>()

function handleRowClick() {
  const now = Date.now()
  const timeSinceLastTap = now - lastTap.value

  if (timeSinceLastTap < 300 && isChecked.value) {
    // Double tap detected — double the quantity
    const currentQty = sessionStore.getQty(props.product.id)
    sessionStore.updateQty(props.product.id, currentQty * 2)

    // Bounce animation on qty number
    if (qtyEl.value) {
      animate(qtyEl.value,
        { scale: [1, 1.6, 0.9, 1.15, 1] },
        { easing: spring({ stiffness: 400, damping: 18 }), duration: 0.5 }
      )
    }

    // Strong haptic for double tap
    if ('vibrate' in navigator) navigator.vibrate([15, 30, 15])

    lastTap.value = 0 // reset so triple tap doesn't fire again
    return
  }

  lastTap.value = now

  // Single tap — normal toggle (existing logic)
  handleCheck()
}
```

Replace existing `@click="handleCheck"` on `.row-content` with `@click="handleRowClick"`.

Add `ref="qtyEl"` to the qty number span:
```vue
<span ref="qtyEl" class="qty-num">{{ qty }}</span>
```

---

## Feature 4: Checked Items Sink to Bottom

### What
When a product is checked, it animates down to the bottom of its store section. Unchecked products stay at top. Makes it easy to see what's still to grab.

### Implementation

In `stores/session.ts` — no changes needed, isChecked already exists.

In `StoreSection.vue` — sort products before rendering:

```ts
import { computed } from 'vue'

const sortedProducts = computed(() => {
  return [...props.products].sort((a, b) => {
    const aChecked = sessionStore.isChecked(a.id) ? 1 : 0
    const bChecked = sessionStore.isChecked(b.id) ? 1 : 0
    return aChecked - bChecked
    // unchecked (0) sorts before checked (1)
  })
})
```

Use `sortedProducts` instead of `props.products` in the template `v-for`.

For smooth reordering animation, wrap the list in Vue's `<TransitionGroup>`:

```vue
<TransitionGroup name="sink" tag="div" class="product-list">
  <ProductRow
    v-for="product in sortedProducts"
    :key="product.id"
    :product="product"
  />
</TransitionGroup>
```

CSS for sink transition:
```css
.sink-move {
  transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.sink-enter-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.sink-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.sink-leave-active {
  transition: opacity 150ms ease;
  position: absolute;
}
.sink-leave-to {
  opacity: 0;
}
```

Visual style for checked rows that sunk:
```css
.product-row.checked {
  opacity: 0.55;
}
.product-row.checked .product-name {
  text-decoration: line-through;
  color: var(--muted);
}
```

---

## Feature 5: Share Screenshot of Shopping List

### What
A share button generates a clean screenshot of the current checklist and opens the native Share sheet (or downloads on desktop).

### Implementation

Install: `html2canvas` (already in deps above)

Create `components/ShareButton.vue`:

```vue
<template>
  <button class="share-btn" @click="handleShare" :disabled="isGenerating">
    <span v-if="isGenerating">⏳</span>
    <span v-else>📤</span>
    {{ t('home.share') }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import html2canvas from 'html2canvas'
import { useI18nStore } from '@/stores/i18n'

const { t } = useI18nStore()
const isGenerating = ref(false)

async function handleShare() {
  isGenerating.value = true

  try {
    // Capture the product list area (pass the ref from HomeView)
    const listEl = document.querySelector('.store-tabs-content') as HTMLElement
    if (!listEl) return

    const canvas = await html2canvas(listEl, {
      backgroundColor: '#f5f5f5',
      scale: 2, // retina quality
      useCORS: true,
      logging: false,
    })

    canvas.toBlob(async (blob) => {
      if (!blob) return

      const file = new File([blob], 'sunny-shop-list.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        // Native share sheet (mobile)
        await navigator.share({
          title: 'Мій список закупів',
          files: [file],
        })
      } else {
        // Fallback: download on desktop
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'sunny-shop-list.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  } finally {
    isGenerating.value = false
  }
}
</script>
```

Add the share button in `HomeView.vue` header area (next to lang toggle):
```vue
<ShareButton v-if="sessionStore.checkedCount > 0" />
```

Style:
```css
.share-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}
.share-btn:active { transform: scale(0.95); }
.share-btn:disabled { opacity: 0.5; pointer-events: none; }
```

Add i18n key:
- `home.share` → uk: "Поділитись", ru: "Поделиться"

---

## Feature 6: PWA — Install as Native App

### What
App works offline, has its own icon on home screen, launches fullscreen like a native app.

### Implementation

#### 1. vite.config.ts — add PWA plugin

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sunny Shop',
        short_name: 'Sunny Shop',
        description: 'Автоматизація закупів на Сонячному березі',
        theme_color: '#4CAF50',
        background_color: '#f5f5f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache' }
          }
        ]
      }
    })
  ]
})
```

#### 2. Create PWA icons

Generate icons and place in `public/`:
- `public/pwa-192x192.png` — 192×192px app icon (green background, shopping cart emoji or custom)
- `public/pwa-512x512.png` — 512×512px app icon
- `public/apple-touch-icon.png` — 180×180px for iOS

Use any online PWA icon generator (e.g. https://maskable.app or https://favicon.io) with the 🛒 emoji on green (#4CAF50) background.

#### 3. Install prompt component

Create `components/PwaInstallBanner.vue`:

```vue
<template>
  <Transition name="slide-up">
    <div v-if="showBanner" class="pwa-banner">
      <span>📲 {{ t('pwa.install') }}</span>
      <div class="pwa-actions">
        <button class="pwa-install-btn" @click="install">{{ t('pwa.installBtn') }}</button>
        <button class="pwa-dismiss-btn" @click="dismiss">✕</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18n'

const { t } = useI18nStore()
const showBanner = ref(false)
let deferredPrompt: any = null

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    // Show banner after 3 seconds on first visit
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
```

Style:
```css
.pwa-banner {
  position: fixed;
  bottom: 80px; /* above bottom nav */
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
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.pwa-actions { display: flex; gap: 8px; align-items: center; }
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
}
.pwa-dismiss-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.slide-up-enter-active { transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease; }
.slide-up-leave-active { transition: transform 200ms ease, opacity 200ms ease; }
.slide-up-enter-from { transform: translateX(-50%) translateY(20px); opacity: 0; }
.slide-up-leave-to  { transform: translateX(-50%) translateY(20px); opacity: 0; }
```

Add to `App.vue`:
```vue
<PwaInstallBanner />
```

Add i18n keys:
- `pwa.install` → uk: "Додати на головний екран", ru: "Добавить на главный экран"
- `pwa.installBtn` → uk: "Встановити", ru: "Установить"

---

## Summary of all changes

| File | Change |
|------|--------|
| `vite.config.ts` | Add VitePWA plugin |
| `public/` | Add pwa-192, pwa-512, apple-touch-icon PNG files |
| `HomeView.vue` | confetti on finish, repeatLast button, ShareButton |
| `ProductRow.vue` | double tap ×2 logic |
| `StoreSection.vue` | sortedProducts computed, TransitionGroup sink animation |
| `stores/session.ts` | loadFromSession() action |
| `stores/history.ts` | lastSession getter |
| `components/ShareButton.vue` | NEW — html2canvas share |
| `components/PwaInstallBanner.vue` | NEW — PWA install prompt |
| `i18n/uk.ts` + `i18n/ru.ts` | New keys: history.repeat, home.repeatLast, home.share, pwa.* |
