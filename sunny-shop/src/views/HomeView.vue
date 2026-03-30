<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import confetti from 'canvas-confetti'
import { animate } from 'motion'
import type { AnimationOptions } from 'motion'
import { STORES, type StoreId, useProductsStore } from '@/stores/products'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'
import { useI18nStore } from '@/stores/i18n'
import { useSpringAnimate } from '@/composables/useSpringAnimate'
import { useShake } from '@/composables/useShake'
import { useStorage } from '@/composables/useStorage'
import StoreSection from '@/components/StoreSection.vue'
import ProductRow from '@/components/ProductRow.vue'
import LangToggle from '@/components/LangToggle.vue'
import ThemePanel from '@/components/ThemePanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AddProductModal from '@/components/AddProductModal.vue'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const sessionStore = useSessionStore()
const historyStore = useHistoryStore()
const productsStore = useProductsStore()
const i18n = useI18nStore()
const storage = useStorage()
const { bounceBadge, slideTabContent } = useSpringAnimate()

// ── Theme ─────────────────────────────────────────────────────────
useTheme() // ensures theme is applied on mount
const isThemeOpen = ref(false)

// ── Active store tab ──────────────────────────────────────────────
const activeStoreId = ref<StoreId>(
  (storage.get<StoreId>('activeStore')) ?? 'zhanet'
)

const activeStore = computed(() => STORES.find(s => s.id === activeStoreId.value)!)

// ── Refs ──────────────────────────────────────────────────────────
const tabsEl = ref<HTMLElement>()
const storeContentEl = ref<HTMLElement>()
const countBadgeEl = ref<HTMLElement>()
const fabEl = ref<HTMLButtonElement>()

// ── FAB ───────────────────────────────────────────────────────────
const isAddModalOpen = ref(false)

function openAddModal() {
  if (fabEl.value) {
    animate(
      fabEl.value,
      { scale: [1, 0.88, 1.12, 1] },
      { type: 'spring', stiffness: 400, damping: 20 } as AnimationOptions
    )
  }
  isAddModalOpen.value = true
  if ('vibrate' in navigator) navigator.vibrate(10)
}

// ── Tab switching ─────────────────────────────────────────────────
let prevStoreIndex = STORES.findIndex(s => s.id === activeStoreId.value)

function switchTab(storeId: StoreId) {
  const newIndex = STORES.findIndex(s => s.id === storeId)
  const direction = newIndex > prevStoreIndex ? 60 : -60
  prevStoreIndex = newIndex

  activeStoreId.value = storeId
  storage.set('activeStore', storeId)

  nextTick(() => {
    // Scroll active tab into view
    const activeTab = tabsEl.value?.querySelector('.store-tab.active') as HTMLElement | null
    activeTab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })

    if (storeContentEl.value) {
      slideTabContent(storeContentEl.value, direction)
    }
    const rows = storeContentEl.value?.querySelectorAll<HTMLElement>('.product-row')
    if (rows && rows.length) {
      const sp = useSpringAnimate()
      sp.slideInRows(Array.from(rows))
    }
  })
}

// ── On mount ──────────────────────────────────────────────────────
onMounted(() => {
  nextTick(() => {
    // Scroll active tab into view
    const activeTab = tabsEl.value?.querySelector('.store-tab.active') as HTMLElement | null
    activeTab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })

    if (storeContentEl.value) {
      const rows = storeContentEl.value.querySelectorAll<HTMLElement>('.product-row')
      if (rows.length) {
        const sp = useSpringAnimate()
        sp.slideInRows(Array.from(rows))
      }
    }

    // Sort persistence
    const saved = localStorage.getItem('sortMode')
    if (saved === 'alpha' || saved === 'frequency') sortMode.value = saved
  })
})

// ── Animate badge on checkedCount change ──────────────────────────
watch(() => sessionStore.checkedCount, () => {
  if (countBadgeEl.value) bounceBadge(countBadgeEl.value)
})

// ── Search ────────────────────────────────────────────────────────
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

const searchResults = computed(() => {
  if (searchQuery.value.length < 2) return []
  const q = searchQuery.value.toLowerCase().trim()
  return productsStore.products.filter(p => p.name.toLowerCase().includes(q))
})

const isSearching = computed(() => searchQuery.value.length >= 2)

function handleSearchDelete(id: string) {
  productsStore.deleteProduct(id)
}

// ── Sort ──────────────────────────────────────────────────────────
const sortMode = ref<'default' | 'alpha' | 'frequency'>('default')
watch(sortMode, (v) => localStorage.setItem('sortMode', v))

