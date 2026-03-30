# Sunny Shop — Theme Color Picker

---

## Feature: Custom color theme via color picker

User can pick any accent color — it replaces `--primary` throughout the entire app.

---

## Where to access

In the main header — add a 🎨 icon button between the search icon and the UA/RU toggle:

```
[ 🛒 Sunny Shop ]  [ 🔍 ]  [ 🎨 ]  [ UA ]
```

Tap 🎨 → opens a small theme panel (not a full modal — a compact floating card below the header).

---

## Theme panel UI

Floating card that drops down below the header:

```
┌─────────────────────────────┐
│  Тема                    ✕  │
│                             │
│  ● ● ● ● ● ● ● ● preset    │
│                             │
│  Свій колір: [color input]  │
│                             │
│  ◐ Світла  /  ● Темна       │
└─────────────────────────────┘
```

### Preset colors (8 swatches)

```ts
const PRESETS = [
  { name: 'Зелений',    value: '#4CAF50' }, // default
  { name: 'Синій',      value: '#2196F3' },
  { name: 'Фіолетовий', value: '#9C27B0' },
  { name: 'Помаранчевий', value: '#FF9800' },
  { name: 'Рожевий',    value: '#E91E63' },
  { name: 'Бірюзовий',  value: '#009688' },
  { name: 'Червоний',   value: '#F44336' },
  { name: 'Індиго',     value: '#3F51B5' },
]
```

Each swatch: 36×36px circle, tapping it sets the accent color immediately.
Active swatch has a white checkmark ✓ in center.

### Custom color input

Native `<input type="color">` — styled as a wide pill button:

```vue
<label class="color-input-row">
  <span>{{ t('theme.custom') }}</span>
  <input
    type="color"
    :value="accentColor"
    @input="setAccentColor(($event.target as HTMLInputElement).value)"
  />
</label>
```

### Dark / Light mode toggle

Two pill buttons: "☀️ Світла" and "🌙 Темна"
Active one is filled with current accent color.

```ts
const colorScheme = ref<'light' | 'dark'>('light')
// On change: document.documentElement.setAttribute('data-theme', value)
```

---

## Implementation

### `composables/useTheme.ts` — create this file

```ts
import { ref, watch, onMounted } from 'vue'

const STORAGE_KEY_COLOR = 'theme-accent'
const STORAGE_KEY_SCHEME = 'theme-scheme'

export function useTheme() {
  const accentColor = ref('#4CAF50')
  const colorScheme = ref<'light' | 'dark'>('light')

  function applyAccent(color: string) {
    const root = document.documentElement
    root.style.setProperty('--primary', color)
    root.style.setProperty('--primary-dark', darken(color, 20))
    localStorage.setItem(STORAGE_KEY_COLOR, color)
  }

  function applyScheme(scheme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', scheme)
    localStorage.setItem(STORAGE_KEY_SCHEME, scheme)
  }

  function setAccentColor(color: string) {
    accentColor.value = color
    applyAccent(color)
  }

  function setColorScheme(scheme: 'light' | 'dark') {
    colorScheme.value = scheme
    applyScheme(scheme)
  }

  // Darken a hex color by N percent
  function darken(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent))
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent))
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent))
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  // Load saved theme on init
  onMounted(() => {
    const savedColor = localStorage.getItem(STORAGE_KEY_COLOR)
    const savedScheme = localStorage.getItem(STORAGE_KEY_SCHEME) as 'light' | 'dark' | null

    if (savedColor) {
      accentColor.value = savedColor
      applyAccent(savedColor)
    }
    if (savedScheme) {
      colorScheme.value = savedScheme
      applyScheme(savedScheme)
    }
  })

  return { accentColor, colorScheme, setAccentColor, setColorScheme, PRESETS }
}

const PRESETS = [
  { name: 'Зелений',      value: '#4CAF50' },
  { name: 'Синій',        value: '#2196F3' },
  { name: 'Фіолетовий',   value: '#9C27B0' },
  { name: 'Помаранчевий', value: '#FF9800' },
  { name: 'Рожевий',      value: '#E91E63' },
  { name: 'Бірюзовий',    value: '#009688' },
  { name: 'Червоний',     value: '#F44336' },
  { name: 'Індиго',       value: '#3F51B5' },
]
```

### `style.css` — add dark theme support

```css
:root {
  --primary: #4CAF50;
  --primary-dark: #388E3C;
  --bg: #f5f5f5;
  --card: #ffffff;
  --text: #212121;
  --muted: #9e9e9e;
  --danger: #f44336;
  --border: #e0e0e0;
}

[data-theme="dark"] {
  --bg: #121212;
  --card: #1e1e1e;
  --text: #f5f5f5;
  --muted: #757575;
  --border: #2c2c2c;
  /* --primary stays as user set it */
}
```

