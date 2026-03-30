# Sunny Shop — Bug Fixes & Updates

This file extends SPEC.md, SPEC_UX.md, SPEC_FEATURES.md. Read all previous specs first, then apply these fixes.

---

## Fix 1: Delete item from active list (swipe or button)

### Problem
There is no way to remove a checked item from the current shopping session list.

### Solution

**Option A — Swipe left to delete (replaces current swipe-left = qty-1):**

Remap swipe directions in `ProductRow.vue`:
- Swipe RIGHT → quantity +1 (was correct)
- Swipe LEFT → if qty > 1: quantity -1. If qty === 1: DELETE item from session (remove from checkedItems entirely)

When swipe-left reaches qty=1 and user swipes again, show a red delete zone:
```
| 🗑 Видалити |  [product name]  |
```
Release on delete zone → `sessionStore.toggle(productId)` (removes it) + `navigator.vibrate([20, 50, 20])`

**Option B — Long press reveals delete button:**

On long press (500ms) on a checked row:
- Row slides slightly left (translateX: -60px)
- Red "🗑" button appears on the right edge
- Tap 🗑 → confirm with a small inline confirmation (replace 🗑 with "✓ Видалити?" for 2 seconds) → on second tap removes item
- Tap anywhere else → row snaps back

**Implement BOTH options** — swipe for power users, long press as discoverable fallback.

**Unchecking** (tapping checkbox/row of a checked item) already removes it from list — make sure this still works and is visually clear. Add a subtle hint text under empty store section: "Натисни на продукт щоб додати" when 0 items checked in that store.

---

## Fix 2: Share button not working

### Problem
Share button is not visible or not functioning.

### Diagnosis checklist — fix whichever applies:

1. **Button not visible**: Make sure `v-if="sessionStore.checkedCount > 0"` is not hiding it when it should show. Change to always visible but disabled when 0 items:
```vue
<ShareButton :disabled="sessionStore.checkedCount === 0" />
```

2. **html2canvas fails silently**: Wrap in explicit try/catch with user-visible error:
```ts
async function handleShare() {
  isGenerating.value = true
  try {
    const listEl = document.querySelector('.product-list-area') as HTMLElement
    if (!listEl) {
      alert('Не вдалося знайти список')
      return
    }
    const canvas = await html2canvas(listEl, {
      backgroundColor: '#f5f5f5',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 480,
    })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'sunny-shop-list.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Мій список закупів 🛒', files: [file] })
      } else {
        // Desktop fallback or iOS that doesn't support file share
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'sunny-shop.png'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  } catch (e) {
    console.error('Share failed:', e)
  } finally {
    isGenerating.value = false
  }
}
```

3. **Make the share button prominent** — move it to the fixed bottom bar next to "Завершити":

In `HomeView.vue` bottom bar:
```vue
<div class="bottom-bar">
  <button class="clear-btn" @click="handleClear" :disabled="sessionStore.checkedCount === 0">
    {{ t('home.clearAll') }}
  </button>
  
  <span class="checked-count">{{ sessionStore.checkedCount }} {{ t('home.selected') }}</span>
  
  <div class="bottom-right-actions">
    <ShareButton />  <!-- always visible, small icon button -->
    <button class="finish-btn" @click="handleFinish" :disabled="sessionStore.checkedCount === 0">
      {{ t('home.finish') }} ✓
    </button>
  </div>
</div>
```

Make ShareButton compact in bottom bar:
```css
.share-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
```

---

## Fix 3: Swipe sensitivity too high + wrong swipe direction

### Problem
- Swipe triggers accidentally while scrolling
- Swipe LEFT should add (+1), swipe RIGHT should remove (-1) — currently reversed

### Fix in `ProductRow.vue`

**Correct swipe direction mapping:**
```
Swipe LEFT  → quantity +1  (finger moves left = "add more")
Swipe RIGHT → quantity -1  (finger moves right = "put back")
```

Wait — re-read the request: "свайп зліва направо повинно добавляти" = swipe FROM left TO right = RIGHT direction = +1.
So:
```
Swipe RIGHT (→) → quantity +1
Swipe LEFT  (←) → quantity -1 / delete
```