// ── Dialogs ───────────────────────────────────────────────────────
const showClearConfirm = ref(false)
const showShakeClearDialog = ref(false)

function handleClear() {
  showClearConfirm.value = false
  sessionStore.clearCurrent()
}

function handleShakeClear() {
  showShakeClearDialog.value = false
  sessionStore.clearCurrent()
}

// ── Feature 1: Confetti on finish ─────────────────────────────────
async function handleFinish() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.7 },
    colors: ['#4CAF50', '#FF9800', '#e91e63', '#1565c0', '#2e7d32', '#fff'],
    disableForReducedMotion: true,
  })

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.6 },
      startVelocity: 20,
      colors: ['#4CAF50', '#FF9800', '#ffffff'],
      disableForReducedMotion: true,
    })
  }, 200)

  if ('vibrate' in navigator) navigator.vibrate([30, 50, 30, 50, 60])

  await new Promise<void>(resolve => setTimeout(resolve, 600))

  sessionStore.finishSession()
  router.push('/history')
}

// ── Feature 2: Repeat last purchase ───────────────────────────────
function repeatLast() {
  const last = historyStore.lastSession
  if (last) {
    sessionStore.loadFromSession(last.items)
    if ('vibrate' in navigator) navigator.vibrate([10, 40, 10])
  }
}

// ── Shake to clear ────────────────────────────────────────────────
const { shakeDetected } = useShake()
watch(shakeDetected, (v) => {
  if (v && sessionStore.checkedCount > 0) {
    showShakeClearDialog.value = true
  }
})
</script>

<template>
  <div class="home">
    <!-- Fixed top header -->
    <header class="top-header">
      <span class="app-title">{{ i18n.t('app.title') }}</span>
      <div class="header-actions">
        <button class="icon-btn" @click="openSearch" :aria-label="i18n.t('search.placeholder')">🔍</button>
        <button class="icon-btn" @click="isThemeOpen = !isThemeOpen" :aria-label="i18n.t('theme.title')">🎨</button>
        <LangToggle />
      </div>
      <ThemePanel :is-open="isThemeOpen" @close="isThemeOpen = false" />
    </header>

    <!-- Search bar — slides in below header, replaces tabs -->
    <Transition name="search-slide">
      <div v-if="isSearchOpen" class="search-bar">
        <input
          ref="searchInputEl"
          v-model="searchQuery"
          type="search"
          :placeholder="i18n.t('search.placeholder')"
          class="search-input"
          @keyup.escape="closeSearch"
        />
        <button class="search-close" @click="closeSearch">✕</button>
      </div>
    </Transition>

    <!-- Sticky tab bar — hidden when search is open -->
    <div v-if="!isSearchOpen" ref="tabsEl" class="store-tabs">
      <button
        v-for="store in STORES"
        :key="store.id"
        class="store-tab"
        :class="{ active: activeStoreId === store.id }"
        :style="{ '--tab-color': store.color } as any"
        @click="switchTab(store.id)"
      >
        {{ store.name }}
      </button>
    </div>

    <!-- Sort bar — hidden when search is open -->
    <div v-if="!isSearchOpen" class="sort-bar">
      <button
        class="sort-btn"
        :class="{ active: sortMode === 'default' }"
        @click="sortMode = 'default'"
      >
        {{ i18n.t('sort.default') }}
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
        ★ {{ i18n.t('sort.frequency') }}
      </button>
    </div>

    <!-- Content area -->
    <main class="content">
      <!-- Search results -->
      <div v-if="isSearching" class="search-results">
        <div v-if="searchResults.length === 0" class="search-empty">
          {{ i18n.t('search.noResults') }}
        </div>
        <template v-for="store in STORES" :key="store.id">
          <template v-if="searchResults.filter(p => p.storeId === store.id).length > 0">
            <div
              class="search-store-header"
              :style="{ borderLeftColor: store.color }"
            >
              {{ store.name }}
            </div>
            <ProductRow
              v-for="product in searchResults.filter(p => p.storeId === store.id)"
              :key="product.id"
              :product="product"
              @delete="handleSearchDelete"
            />
          </template>
        </template>
      </div>

      <!-- Normal store tab content -->
      <div v-else ref="storeContentEl" class="store-content store-tabs-content">
        <StoreSection :key="activeStoreId" :store="activeStore" :sort-mode="sortMode" />
      </div>
    </main>

    <!-- Fixed bottom action bar -->
    <div class="bottom-bar">
      <button
        class="btn-clear"
        :disabled="sessionStore.checkedCount === 0"
        @click="showClearConfirm = true"
      >
        {{ i18n.t('home.clearAll') }}
      </button>

      <span ref="countBadgeEl" class="count-pill" style="will-change: transform;">
        {{ i18n.t('home.selected', { n: sessionStore.checkedCount }) }}
      </span>

      <div class="bottom-right-actions">
        <!-- Feature 2: repeat last when list is empty -->
        <button
          v-if="sessionStore.checkedCount === 0 && historyStore.lastSession"
          class="repeat-last-btn"
          @click="repeatLast"
        >
          🔁 {{ i18n.t('home.repeatLast') }}
        </button>

        <button
          v-else
          class="btn-finish"
          :disabled="sessionStore.checkedCount === 0"
          @click="handleFinish"
        >
          {{ i18n.t('home.finish') }}
        </button>
      </div>
    </div>

    <!-- FAB — floating add button -->
    <button ref="fabEl" class="fab" @click="openAddModal" aria-label="Додати продукт">
      <span class="fab-icon">＋</span>
    </button>

    <!-- Add product modal -->
    <AddProductModal
      v-if="isAddModalOpen"
      :preselected-store-id="activeStoreId"
      @close="isAddModalOpen = false"
    />

    <!-- Confirm: clear all -->
    <ConfirmDialog
      :visible="showClearConfirm"
      :message="i18n.t('home.clearConfirm')"
      @confirm="handleClear"
      @cancel="showClearConfirm = false"
    />

    <!-- Confirm: shake to clear -->
    <ConfirmDialog
      :visible="showShakeClearDialog"
      :message="i18n.t('home.shakeConfirm')"
      @confirm="handleShakeClear"
      @cancel="showShakeClearDialog = false"
    />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* ── Fixed header ── */
