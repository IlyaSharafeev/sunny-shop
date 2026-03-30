# Sunny Shop — UX2 Update

This file extends all previous SPEC files. Read SPEC.md, SPEC_UX.md, SPEC_FEATURES.md, SPEC_FIXES.md first.

---

## Change 1: Horizontal scrollable tabs (no wrapping)

### Problem
5 tabs don't fit on screen — "Склад Младост" and "Будь-який" wrap to second line.

### Fix in `StoreSection.vue` / `HomeView.vue` tab bar:

```css
.store-tabs {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scrollbar-width: none; /* Firefox */
  position: sticky;
  top: 60px;
  z-index: 10;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  gap: 0;
}

.store-tabs::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.store-tab {
  flex: 0 0 auto; /* CRITICAL: tabs do not shrink or wrap */
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap; /* never wrap text inside tab */
  scroll-snap-align: start;
  color: var(--muted);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 3px solid transparent;
  transition: color 150ms, border-color 150ms;
}

.store-tab.active {
  color: var(--tab-color);
  border-bottom-color: var(--tab-color);
}
```

Each tab gets its store color as CSS variable:
```vue
<button
  v-for="store in STORES"
  :key="store.id"
  class="store-tab"
  :class="{ active: activeStoreId === store.id }"
  :style="{ '--tab-color': store.color }"
  @click="setActiveStore(store.id)"
>
  {{ store.name }}
</button>
```

On mount, scroll active tab into view:
```ts
onMounted(() => {
  nextTick(() => {
    const activeTab = tabsEl.value?.querySelector('.store-tab.active') as HTMLElement
    activeTab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  })
})
```

Also scroll active tab into view on tab switch:
```ts
function setActiveStore(id: StoreId) {
  activeStoreId.value = id
  nextTick(() => {
    const activeTab = tabsEl.value?.querySelector('.store-tab.active') as HTMLElement
    activeTab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  })
}
```

Remove the spring-animated indicator bar — it doesn't work well with horizontal scroll. Use `border-bottom` on active tab instead (already above).

---

## Change 2: Search — icon in header → expands inline

### How it works

1. Header has a 🔍 icon button on the right (next to UA/RU toggle)
2. Tap → search bar slides down below header, autofocuses
3. Typing filters products across ALL stores simultaneously
4. Results show as flat list grouped by store (same ProductRow component)
5. Tap ✕ or press Escape → search closes, returns to normal tab view

### Implementation

In `HomeView.vue`:

```ts
const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchInputEl = ref<HTMLInputElement>()

function openSearch() {
  isSearchOpen.value = true
  nextTick(() => searchInputEl.value?.focus())
}

function closeSearch() {
  isSearchOpen.value = false
  searchQuery.value = ''
}
```

Header template:
```vue
<header class="app-header">
  <span class="app-title">🛒 Sunny Shop</span>
  <div class="header-actions">
    <button class="icon-btn" @click="openSearch">🔍</button>
    <LangToggle />
  </div>
</header>

<!-- Search bar — slides in below header -->
<Transition name="search-slide">
  <div v-if="isSearchOpen" class="search-bar">
    <input
      ref="searchInputEl"
      v-model="searchQuery"
      type="search"
      :placeholder="t('search.placeholder')"
      class="search-input"
    />
    <button class="search-close" @click="closeSearch">✕</button>
  </div>
</Transition>
```

Search results computed (fires when `searchQuery.length >= 2`):
```ts
const searchResults = computed(() => {
  if (searchQuery.value.length < 2) return []
  const q = searchQuery.value.toLowerCase().trim()
  return productsStore.products.filter(p =>
    p.name.toLowerCase().includes(q)
  )
})

const isSearching = computed(() => searchQuery.value.length >= 2)
```

