# Sunny Shop — Sync + History + FAB

---

## Change 1: Full backend sync

### On login (App.vue — after authStore.init() succeeds)

```ts
async function initApp() {
  await authStore.init() // GET /api/auth/me → sets user
  if (authStore.isLoggedIn) {
    await Promise.all([
      productsStore.fetchFromServer(),
      sessionStore.fetchFromServer(),
      historyStore.fetchFromServer(),
      settingsStore.fetchFromServer(),
    ])
  }
}
```

### On logout (authStore.logout())

```ts
function logout() {
  // Clear all local state
  productsStore.resetToSeed()    // restore default seed products
  sessionStore.clearCurrent()
  historyStore.clearAll()
  settingsStore.resetToDefaults()
  // Clear tokens
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  user.value = null
  accessToken.value = null
  refreshToken.value = null
}
```

### Auto-sync on every change (debounced 2s)

In each Pinia store, after every mutation that changes state, call a debounced sync function:

**stores/products.ts:**
```ts
import { useDebounceFn } from '@vueuse/core'
import { useApi } from '@/composables/useApi'

const api = useApi()
const syncToServer = useDebounceFn(async () => {
  if (!useAuthStore().isLoggedIn) return
  await api.post('/api/products/sync', {
    products: products.value.map(p => ({
      ...p,
      updatedAt: new Date().toISOString()
    }))
  })
}, 2000)

// Call syncToServer() after: addCustomProduct, deleteProduct
```

**stores/session.ts:**
```ts
const syncToServer = useDebounceFn(async () => {
  if (!useAuthStore().isLoggedIn) return
  await api.put('/api/session', { items: checkedItems.value })
}, 2000)

// Call syncToServer() after: toggle, updateQty, clearCurrent
// Call immediately (no debounce) after: finishSession
```

**stores/history.ts:**
```ts
const syncToServer = useDebounceFn(async () => {
  if (!useAuthStore().isLoggedIn) return
  await api.post('/api/history/sync', { sessions: sessions.value })
}, 2000)

// Call syncToServer() after: addSession, deleteSession
// Call api.delete('/api/history') immediately after: clearHistory
```

**stores/settings.ts (new or existing):**
```ts
const syncToServer = useDebounceFn(async () => {
  if (!useAuthStore().isLoggedIn) return
  await api.patch('/api/settings', {
    locale: i18nStore.locale,
    accentColor: themeStore.accentColor,
    colorScheme: themeStore.colorScheme,
    sortMode: sortMode.value,
    activeStore: activeStoreId.value,
  })
}, 2000)
```

### fetchFromServer implementations

**stores/products.ts:**
```ts
async fetchFromServer() {
  const data = await api.get('/api/products')
  if (data?.products?.length > 0) {
    products.value = data.products
  }
}
```

**stores/session.ts:**
```ts
async fetchFromServer() {
  const data = await api.get('/api/session')
  if (data?.items) {
    checkedItems.value = data.items
  }
}
```

**stores/history.ts:**
```ts
async fetchFromServer() {
  const data = await api.get('/api/history')
  if (data?.sessions) {
    sessions.value = data.sessions
  }
}
```

**stores/settings (apply to i18n + theme stores):**
```ts
async fetchFromServer() {
  const data = await api.get('/api/settings')
  if (data) {
    if (data.locale) i18nStore.setLocale(data.locale)
    if (data.accentColor) themeStore.setAccentColor(data.accentColor)
    if (data.colorScheme) themeStore.setColorScheme(data.colorScheme)
    if (data.sortMode) sortMode.value = data.sortMode
    if (data.activeStore) activeStoreId.value = data.activeStore
  }
}
```

---

## Change 2: History page — auto-expand last session + checkboxes

### Auto-expand last session on mount

In `HistoryView.vue`:
```ts
import { onMounted, ref } from 'vue'

const expandedId = ref<string | null>(null)

onMounted(() => {
  // Auto-expand the most recent session
  if (historyStore.sessions.length > 0) {
    const last = [...historyStore.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]
    expandedId.value = last.id
  }
})
```

Pass `expandedId` to `HistoryCard` and have it use `v-model` or prop to control expand state.

### Checkboxes in history items (visual only — show what was bought)

In `HistoryCard.vue` expanded content, show each item with a checked checkbox (all checked — they were all bought):