.top-header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 60px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  gap: 8px;
  z-index: 20;
}

.app-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.icon-btn:active {
  background: var(--bg);
}

/* ── Search bar ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 60px;
  z-index: 15;
  margin-top: 60px;
  overflow: hidden;
}

.search-input {
  flex: 1;
  height: 38px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  padding: 0 16px;
  font-size: 15px;
  background: var(--bg);
  color: var(--text);
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
  flex-shrink: 0;
}

/* Search slide transition */
.search-slide-enter-active { transition: max-height 200ms ease, opacity 200ms ease; }
.search-slide-leave-active { transition: max-height 150ms ease, opacity 150ms ease; }
.search-slide-enter-from   { max-height: 0; opacity: 0; }
.search-slide-leave-to     { max-height: 0; opacity: 0; }
.search-slide-enter-to     { max-height: 60px; }

/* ── Search results ── */
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

/* ── Tab bar ── */
.store-tabs {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  position: sticky;
  top: 60px;
  z-index: 15;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  margin-top: 60px;
  gap: 0;
}

.store-tabs::-webkit-scrollbar {
  display: none;
}

.store-tab {
  flex: 0 0 auto;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  scroll-snap-align: start;
  color: var(--muted);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 3px solid transparent;
  transition: color 150ms ease, border-color 150ms ease;
  min-height: 44px;
}

.store-tab.active {
  color: var(--tab-color);
  border-bottom-color: var(--tab-color);
}

/* ── Sort bar ── */
.sort-bar {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.sort-bar::-webkit-scrollbar {
  display: none;
}

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
  transition: all 150ms ease;
}

.sort-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* ── Scrollable content ── */
.content {
  padding: 0 0 calc(64px + 64px + env(safe-area-inset-bottom)) 0;
}

.store-content {
  will-change: transform, opacity;
}

/* ── Bottom action bar ── */
.bottom-bar {
  position: fixed;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 64px;
  background: var(--card);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 12px;
  z-index: 50;
}

.btn-clear {
  min-height: 44px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--muted);
  flex-shrink: 0;
}

.btn-clear:disabled {
  opacity: 0.4;
}

.count-pill {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.btn-finish {
  min-height: 44px;
  padding: 0 16px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}

.btn-finish:disabled {
  opacity: 0.4;
}

.bottom-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.repeat-last-btn {
  min-height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}

/* ── FAB ── */
.fab {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom) + 65px);
  right: calc(50% - 240px + 16px);
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

@media (max-width: 480px) {
  .fab {
    right: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .store-tab,
  .sort-btn {
    transition: none;
  }
}
</style>