In template — show search results OR normal tab content:
```vue
<!-- Search results view -->
<div v-if="isSearching" class="search-results">
  <div v-if="searchResults.length === 0" class="search-empty">
    {{ t('search.noResults') }}
  </div>
  <div v-for="store in STORES" :key="store.id">
    <div
      v-if="searchResults.filter(p => p.storeId === store.id).length > 0"
      class="search-store-header"
      :style="{ borderLeftColor: store.color }"
    >
      {{ store.name }}
    </div>
    <ProductRow
      v-for="product in searchResults.filter(p => p.storeId === store.id)"
      :key="product.id"
      :product="product"
    />
  </div>
</div>

<!-- Normal tab content -->
<div v-else>
  <!-- existing StoreSection for activeStoreId -->
</div>
```

Search bar CSS:
```css
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 60px;
  z-index: 11; /* above tabs */
}

.search-input {
  flex: 1;
  height: 38px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  padding: 0 16px;
  font-size: 15px;
  background: var(--bg);
  outline: none;
}

.search-input:focus {
  border-color: var(--primary);
}

.search-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-store-header {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: var(--bg);
  border-left: 3px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 15px;
}
```

Search slide transition:
```css
.search-slide-enter-active { transition: max-height 200ms ease, opacity 200ms ease; }
.search-slide-leave-active { transition: max-height 150ms ease, opacity 150ms ease; }
.search-slide-enter-from  { max-height: 0; opacity: 0; }
.search-slide-leave-to    { max-height: 0; opacity: 0; }
.search-slide-enter-to    { max-height: 60px; }
```

i18n keys:
- `search.placeholder` → uk: "Пошук продуктів...", ru: "Поиск продуктов..."
- `search.noResults` → uk: "Нічого не знайдено", ru: "Ничего не найдено"

---

## Change 3: Sort products (alphabet + frequency)

### Sort controls

Add a small sort toggle bar below the tabs (visible only when NOT searching):

```vue
<div class="sort-bar">
  <button
    class="sort-btn"
    :class="{ active: sortMode === 'default' }"
    @click="sortMode = 'default'"
  >
    {{ t('sort.default') }}
  </button>
  <button
    class="sort-btn"
    :class="{ active: sortMode === 'alpha' }"
    @click="sortMode = 'alpha'"
  >
    А→Я
  </button>
  <button
    class="sort-btn"
    :class="{ active: sortMode === 'frequency' }"
    @click="sortMode = 'frequency'"
  >
    ★ {{ t('sort.frequency') }}
  </button>
</div>
```

```ts
const sortMode = ref<'default' | 'alpha' | 'frequency'>('default')
// Persist to localStorage
watch(sortMode, (v) => localStorage.setItem('sortMode', v))
onMounted(() => {
  sortMode.value = (localStorage.getItem('sortMode') as any) || 'default'
})
```

Pass `sortMode` to `StoreSection` as prop. In `StoreSection.vue`:

```ts
const sortedProducts = computed(() => {
  let list = [...props.products]

  // Always: unchecked first, checked last (existing sink behavior)
  // But sort WITHIN each group
  const unchecked = list.filter(p => !sessionStore.isChecked(p.id))
  const checked   = list.filter(p =>  sessionStore.isChecked(p.id))

  const applySort = (arr: Product[]) => {
    if (props.sortMode === 'alpha') {
      return arr.sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    }
    if (props.sortMode === 'frequency') {
      const freq = historyStore.getFrequentProductIds(999) // get all, ordered
      return arr.sort((a, b) => {
        const ai = freq.indexOf(a.id)
        const bi = freq.indexOf(b.id)
        // items not in history go to end
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
    }
    return arr // default order
  }

  return [...applySort(unchecked), ...applySort(checked)]
})
```

Sort bar CSS:
```css
.sort-bar {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}
.sort-bar::-webkit-scrollbar { display: none; }

.sort-btn {
  flex: 0 0 auto;
  padding: 4px 12px;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: var(--card);
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms;
}
.sort-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
```

i18n keys:
- `sort.default` → uk: "За замовч.", ru: "По умолч."
- `sort.frequency` → uk: "Часті", ru: "Частые"

---

## Change 4: Add product to multiple stores at once

### Problem
When adding a new custom product, user can only pick one store. Should be able to add to multiple stores (or all).

### New modal behavior (`AddProductModal.vue`)

Replace single store `<select>` with checkboxes for each store:

```vue
<div class="store-checkboxes">
  <p class="field-label">{{ t('addProduct.stores') }}</p>
  <div
    v-for="store in STORES"
    :key="store.id"
    class="store-checkbox-row"
    @click="toggleStore(store.id)"
  >
    <div class="mini-checkbox" :class="{ active: selectedStores.includes(store.id) }">
      <span v-if="selectedStores.includes(store.id)">✓</span>
    </div>
    <span class="store-dot" :style="{ background: store.color }"></span>
    <span class="store-label">{{ store.name }}</span>
  </div>
</div>
```

```ts
// Pre-select the store that was active when modal opened
const selectedStores = ref<StoreId[]>([props.preselectedStoreId])

function toggleStore(id: StoreId) {
  const idx = selectedStores.value.indexOf(id)
  if (idx === -1) selectedStores.value.push(id)
  else if (selectedStores.value.length > 1) selectedStores.value.splice(idx, 1)
  // always keep at least 1 selected
}

async function handleSubmit() {
  if (!productName.value.trim()) return
  // Create one product per selected store
  selectedStores.value.forEach(storeId => {
    productsStore.addCustomProduct(productName.value.trim(), storeId, selectedUnit.value)
  })
  // Auto-check all created products
  // (find them by name + storeId since we just added them)
  productsStore.products
    .filter(p => p.name === productName.value.trim() && selectedStores.value.includes(p.storeId))
    .forEach(p => sessionStore.toggle(p.id))

  emit('close')
}
```

Store checkboxes CSS:
```css
.store-checkboxes { margin: 12px 0; }

.field-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.store-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.store-checkbox-row:last-child { border-bottom: none; }

.mini-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: white;
  flex-shrink: 0;
  transition: all 150ms;
}
.mini-checkbox.active {
  background: var(--primary);
  border-color: var(--primary);
}

.store-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.store-label {
  font-size: 15px;
  color: var(--text);
}
```

i18n key:
- `addProduct.stores` → uk: "Магазини", ru: "Магазины"

---

## Change 5: Share button moves to History page

### Problem
Share button should be in HistoryView (on session cards), not in HomeView.

### Remove from HomeView
- Remove `<ShareButton />` from HomeView bottom bar entirely
- Remove ShareButton import from HomeView

### Add to HistoryView / HistoryCard

In `HistoryCard.vue` — add share button next to the existing "Повторити" button:

```vue
<div class="card-actions">
  <button class="repeat-btn" @click="handleRepeat">
    🔁 {{ t('history.repeat') }}
  </button>
  <button class="share-btn-small" @click="handleShare" :disabled="isSharing">
    {{ isSharing ? '⏳' : '📤' }}
  </button>
</div>
```

```ts
import html2canvas from 'html2canvas'

const isSharing = ref(false)
const cardEl = ref<HTMLElement>()

async function handleShare() {
  if (!cardEl.value) return
  isSharing.value = true
  try {
    const canvas = await html2canvas(cardEl.value, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `zakup-${props.session.date.slice(0,10)}.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Закуп 🛒', files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  } catch (e) {
    console.error('Share error:', e)
  } finally {
    isSharing.value = false
  }
}
```

Add `ref="cardEl"` to the root element of `HistoryCard.vue` so html2canvas captures the card.

Card actions CSS:
```css
.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.share-btn-small {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.share-btn-small:active { transform: scale(0.92); }
.share-btn-small:disabled { opacity: 0.5; }
```

---

## Summary of changed files

| File | Change |
|------|--------|
| `HomeView.vue` | Scrollable tabs, search icon+bar, sort bar, remove ShareButton |
| `StoreSection.vue` | Accept sortMode prop, apply sort logic in sortedProducts |
| `AddProductModal.vue` | Replace store select with multi-store checkboxes |
| `HistoryCard.vue` | Add share button + html2canvas logic, add ref="cardEl" |
| `components/ShareButton.vue` | Can be deleted or kept empty |
| `i18n/uk.ts` + `i18n/ru.ts` | Add: search.*, sort.*, addProduct.stores |

Run `npm run build` after all changes to verify no TypeScript errors.
