<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import confetti from 'canvas-confetti'
import { animate } from 'motion'
import type { AnimationOptions } from 'motion'
import { type StoreId, useProductsStore } from '@/stores/products'
import { useStoresStore } from '@/stores/userStores'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'
import { useI18nStore } from '@/stores/i18n'
import { useSpringAnimate } from '@/composables/useSpringAnimate'
import { useShake } from '@/composables/useShake'
import { useStorage } from '@/composables/useStorage'
import StoreSection from '@/components/StoreSection.vue'
import ProductRow from '@/components/ProductRow.vue'
import LangToggle from '@/components/LangToggle.vue'
import ProfileAvatar from '@/components/ProfileAvatar.vue'
import ThemePanel from '@/components/ThemePanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AddProductModal from '@/components/AddProductModal.vue'
import StoreManagerModal from '@/components/StoreManagerModal.vue'
import { useTheme } from '@/composables/useTheme'
import { useSyncStatus } from '@/composables/useSyncStatus'
import { useOnlineStatus } from '@/composables/useOnlineStatus'
import { useShareSession } from '@/composables/useShareSession'
import { useToast } from '@/composables/useToast'

const { status: syncStatus } = useSyncStatus()
const { isOnline } = useOnlineStatus()

const router = useRouter()
const sessionStore = useSessionStore()
const historyStore = useHistoryStore()
const productsStore = useProductsStore()
const storesStore = useStoresStore()
const i18n = useI18nStore()
const storage = useStorage()
const { bounceBadge, slideTabContent } = useSpringAnimate()

// ── Theme ─────────────────────────────────────────────────────────
useTheme() // ensures theme is applied on mount
const isThemeOpen = ref(false)

// ── Store manager modal ───────────────────────────────────────────
const isStoreManagerOpen = ref(false)

// ── Active store tab ──────────────────────────────────────────────
const activeStoreId = ref<StoreId>(
  storage.get<StoreId>('activeStore') ?? 'zhanet'
)

const activeStore = computed(
  () => storesStore.visibleStores.find(s => s.id === activeStoreId.value)
     ?? storesStore.visibleStores[0]
     ?? { id: 'zhanet', name: 'Жанет', color: '#e91e63', emoji: '🌸' }
)

// If the active store gets hidden, switch to the first visible one
watch(
  () => storesStore.visibleStores,
  (visible) => {
    if (!visible.find(s => s.id === activeStoreId.value) && visible.length > 0) {
      const first = visible[0]
      if (first) switchTab(first.id)
    }
  }
)

// ── Refs ──────────────────────────────────────────────────────────
const tabsEl = ref<HTMLElement>()
const storeContentEl = ref<HTMLElement>()
const countBadgeEl = ref<HTMLElement>()
const fabEl = ref<HTMLButtonElement>()
const storeSectionRef = ref<InstanceType<typeof StoreSection>>()

function scrollToChecked() {
  storeSectionRef.value?.scrollToChecked()
}

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
let prevStoreIndex = storesStore.visibleStores.findIndex(s => s.id === activeStoreId.value)

function switchTab(storeId: StoreId) {
  const visible = storesStore.visibleStores
  const newIndex = visible.findIndex(s => s.id === storeId)
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

// ── Share session ─────────────────────────────────────────────────
const shareSession = useShareSession()
const toast = useToast()
const showShareModal = ref(false)
const shareJoinCode = ref('')
const shareJoinLoading = ref(false)
const shareJoinError = ref('')
const shareCreating = ref(false)
const shareCreatedCode = ref('')

// Check URL for share code on mount
onMounted(() => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('share')
  if (code) {
    shareJoinCode.value = code
    showShareModal.value = true
    // Clean URL
    url.searchParams.delete('share')
    window.history.replaceState({}, '', url.toString())
  }
})

async function openShare() {
  showShareModal.value = true
  if (!shareSession.isOwner.value && !shareSession.isActive.value) {
    await startSharing()
  }
}

