# Sunny Shop — Bug Fixes 2

This file extends all previous SPEC files. Apply these 3 fixes to the existing project.

---

## Fix 1: Empty black space between header and tabs

### Problem
Large empty dark area appears between the app header and the store tabs row.

### Diagnosis — check all of these in HomeView.vue:

1. Find any empty `<div>` or wrapper element sitting between `<header>` and `.store-tabs` in the template. Remove it.

2. Check if `<Transition>` or `<TransitionGroup>` wrappers for the search bar render a container element even when `v-if="false"`. Replace any `v-show` with `v-if` on the search bar:
```vue
<!-- WRONG -->
<div v-show="isSearchOpen" class="search-bar">...</div>

<!-- CORRECT -->
<Transition name="search-slide">
  <div v-if="isSearchOpen" class="search-bar">...</div>
</Transition>
```

3. Check CSS — remove any `min-height`, `padding`, or `margin` on the content wrapper that creates space when search is hidden:
```css
/* Remove or fix anything like this */
.content-wrapper {
  /* padding-top: 60px; ← might cause double spacing */
}
```

4. In `App.vue` or `HomeView.vue` — check if there's a `<RouterView>` wrapper div with extra padding that stacks with the header height.

5. The `<ThemePanel>` component — make sure it uses `position: absolute` and does NOT push content down when open. It must be absolutely positioned relative to the header, not in normal document flow.

**Quick fix if cause is unclear** — add this to the main content area:
```css
.home-content {
  padding-top: 0;
  margin-top: 0;
}
```
And ensure the sticky header + tabs don't add extra DOM height.

---

## Fix 2: i18n keys showing as raw strings

### Problem
Buttons show `sort.default`, `sort.frequency` etc. instead of translated text.

### Fix — add ALL missing keys to both locale files

**`i18n/uk.ts`** — add these keys:
```ts
// Sort
'sort.default': 'За замовч.',
'sort.frequency': 'Часті',

// Search
'search.placeholder': 'Пошук продуктів...',
'search.noResults': 'Нічого не знайдено',

// Theme
'theme.title': 'Тема',
'theme.custom': 'Свій колір',
'theme.light': 'Світла',
'theme.dark': 'Темна',

// Add product
'addProduct.stores': 'Магазини',

// Store empty state
'store.empty': 'Тут ще немає продуктів',

// PWA
'pwa.install': 'Додати на головний екран',
'pwa.installBtn': 'Встановити',

// History
'history.deleteConfirm': 'Видалити цей закуп?',
```

**`i18n/ru.ts`** — add these keys:
```ts
// Sort
'sort.default': 'По умолч.',
'sort.frequency': 'Частые',

// Search
'search.placeholder': 'Поиск продуктов...',
'search.noResults': 'Ничего не найдено',

// Theme
'theme.title': 'Тема',
'theme.custom': 'Свой цвет',
'theme.light': 'Светлая',
'theme.dark': 'Тёмная',

// Add product
'addProduct.stores': 'Магазины',

// Store empty state
'store.empty': 'Здесь пока нет товаров',

// PWA
'pwa.install': 'Добавить на главный экран',
'pwa.installBtn': 'Установить',

// History
'history.deleteConfirm': 'Удалить эту покупку?',
```

### Also fix the `t()` function

If `t(key)` returns the key itself when not found, that's correct behavior — but make sure the keys above are actually imported and merged into the translation object. Check that `uk.ts` and `ru.ts` export a flat object (not nested), and that `useI18nStore` merges them correctly:

```ts
// i18n/uk.ts — must be a flat export like:
export default {
  'app.title': 'Sunny Shop',
  'sort.default': 'За замовч.',
  // ... all keys flat
}
```

If translations are currently nested objects, either flatten them OR update `t()` to support dot-notation lookup:
```ts
function t(key: string): string {
  const keys = key.split('.')
  let result: any = translations[locale.value]
  for (const k of keys) {
    result = result?.[k]
    if (result === undefined) return key // fallback to key
  }
  return result ?? key
}
```

---

## Fix 3: Delete individual history sessions

### Problem
Only "Очистити всю історію" exists. User needs to delete single sessions.

### `stores/history.ts` — add deleteSession action

```ts
deleteSession(id: string) {
  this.sessions = this.sessions.filter(s => s.id !== id)
  // localStorage auto-updates via watcher or direct set:
  localStorage.setItem('history', JSON.stringify(this.sessions))
}
```

### `components/HistoryCard.vue` — add delete button in card header

Update the card header layout:

```vue
<template>
  <div ref="cardEl" class="history-card">
    <div class="card-header" @click="toggleExpand">
      <div class="card-meta">
        <span class="card-date">{{ formattedDate }}</span>
        <span class="card-count">{{ session.items.length }} {{ t('history.items') }}</span>
      </div>
      <div class="card-actions-row">
        <button class="card-delete-btn" @click.stop="handleDelete" :title="t('history.deleteConfirm')">
          🗑
        </button>
        <span class="card-chevron">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>
    </div>

    <!-- expanded content, repeat/share buttons — unchanged -->
    <Transition name="card-expand">
      <div v-if="isExpanded" class="card-body">
        <!-- items grouped by store -->
        ...
        <div class="card-footer-actions">
          <button class="repeat-btn" @click="handleRepeat">🔁 {{ t('history.repeat') }}</button>
          <button class="share-btn-small" @click="handleShare">📤</button>
        </div>
      </div>
    </Transition>
  </div>
</template>
```

```ts
import { useHistoryStore } from '@/stores/history'

const historyStore = useHistoryStore()

function handleDelete() {
  if (confirm(t('history.deleteConfirm'))) {
    historyStore.deleteSession(props.session.id)
    if ('vibrate' in navigator) navigator.vibrate([20, 50, 20])
  }
}
```

### CSS for card header with delete button

```css
.history-card {
  background: var(--card);
  border-radius: var(--radius, 12px);
  border: 1px solid var(--border);
  margin-bottom: 10px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-date {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.card-count {
  font-size: 13px;
  color: var(--muted);
}

.card-actions-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-delete-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms, color 150ms, transform 150ms;
}

.card-delete-btn:active {
  background: var(--danger);
  color: white;
  transform: scale(0.88);
}

.card-chevron {
  font-size: 12px;
  color: var(--muted);
  padding: 4px 8px;
}

/* Card expand/collapse transition */
.card-expand-enter-active { transition: max-height 250ms ease, opacity 200ms ease; }
.card-expand-leave-active { transition: max-height 200ms ease, opacity 150ms ease; }
.card-expand-enter-from { max-height: 0; opacity: 0; overflow: hidden; }
.card-expand-leave-to  { max-height: 0; opacity: 0; overflow: hidden; }
.card-expand-enter-to  { max-height: 600px; }
```

---

## Summary of changed files

| File | Change |
|------|--------|
| `HomeView.vue` | Remove empty DOM element causing black gap, fix v-show → v-if on search bar |
| `i18n/uk.ts` | Add all missing translation keys (sort, search, theme, addProduct, store, pwa, history) |
| `i18n/ru.ts` | Same keys in Russian |
| `stores/history.ts` | Add `deleteSession(id)` action |
| `components/HistoryCard.vue` | Add 🗑 delete button in card header, wire to deleteSession |

Run `npm run build` after all fixes to verify no TypeScript errors.
