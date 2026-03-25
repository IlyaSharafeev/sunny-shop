import { ref, onMounted } from 'vue'

const STORAGE_KEY_COLOR = 'theme-accent'
const STORAGE_KEY_SCHEME = 'theme-scheme'

export const PRESETS = [
  { name: 'Зелений',      value: '#4CAF50' },
  { name: 'Синій',        value: '#2196F3' },
  { name: 'Фіолетовий',   value: '#9C27B0' },
  { name: 'Помаранчевий', value: '#FF9800' },
  { name: 'Рожевий',      value: '#E91E63' },
  { name: 'Бірюзовий',    value: '#009688' },
  { name: 'Червоний',     value: '#F44336' },
  { name: 'Індиго',       value: '#3F51B5' },
]

// Module-level singletons — shared across all useTheme() calls
const accentColor = ref('#4CAF50')
const colorScheme = ref<'light' | 'dark'>('light')
let loaded = false

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent))
  const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function applyAccent(color: string) {
  document.documentElement.style.setProperty('--primary', color)
  document.documentElement.style.setProperty('--primary-dark', darken(color, 20))
  localStorage.setItem(STORAGE_KEY_COLOR, color)
}

function applyScheme(scheme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', scheme)
  localStorage.setItem(STORAGE_KEY_SCHEME, scheme)
}

export function useTheme() {
  // Load saved theme on first mount — runs only once across all components
  onMounted(() => {
    if (loaded) return
    loaded = true

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

  function setAccentColor(color: string) {
    accentColor.value = color
    applyAccent(color)
  }

  function setColorScheme(scheme: 'light' | 'dark') {
    colorScheme.value = scheme
    applyScheme(scheme)
  }

  return { accentColor, colorScheme, setAccentColor, setColorScheme, PRESETS }
}

// Standalone setters — safe to call outside component context (stores, etc.)
export function setAccentColorGlobal(color: string) {
  accentColor.value = color
  applyAccent(color)
}
export function setColorSchemeGlobal(scheme: 'light' | 'dark') {
  colorScheme.value = scheme
  applyScheme(scheme)
}
export { accentColor as themeAccentColor, colorScheme as themeColorScheme }