async function startSharing() {
  shareCreating.value = true
  try {
    const code = await shareSession.createShare()
    shareCreatedCode.value = code
    connectAsOwner(code)
  } catch {
    toast.error('Не вдалося створити посилання')
  } finally {
    shareCreating.value = false
  }
}

function connectAsOwner(code: string) {
  shareSession.connect(code, {
    onUpdate: (items) => sessionStore.enterSharedMode(items),
  })
}

async function joinSharedSession() {
  if (!shareJoinCode.value.trim()) return
  shareJoinLoading.value = true
  shareJoinError.value = ''
  try {
    await shareSession.validateCode(shareJoinCode.value.trim().toUpperCase())
    shareSession.connect(shareJoinCode.value.trim().toUpperCase(), {
      onUpdate: (items) => sessionStore.enterSharedMode(items),
    })
    showShareModal.value = false
    toast.success('Приєднано до спільного закупу!')
  } catch {
    shareJoinError.value = 'Невірний або прострочений код'
  } finally {
    shareJoinLoading.value = false
  }
}

function copyShareLink() {
  const url = shareSession.getShareUrl(shareCreatedCode.value)
  navigator.clipboard.writeText(url).then(() => toast.success('Посилання скопійовано!'))
}

function leaveShare() {
  shareSession.disconnect()
  sessionStore.exitSharedMode()
  showShareModal.value = false
  shareCreatedCode.value = ''
}

function closeShareModal() {
  showShareModal.value = false
}

// Session actions — go through WS when in shared mode
function handleToggle(productId: string) {
  if (sessionStore.isSharedMode) {
    const price = sessionStore.getPrice.value(productId)
    shareSession.toggle(productId, price)
  } else {
    sessionStore.toggle(productId)
  }
}

function handleUpdateQty(productId: string, qty: number) {
  if (sessionStore.isSharedMode) {
    shareSession.setQty(productId, qty)
  } else {
    sessionStore.updateQty(productId, qty)
  }
}

function handleUpdatePrice(productId: string, price: number) {
  if (sessionStore.isSharedMode) {
    shareSession.setPrice(productId, price)
  } else {
    sessionStore.updatePrice(productId, price)
  }
}
</script>