```vue
<div class="history-items">
  <div
    v-for="store in storesWithItems"
    :key="store.id"
  >
    <div class="history-store-header" :style="{ borderLeftColor: store.color }">
      {{ store.name }}
    </div>
    <div
      v-for="item in itemsForStore(store.id)"
      :key="item.productClientId"
      class="history-item-row"
    >
      <!-- Visual checkbox — always checked (these were purchased) -->
      <div class="history-checkbox checked">✓</div>
      <span class="history-item-name">{{ getProductName(item.productClientId) }}</span>
      <span class="history-item-qty">{{ item.quantity }}</span>
      <span class="history-item-unit">{{ getProductUnit(item.productClientId) }}</span>
    </div>
  </div>
</div>
```

CSS:
```css
.history-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}

.history-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--primary);
  background: var(--primary);
  color: white;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-item-name {
  flex: 1;
  font-size: 14px;
  color: var(--text);
}

.history-item-qty {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
  min-width: 20px;
  text-align: right;
}

.history-item-unit {
  font-size: 12px;
  color: var(--muted);
  min-width: 24px;
}

.history-store-header {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  border-left: 3px solid transparent;
  background: var(--bg);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

Helper functions in HistoryCard:
```ts
function getProductName(clientId: string): string {
  return productsStore.products.find(p => p.id === clientId || p.clientId === clientId)?.name ?? clientId
}

function getProductUnit(clientId: string): string {
  return productsStore.products.find(p => p.id === clientId || p.clientId === clientId)?.unit ?? ''
}

function itemsForStore(storeId: string) {
  return props.session.items.filter(item => {
    const product = productsStore.products.find(p => p.id === item.productClientId || p.clientId === item.productClientId)
    return product?.storeId === storeId
  })
}

const storesWithItems = computed(() => {
  return STORES.filter(store => itemsForStore(store.id).length > 0)
})
```

---

## Change 3: FAB (Floating Action Button) for adding products

### Remove current inline "＋ Додати продукт" text button

Remove the `<button class="add-product-btn">＋ Додати продукт</button>` from the bottom of each StoreSection.

### Add FAB in HomeView.vue

```vue
<!-- FAB — floating add button -->
<button class="fab" @click="openAddModal">
  <span class="fab-icon">＋</span>
</button>
```

CSS:
```css
.fab {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom) + 16px); /* above bottom nav */
  right: calc(50% - 240px + 16px); /* inside the 480px max-width container */
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  z-index: 50;
  transition: transform 150ms ease, background 150ms ease;
  will-change: transform;
}

.fab:active {
  transform: scale(0.92);
  background: var(--primary-dark);
}

.fab-icon {
  font-size: 28px;
  line-height: 1;
  margin-top: -2px;
}

/* On small screens where max-width doesn't apply */
@media (max-width: 480px) {
  .fab {
    right: 16px;
  }
}
```

### FAB tap animation (spring bounce)

```ts
import { animate, spring } from 'motion'

const fabEl = ref<HTMLElement>()

function openAddModal() {
  // Spring bounce on tap
  if (fabEl.value) {
    animate(fabEl.value,
      { scale: [1, 0.88, 1.12, 1] },
      { easing: spring({ stiffness: 400, damping: 20 }) }
    )
  }
  // Open modal pre-filled with active store
  isAddModalOpen.value = true
  if ('vibrate' in navigator) navigator.vibrate(10)
}
```

Add `ref="fabEl"` to the FAB button element.

### AddProductModal pre-fills active store

When opening modal from FAB, pass `activeStoreId` as the preselected store:
```vue
<AddProductModal
  v-if="isAddModalOpen"
  :preselected-store-id="activeStoreId"
  @close="isAddModalOpen = false"
/>
```

---

## Summary of changed files

| File | Change |
|------|--------|
| `App.vue` | Call fetchFromServer for all stores after login |
| `stores/auth.ts` | logout() clears all store state |
| `stores/products.ts` | fetchFromServer(), syncToServer() debounced |
| `stores/session.ts` | fetchFromServer(), syncToServer() debounced |
| `stores/history.ts` | fetchFromServer(), syncToServer() debounced |
| `HomeView.vue` | Remove inline add buttons, add FAB |
| `StoreSection.vue` | Remove "＋ Додати продукт" button |
| `HistoryView.vue` | Auto-expand last session on mount |
| `HistoryCard.vue` | Checkboxes on items, grouped by store |

Run `npm run build` after all changes.