### `components/ThemePanel.vue` — create this file

```vue
<template>
  <Transition name="theme-drop">
    <div v-if="isOpen" class="theme-panel" v-click-outside="close">
      <div class="theme-panel-header">
        <span class="theme-panel-title">{{ t('theme.title') }}</span>
        <button class="theme-close" @click="close">✕</button>
      </div>

      <!-- Preset swatches -->
      <div class="swatches">
        <button
          v-for="preset in PRESETS"
          :key="preset.value"
          class="swatch"
          :style="{ background: preset.color }"
          :title="preset.name"
          @click="setAccentColor(preset.value)"
        >
          <span v-if="accentColor === preset.value" class="swatch-check">✓</span>
        </button>
      </div>

      <!-- Custom color picker -->
      <label class="color-input-row">
        <span>{{ t('theme.custom') }}</span>
        <input
          type="color"
          :value="accentColor"
          @input="setAccentColor(($event.target as HTMLInputElement).value)"
        />
      </label>

      <!-- Light / Dark toggle -->
      <div class="scheme-toggle">
        <button
          class="scheme-btn"
          :class="{ active: colorScheme === 'light' }"
          :style="colorScheme === 'light' ? { background: accentColor, borderColor: accentColor, color: '#fff' } : {}"
          @click="setColorScheme('light')"
        >
          ☀️ {{ t('theme.light') }}
        </button>
        <button
          class="scheme-btn"
          :class="{ active: colorScheme === 'dark' }"
          :style="colorScheme === 'dark' ? { background: accentColor, borderColor: accentColor, color: '#fff' } : {}"
          @click="setColorScheme('dark')"
        >
          🌙 {{ t('theme.dark') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { useI18nStore } from '@/stores/i18n'
import { onClickOutside } from '@vueuse/core'
import { ref } from 'vue'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { accentColor, colorScheme, setAccentColor, setColorScheme, PRESETS } = useTheme()
const { t } = useI18nStore()
const panelEl = ref()

onClickOutside(panelEl, () => emit('close'))

function close() { emit('close') }
</script>
```

CSS for ThemePanel:
```css
.theme-panel {
  position: absolute;
  top: 60px;
  right: 12px;
  width: 260px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  z-index: 200;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

.theme-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.theme-panel-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}
.theme-close {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.swatch {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  color: white;
  font-weight: 700;
  transition: transform 150ms;
}
.swatch:active { transform: scale(0.88); }
.swatch-check { line-height: 1; }

.color-input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
}
.color-input-row input[type="color"] {
  width: 44px; height: 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0 2px;
}

.scheme-toggle {
  display: flex;
  gap: 8px;
}
.scheme-btn {
  flex: 1;
  padding: 8px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 150ms;
}

/* Drop-down animation */
.theme-drop-enter-active { transition: opacity 200ms ease, transform 200ms ease; }
.theme-drop-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.theme-drop-enter-from { opacity: 0; transform: translateY(-8px) scale(0.97); }
.theme-drop-leave-to  { opacity: 0; transform: translateY(-8px) scale(0.97); }
```

### `HomeView.vue` — add 🎨 button

```vue
<header class="app-header" style="position: relative;">
  <span class="app-title">🛒 Sunny Shop</span>
  <div class="header-actions">
    <button class="icon-btn" @click="isSearchOpen = true">🔍</button>
    <button class="icon-btn" @click="isThemeOpen = !isThemeOpen">🎨</button>
    <LangToggle />
  </div>
  <ThemePanel :is-open="isThemeOpen" @close="isThemeOpen = false" />
</header>
```

```ts
import { useTheme } from '@/composables/useTheme'

const isThemeOpen = ref(false)
const { accentColor } = useTheme() // ensures theme is applied on mount
```

### `App.vue` — init theme on startup

```ts
import { useTheme } from '@/composables/useTheme'

// Call useTheme() in App.vue setup so theme loads before first render
const { } = useTheme()
```

---

## i18n keys to add

```ts
// uk.ts
'theme.title':  'Тема',
'theme.custom': 'Свій колір',
'theme.light':  'Світла',
'theme.dark':   'Темна',

// ru.ts
'theme.title':  'Тема',
'theme.custom': 'Свой цвет',
'theme.light':  'Светлая',
'theme.dark':   'Тёмная',
```

---

## Files to create / modify

| File | Action |
|------|--------|
| `composables/useTheme.ts` | CREATE |
| `components/ThemePanel.vue` | CREATE |
| `HomeView.vue` | Add 🎨 button + ThemePanel, call useTheme() |
| `App.vue` | Call useTheme() on mount |
| `style.css` | Add `[data-theme="dark"]` block |
| `i18n/uk.ts` + `i18n/ru.ts` | Add theme.* keys |

Run `npm run build` after to verify no TypeScript errors.