**Increase sensitivity threshold to prevent accidental triggers:**

```ts
const { direction, lengthX } = useSwipe(contentEl, {
  threshold: 40,        // was likely 10-20, increase to 40px minimum
  onSwipeEnd(e, direction) {
    const absX = Math.abs(lengthX.value)
    
    // Only trigger if it's clearly a horizontal swipe (not a scroll attempt)
    if (absX < 40) return
    
    // Only trigger on checked items
    if (!isChecked.value) return

    if (direction === 'right') {
      // Swipe right → add +1
      sessionStore.updateQty(props.product.id, sessionStore.getQty(props.product.id) + 1)
      if ('vibrate' in navigator) navigator.vibrate(8)
      // Animate qty badge
      if (qtyEl.value) {
        animate(qtyEl.value, { scale: [1, 1.4, 1] },
          { easing: spring({ stiffness: 400, damping: 20 }) })
      }
    } else if (direction === 'left') {
      const currentQty = sessionStore.getQty(props.product.id)
      if (currentQty > 1) {
        sessionStore.updateQty(props.product.id, currentQty - 1)
        if ('vibrate' in navigator) navigator.vibrate(8)
      } else {
        // qty is 1, swipe left = delete
        sessionStore.toggle(props.product.id) // removes item
        if ('vibrate' in navigator) navigator.vibrate([15, 40, 15])
      }
    }
    
    // Always snap row back to center after swipe
    snapBack(contentEl.value!)
  }
})
```

**Prevent swipe from interfering with vertical scroll:**

Add passive touch detection — if vertical movement is greater than horizontal, cancel swipe:
```ts
let startY = 0
let startX = 0
let isScrolling: boolean | null = null

contentEl.value?.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
  isScrolling = null
}, { passive: true })

contentEl.value?.addEventListener('touchmove', (e) => {
  if (isScrolling === null) {
    const dx = Math.abs(e.touches[0].clientX - startX)
    const dy = Math.abs(e.touches[0].clientY - startY)
    isScrolling = dy > dx // if moving more vertically, it's a scroll
  }
}, { passive: true })
```

Only process swipe in `onSwipeEnd` if `isScrolling === false`.

**Visual swipe indicators** (make direction clear):
```
Swipe right → green badge appears on LEFT side: "＋1 →"
Swipe left  → red badge appears on RIGHT side: "← −1"
```

Update `.swipe-bg-left` and `.swipe-bg-right` labels accordingly:
```html
<div class="swipe-bg swipe-add">＋1</div>   <!-- shows when swiping right -->
<div class="swipe-bg swipe-remove">−1</div>  <!-- shows when swiping left -->
```

---

## Fix 4: Add new store tab "Склад Младост"

### Problem
Need a new store: "Склад Младост" — a separate tab next to Младост.

### Changes

In `src/stores/products.ts` — update StoreId type and STORES array:

```ts
type StoreId = 'zhanet' | 'lidl' | 'mladost' | 'sklad' | 'any'

const STORES: Store[] = [
  { id: 'zhanet',  name: 'Жанет',         color: '#e91e63', emoji: '🌸' },
  { id: 'lidl',    name: 'Лідл',           color: '#1565c0', emoji: '🔵' },
  { id: 'mladost', name: 'Младост',        color: '#2e7d32', emoji: '🌿' },
  { id: 'sklad',   name: 'Склад Младост',  color: '#6d4c41', emoji: '📦' },
  { id: 'any',     name: 'Будь-який',      color: '#757575', emoji: '🏪' },
]
```

Update the type everywhere it's used: `stores/products.ts`, `stores/session.ts`, `stores/history.ts`, `router/index.ts` if needed, all components.

Add initial seed products for "Склад Младост" — leave empty array for now, user will add their own:
```ts
// No predefined products for sklad — user adds manually
// The tab will show empty state with "＋ Додати продукт" button
```