<template>
  <div class="home">
    <!-- Fixed top header -->
    <header class="top-header">
      <span class="app-title">{{ i18n.t('app.title') }}</span>
      <div class="header-actions">
        <!-- Sync / online status indicator -->
        <span
          class="sync-dot"
          :class="{
            'sync-dot--syncing': syncStatus === 'syncing',
            'sync-dot--synced':  syncStatus === 'synced',
            'sync-dot--error':   syncStatus === 'error' || !isOnline,
          }"
          :title="!isOnline ? 'Офлайн' : syncStatus === 'syncing' ? 'Синхронізація...' : syncStatus === 'error' ? 'Помилка синхронізації' : ''"
        />
        <button class="icon-btn" @click="openSearch" :aria-label="i18n.t('search.placeholder')">🔍</button>
        <button class="icon-btn share-icon-btn" :class="{ active: shareSession.isActive.value }" @click="openShare" title="Спільний закуп">👥</button>
        <button class="icon-btn" @click="isThemeOpen = !isThemeOpen" :aria-label="i18n.t('theme.title')">🎨</button>
        <LangToggle />
        <ProfileAvatar id="onb-profile-avatar" />
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
        v-for="store in storesStore.visibleStores"
        :key="store.id"
        class="store-tab"
        :class="{ active: activeStoreId === store.id }"
        :style="{ '--tab-color': store.color } as any"
        @click="switchTab(store.id)"
      >
        {{ store.name }}
      </button>
      <button
        id="onb-store-manage"
        class="store-tab manage-btn"
        :title="'Управління магазинами'"
        @click="isStoreManagerOpen = true"
      >⚙</button>
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

    <!-- Shared mode banner -->
    <div v-if="shareSession.isActive.value" class="shared-banner">
      <span class="shared-banner-icon">👥</span>
      <span class="shared-banner-text">
        <template v-if="shareSession.isOwner.value">Спільний закуп</template>
        <template v-else>Закуп з {{ shareSession.ownerName.value }}</template>
        <span class="shared-count" v-if="shareSession.participantCount.value > 1"> · {{ shareSession.participantCount.value }} осіб</span>
      </span>
      <button class="shared-leave-btn" @click="leaveShare">Вийти</button>
    </div>

    <!-- Content area -->
    <main class="content">
      <!-- Search results -->
      <div v-if="isSearching" class="search-results">
        <div v-if="searchResults.length === 0" class="search-empty">
          {{ i18n.t('search.noResults') }}
        </div>
        <template v-for="store in storesStore.allSorted" :key="store.id">
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
      <div v-else id="onb-store-content" ref="storeContentEl" class="store-content store-tabs-content">
        <StoreSection ref="storeSectionRef" :key="activeStoreId" :store="activeStore" :sort-mode="sortMode" />
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

      <div class="center-info">
        <button
          id="onb-count-pill"
          ref="countBadgeEl"
          class="count-pill"
          style="will-change: transform;"
          :title="sessionStore.checkedCount > 0 ? 'Перейти до відмічених' : ''"
          @click="scrollToChecked"
        >
          {{ i18n.t('home.selected', { n: sessionStore.checkedCount }) }}
        </button>
        <span v-if="sessionStore.totalCost > 0" class="total-cost">
          ₴ {{ sessionStore.totalCost.toFixed(2) }}
        </span>
      </div>

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

    <!-- Store manager modal -->
    <StoreManagerModal
      v-if="isStoreManagerOpen"
      @close="isStoreManagerOpen = false"
    />

    <!-- Share session modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showShareModal" class="share-modal-overlay" @click.self="closeShareModal">
          <div class="share-modal">
            <div class="share-modal-header">
              <span class="share-modal-title">👥 Спільний закуп</span>
              <button class="share-modal-close" @click="closeShareModal">✕</button>
            </div>

            <!-- Active as owner — show code -->
            <template v-if="shareSession.isOwner.value && shareSession.isActive.value">
              <p class="share-modal-desc">Поділіться кодом або посиланням з іншою людиною</p>
              <div class="share-code-box">
                <span class="share-code">{{ shareCreatedCode }}</span>
              </div>
              <div class="share-actions">
                <button class="share-btn-primary" @click="copyShareLink">📋 Скопіювати посилання</button>
              </div>
              <div v-if="shareSession.participantCount.value > 1" class="share-participants">
                <span class="share-participants-label">Онлайн: {{ shareSession.participantCount.value }} осіб</span>
              </div>
              <button class="share-btn-danger" @click="leaveShare">Зупинити спільний закуп</button>
            </template>

            <!-- Active as joiner -->
            <template v-else-if="shareSession.isActive.value && !shareSession.isOwner.value">
              <p class="share-modal-desc">Ви в спільному закупі з <b>{{ shareSession.ownerName.value }}</b></p>
              <button class="share-btn-danger" @click="leaveShare">Вийти з закупу</button>
            </template>

            <!-- Not active — show join/create -->
            <template v-else>
              <!-- Join by code -->
              <div class="share-section">
                <p class="share-section-label">Приєднатися за кодом</p>
                <div class="share-join-row">
                  <input
                    v-model="shareJoinCode"
                    class="share-code-input"
                    placeholder="Введіть код (напр. A3F9B2C1)"
                    maxlength="8"
                    @keyup.enter="joinSharedSession"
                  />
                  <button class="share-btn-primary" :disabled="shareJoinLoading || !shareJoinCode.trim()" @click="joinSharedSession">
                    {{ shareJoinLoading ? '...' : 'Приєднатися' }}
                  </button>
                </div>
                <p v-if="shareJoinError" class="share-error">{{ shareJoinError }}</p>
              </div>

              <div class="share-divider">або</div>

              <!-- Create share -->
              <div class="share-section">
                <p class="share-section-label">Поділитися своїм закупом</p>
                <button class="share-btn-primary" :disabled="shareCreating" @click="startSharing">
                  {{ shareCreating ? 'Створюємо...' : '🔗 Створити посилання' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

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
  max-width: 960px;
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

@media (min-width: 768px) {
  .top-header {
    top: 64px; /* below top nav */
  }
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

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
  transition: background 300ms ease;
}
.sync-dot--syncing {
  background: #fb8c00;
  animation: pulse 1s infinite;
}
.sync-dot--synced {
  background: #43a047;
}
.sync-dot--error {
  background: #e53935;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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

@media (min-width: 768px) {
  .search-bar {
    top: 124px;
    margin-top: 124px;
  }
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

@media (min-width: 768px) {
  .store-tabs {
    top: 124px;
    margin-top: 124px;
  }
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

.manage-btn {
  color: var(--muted);
  font-size: 16px;
  flex-shrink: 0;
  border-bottom-color: transparent !important;
}

.manage-btn:active {
  background: var(--bg);
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

@media (min-width: 768px) {
  .content {
    padding: 0 0 80px 0;
  }
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
  max-width: 960px;
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

@media (min-width: 768px) {
  .bottom-bar {
    bottom: 0;
  }
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

.center-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
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

.total-cost {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
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
  right: calc(50% - 480px + 16px);
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

@media (max-width: 960px) {
  .fab {
    right: 16px;
  }
}

@media (min-width: 768px) {
  .fab {
    bottom: calc(64px + 16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .store-tab,
  .sort-btn {
    transition: none;
  }
}

/* ── Share session ────────────────────────────────────────────────── */
.share-icon-btn.active {
  color: var(--primary);
}

.shared-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: color-mix(in srgb, var(--primary) 15%, var(--card));
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 30%, var(--border));
  font-size: 13px;
}

.shared-banner-icon { font-size: 16px; }

.shared-banner-text {
  flex: 1;
  color: var(--text);
  font-weight: 500;
}

.shared-count { color: var(--muted); font-weight: 400; }

.shared-leave-btn {
  font-size: 12px;
  color: var(--danger);
  font-weight: 600;
  padding: 4px 10px;
  border: 1px solid var(--danger);
  border-radius: 8px;
}

/* Modal */
.share-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom);
}

.share-modal {
  background: var(--card);
  border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.share-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.share-modal-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.share-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-modal-desc {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

.share-code-box {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.share-code {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 6px;
  color: var(--primary);
  font-family: monospace;
}

.share-actions { display: flex; gap: 8px; }

.share-btn-primary {
  flex: 1;
  min-height: 44px;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.share-btn-primary:disabled {
  opacity: 0.5;
}

.share-btn-danger {
  width: 100%;
  min-height: 44px;
  color: var(--danger);
  font-size: 14px;
  font-weight: 600;
  border: 1px solid var(--danger);
  border-radius: 12px;
}

.share-participants {
  text-align: center;
  font-size: 13px;
  color: var(--primary);
}

.share-section { display: flex; flex-direction: column; gap: 8px; }

.share-section-label {
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
  margin: 0;
}

.share-join-row {
  display: flex;
  gap: 8px;
}

.share-code-input {
  flex: 1;
  height: 44px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  padding: 0 12px;
  outline: none;
  font-family: monospace;
  text-transform: uppercase;
}

.share-code-input:focus { border-color: var(--primary); }

.share-error { font-size: 12px; color: var(--danger); margin: 0; }

.share-divider {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  position: relative;
}

.share-divider::before,
.share-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: var(--border);
}

.share-divider::before { left: 0; }
.share-divider::after { right: 0; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 200ms ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
