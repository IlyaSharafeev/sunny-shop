<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import { useProductsStore } from '@/stores/products'
import { useStoresStore } from '@/stores/userStores'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'
import { useI18nStore } from '@/stores/i18n'
import type { ShoppingSession } from '@/stores/history'

const props = defineProps<{
  session: ShoppingSession
  initialExpanded?: boolean
}>()

const productsStore = useProductsStore()
const storesStore = useStoresStore()
const sessionStore = useSessionStore()
const historyStore = useHistoryStore()
const i18n = useI18nStore()
const router = useRouter()

const cardEl = ref<HTMLElement>()
const expanded = ref(props.initialExpanded ?? false)
const isSharing = ref(false)

const formattedDate = computed(() => {
  const d = new Date(props.session.date)
  const dd = String(d.getDate()).padStart(2, '0')
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${MM}.${yyyy} ${HH}:${mm}`
})

const itemsByStore = computed(() => {
  const result: Array<{ store: { id: string; name: string; color: string }, items: Array<{ name: string; qty: number; unit: string }> }> = []
  for (const store of storesStore.allSorted) {
    const storeItems = props.session.items.flatMap(ci => {
      const product = productsStore.products.find(p => p.id === ci.productId)
      if (!product || product.storeId !== store.id) return []
      return [{ name: product.name, qty: ci.quantity, unit: product.unit }]
    })
    if (storeItems.length > 0) {
      result.push({ store, items: storeItems })
    }
  }
  return result
})

function getProductName(clientId: string): string {
  return productsStore.products.find(p => p.id === clientId || p.id === clientId)?.name ?? clientId
}

function getProductUnit(clientId: string): string {
  return productsStore.products.find(p => p.id === clientId)?.unit ?? ''
}

function itemsForStore(storeId: string) {
  return props.session.items.filter(item => {
    const product = productsStore.products.find(p => p.id === item.productId)
    return product?.storeId === storeId
  })
}

const storesWithItems = computed(() =>
  storesStore.allSorted.filter(store => itemsForStore(store.id).length > 0)
)

function handleDelete() {
  if (confirm(i18n.t('history.deleteConfirm'))) {
    historyStore.deleteSession(props.session.id)
    if ('vibrate' in navigator) navigator.vibrate([20, 50, 20])
  }
}

function handleRepeat() {
  sessionStore.loadFromSession(props.session.items)
  if ('vibrate' in navigator) navigator.vibrate([10, 40, 10])
  router.push('/')
}

function handleExportCsv() {
  const rows: string[] = ['Дата,Магазин,Товар,Кількість,Одиниця,Ціна']
  const date = formattedDate.value
  for (const store of storesWithItems.value) {
    for (const item of itemsForStore(store.id)) {
      const name = getProductName(item.productId).replace(/,/g, ' ')
      const unit = getProductUnit(item.productId)
      const price = item.price != null ? item.price.toFixed(2) : '0.00'
      rows.push(`"${date}","${store.name}","${name}",${item.quantity},"${unit}",${price}`)
    }
  }
  const csv = rows.join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zakup-${props.session.date.slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

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
      const filename = `zakup-${props.session.date.slice(0, 10)}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Закуп 🛒', files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
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
</script>

<template>
  <div ref="cardEl" class="history-card">
    <div class="card-header" @click="expanded = !expanded">
      <div class="header-left">
        <span class="date">{{ formattedDate }}</span>
        <span class="count">{{ i18n.t('history.items', { n: session.items.length }) }}</span>
      </div>
      <div class="card-actions-row">
        <button class="card-delete-btn" @click.stop="handleDelete" :title="i18n.t('history.deleteConfirm')">🗑</button>
        <span class="chevron" :class="{ open: expanded }">›</span>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="expanded" class="card-body">
        <div class="history-items">
          <div v-for="store in storesWithItems" :key="store.id">
            <div class="history-store-header" :style="{ borderLeftColor: store.color }">
              {{ store.name }}
            </div>
            <div
              v-for="item in itemsForStore(store.id)"
              :key="item.productId"
              class="history-item-row"
            >
              <div class="history-checkbox checked">✓</div>
              <span class="history-item-name">{{ getProductName(item.productId) }}</span>
              <span class="history-item-qty">{{ item.quantity }}</span>
              <span class="history-item-unit">{{ getProductUnit(item.productId) }}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="repeat-btn" @click.stop="handleRepeat">
            🔁 {{ i18n.t('history.repeat') }}
          </button>
          <button class="share-btn-small" @click.stop="handleExportCsv" title="Завантажити CSV">
            📥
          </button>
          <button class="share-btn-small" @click.stop="handleShare" :disabled="isSharing">
            {{ isSharing ? '⏳' : '📤' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.history-card {
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 8px;
}

.card-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  min-height: 56px;
  cursor: pointer;
  user-select: none;
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
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
}

.card-delete-btn:active {
  background: var(--danger);
  color: white;
  transform: scale(0.88);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.count {
  font-size: 12px;
  color: var(--muted);
}

.chevron {
  font-size: 22px;
  color: var(--muted);
  transition: transform 200ms ease;
  transform: rotate(0deg);
}

.chevron.open {
  transform: rotate(90deg);
}

.card-body {
  padding: 0 0 14px;
  border-top: 1px solid var(--border);
}

.history-items {
  margin-bottom: 8px;
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

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  padding: 0 16px;
}

.repeat-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.repeat-btn:active {
  background: rgba(76, 175, 80, 0.08);
  transform: scale(0.97);
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

.share-btn-small:active {
  transform: scale(0.92);
}

.share-btn-small:disabled {
  opacity: 0.5;
}

.expand-enter-active {
  transition: max-height 250ms ease, opacity 200ms ease;
  max-height: 600px;
  overflow: hidden;
}
.expand-leave-active {
  transition: max-height 200ms ease, opacity 150ms ease;
  max-height: 600px;
  overflow: hidden;
}
.expand-enter-from {
  max-height: 0;
  opacity: 0;
}
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