Empty state for sklad tab:
```vue
<div v-if="sortedProducts.length === 0" class="empty-store">
  <p>{{ t('store.empty') }}</p>
  <button @click="$emit('addProduct')">＋ {{ t('home.addProduct') }}</button>
</div>
```

i18n key:
- `store.empty` → uk: "Тут ще немає продуктів", ru: "Здесь пока нет товаров"

---

## Fix 5: Missing products — add more items

### Problem
Several products from the original lists are missing from the catalog.

### Add these missing products to the seed in `stores/products.ts`

Add to **Жанет** section:
```ts
{ id: 'zh-26', name: "Сметана",           storeId: 'zhanet', unit: 'л',   isCustom: false },
{ id: 'zh-27', name: "Кефір",             storeId: 'zhanet', unit: 'л',   isCustom: false },
{ id: 'zh-28', name: "Масло вершкове",    storeId: 'zhanet', unit: 'шт',  isCustom: false },
{ id: 'zh-29', name: "Оселедець",         storeId: 'zhanet', unit: 'шт',  isCustom: false },
{ id: 'zh-30', name: "Часник",            storeId: 'zhanet', unit: 'шт',  isCustom: false },
```

Add to **Лідл** section:
```ts
{ id: 'li-18', name: "Кетчуп",            storeId: 'lidl', unit: 'шт',  isCustom: false },
{ id: 'li-19', name: "Гірчиця",           storeId: 'lidl', unit: 'шт',  isCustom: false },
{ id: 'li-20', name: "Оцет",              storeId: 'lidl', unit: 'шт',  isCustom: false },
{ id: 'li-21', name: "Консерви (боби)",   storeId: 'lidl', unit: 'шт',  isCustom: false },
{ id: 'li-22', name: "Вівсянка",          storeId: 'lidl', unit: 'пач', isCustom: false },
```

Add to **Младост** section:
```ts
{ id: 'ml-09', name: "Виноград",          storeId: 'mladost', unit: 'кг',  isCustom: false },
{ id: 'ml-10', name: "Лимон",             storeId: 'mladost', unit: 'шт',  isCustom: false },
{ id: 'ml-11', name: "Груші",             storeId: 'mladost', unit: 'кг',  isCustom: false },
```

Add to **Будь-який** section:
```ts
{ id: 'an-14', name: "Туалетний папір",   storeId: 'any', unit: 'пач', isCustom: false },
{ id: 'an-15', name: "Мило",              storeId: 'any', unit: 'шт',  isCustom: false },
{ id: 'an-16', name: "Шампунь",           storeId: 'any', unit: 'шт',  isCustom: false },
{ id: 'an-17', name: "Зубна паста",       storeId: 'any', unit: 'шт',  isCustom: false },
```

**Important**: Adding new seed products must not overwrite user's existing localStorage data. Use this merge strategy in `useProductsStore` init:

```ts
onMounted or in store setup:
const stored = localStorage.getItem('products')
if (stored) {
  const existing = JSON.parse(stored) as Product[]
  // Add any NEW predefined products that don't exist yet
  const existingIds = new Set(existing.map(p => p.id))
  const newSeedProducts = SEED_PRODUCTS.filter(p => !existingIds.has(p.id))
  if (newSeedProducts.length > 0) {
    this.products = [...existing, ...newSeedProducts]
  }
  // Don't replace — just merge new ones
} else {
  this.products = [...SEED_PRODUCTS]
}
```

---

## Summary of files to change

| File | Changes |
|------|---------|
| `stores/products.ts` | Add `sklad` to StoreId, add STORES entry, add missing seed products, merge strategy |
| `ProductRow.vue` | Fix swipe direction, increase threshold to 40px, add scroll detection, add delete on swipe-left-at-qty-1 |
| `components/ShareButton.vue` | Fix html2canvas selector, always visible, move to bottom bar |
| `HomeView.vue` | Move ShareButton to bottom bar, update bottom bar layout |
| `StoreSection.vue` | Empty state for sklad tab |
| `i18n/uk.ts` + `i18n/ru.ts` | Add `store.empty` key |

Run `npm run build` after all changes to verify no TypeScript errors.
