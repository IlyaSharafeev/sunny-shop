<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useProductsStore } from '@/stores/products'
import { useStoresStore } from '@/stores/userStores'
import { useExchangeRates } from '@/composables/useExchangeRates'
import { useI18nStore } from '@/stores/i18n'
import ConfirmDialog from './ConfirmDialog.vue'

const sessionStore = useSessionStore()
const productsStore = useProductsStore()
const storesStore = useStoresStore()
const i18n = useI18nStore()
const { rates, fetchRates } = useExchangeRates()

onMounted(fetchRates)

const expanded = ref(true)
const showFinishConfirm = ref(false)
const showCancelConfirm = ref(false)

// Per-store collapse state: true = collapsed (all collapsed by default)
const collapsedStores = ref<Record<string, boolean>>({})

function isStoreCollapsed(storeId: string) {
  return collapsedStores.value[storeId] ?? true
}

function toggleStore(storeId: string) {
  collapsedStores.value[storeId] = !isStoreCollapsed(storeId)
}

const checkedCount = computed(() => sessionStore.checkedCount)
const totalUAH = computed(() => sessionStore.totalCost)
const totalEUR = computed(() => totalUAH.value * rates.value.EUR)
const totalUSD = computed(() => totalUAH.value * rates.value.USD)

const storeGroups = computed(() =>
  storesStore.allSorted
    .map(store => ({
      store,
      products: productsStore.products.filter(p => p.storeId === store.id && !p.isReminder),
    }))
    .filter(g => g.products.length > 0)
)

function isChecked(productId: string) {
  return sessionStore.isChecked(productId)
}

function getQty(productId: string) {
  return sessionStore.getQty(productId)
}

function getPrice(productId: string) {
  return sessionStore.getPrice(productId)
}

function toggle(productId: string) {
  sessionStore.toggle(productId)
  if ('vibrate' in navigator) navigator.vibrate([10])
}

function decQty(productId: string) {
  sessionStore.updateQty(productId, getQty(productId) - 1)
  if ('vibrate' in navigator) navigator.vibrate([8])
}

function incQty(productId: string) {
  sessionStore.updateQty(productId, getQty(productId) + 1)
  if ('vibrate' in navigator) navigator.vibrate([8])
}

function handlePriceInput(productId: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  sessionStore.updatePrice(productId, isNaN(val) ? 0 : val)
}

function handleFinish() {
  showFinishConfirm.value = false
  sessionStore.finishSession()
}

function handleCancel() {
  showCancelConfirm.value = false
  sessionStore.clearCurrent()
}

function fmt(n: number) {
  return n.toFixed(2)
}
</script>

<template>
  <div class="current-card">
    <!-- Header -->
    <div class="current-header" @click="expanded = !expanded">
      <div class="current-header-left">
        <span class="current-title">🛒 Поточний закуп</span>
        <span class="current-meta">
          <span class="checked-badge" v-if="checkedCount > 0">{{ checkedCount }} відмічено</span>
          <span class="checked-badge empty" v-else>список порожній</span>
        </span>
      </div>
      <span class="chevron" :class="{ open: expanded }">›</span>
    </div>

    <!-- Total costs — always visible when there are checked items -->
    <div class="totals-row" v-if="checkedCount > 0">
      <div class="total-item">
        <span class="total-currency">₴</span>
        <span class="total-value">{{ fmt(totalUAH) }}</span>
      </div>
      <div class="total-divider" />
      <div class="total-item">
        <span class="total-currency">€</span>
        <span class="total-value">{{ fmt(totalEUR) }}</span>
      </div>
      <div class="total-divider" />
      <div class="total-item">
        <span class="total-currency">$</span>
        <span class="total-value">{{ fmt(totalUSD) }}</span>
      </div>
    </div>

    <!-- Expandable product list -->
    <Transition name="expand">
      <div v-if="expanded" class="current-body">
        <div v-for="group in storeGroups" :key="group.store.id" class="store-group">
          <!-- Store header — tap to collapse that store -->
          <div
            class="store-header"
            :style="{ borderLeftColor: group.store.color }"
            @click="toggleStore(group.store.id)"
          >
            <span>{{ group.store.emoji }} {{ group.store.name }}</span>
            <span class="store-chevron" :class="{ open: !isStoreCollapsed(group.store.id) }">›</span>
          </div>

          <template v-if="!isStoreCollapsed(group.store.id)">
            <div
              v-for="product in group.products"
              :key="product.id"
              class="product-line"
              :class="{ 'is-checked': isChecked(product.id) }"
              @click="toggle(product.id)"
            >
              <!-- Checkbox -->
              <div class="line-checkbox" :class="{ active: isChecked(product.id) }">
                <span v-if="isChecked(product.id)">✓</span>
              </div>

              <!-- Name -->
              <span class="line-name">{{ product.name }}</span>

              <!-- Unit (hidden when checked — space taken by controls) -->
              <span v-if="!isChecked(product.id)" class="line-unit">
                {{ i18n.t(`unit.${product.unit}`) }}
              </span>

              <!-- Qty + Price for checked items -->
              <div v-if="isChecked(product.id)" class="line-controls" @click.stop>
                <div class="qty-row">
                  <button class="qty-btn" @click="decQty(product.id)">−</button>
                  <span class="qty-val">{{ getQty(product.id) }}</span>
                  <button class="qty-btn" @click="incQty(product.id)">＋</button>
                  <span class="unit-small">{{ i18n.t(`unit.${product.unit}`) }}</span>
                </div>
                <div class="price-row">
                  <span class="price-symbol">₴</span>
                  <input
                    class="price-input"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    :value="getPrice(product.id) || ''"
                    @change="handlePriceInput(product.id, $event)"
                    @click.stop
                  />
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Actions -->
    <div class="current-actions">
      <button
        class="btn-finish"
        :disabled="checkedCount === 0"
        @click="showFinishConfirm = true"
      >
        ✓ Завершити закуп
      </button>
      <button
        v-if="checkedCount > 0"
        class="btn-cancel"
        @click="showCancelConfirm = true"
      >
        Скасувати
      </button>
    </div>

    <ConfirmDialog
      :visible="showFinishConfirm"
      message="Зберегти закуп в історію та очистити список?"
      @confirm="handleFinish"
      @cancel="showFinishConfirm = false"
    />

    <ConfirmDialog
      :visible="showCancelConfirm"
      message="Очистити поточний закуп без збереження?"
      @confirm="handleCancel"
      @cancel="showCancelConfirm = false"
    />
  </div>
</template>

<style scoped>
.current-card {
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.12);
  border: 1.5px solid var(--primary);
  margin-bottom: 16px;
}

.current-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  min-height: 56px;
  cursor: pointer;
  user-select: none;
}

.current-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.current-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.checked-badge {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--primary);
  border-radius: 10px;
  padding: 1px 8px;
  align-self: flex-start;
}

.checked-badge.empty {
  background: var(--muted);
  font-weight: 400;
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

/* Totals */
.totals-row {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(76, 175, 80, 0.06);
  border-top: 1px solid rgba(76, 175, 80, 0.15);
  border-bottom: 1px solid rgba(76, 175, 80, 0.15);
}

.total-item {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex: 1;
  justify-content: center;
}

.total-currency {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.total-value {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.total-divider {
  width: 1px;
  height: 28px;
  background: var(--border);
}

/* Product list */
.current-body {
  border-top: 1px solid var(--border);
}

/* Store header */
.store-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 6px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  border-left: 3px solid transparent;
  background: var(--bg);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  user-select: none;
  min-height: 32px;
}

.store-chevron {
  font-size: 16px;
  color: var(--muted);
  transition: transform 200ms ease;
  transform: rotate(0deg);
}

.store-chevron.open {
  transform: rotate(90deg);
}

/* Product row */
.product-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  transition: background 120ms ease;
}

.product-line:active {
  background: rgba(0,0,0,0.04);
}

.product-line.is-checked {
  opacity: 0.6;
}

.line-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: white;
  transition: background 150ms ease, border-color 150ms ease;
}

.line-checkbox.active {
  background: var(--primary);
  border-color: var(--primary);
}

.line-name {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  min-width: 0;
}

.product-line.is-checked .line-name {
  text-decoration: line-through;
  color: var(--muted);
}

.line-unit {
  font-size: 11px;
  color: var(--muted);
  flex-shrink: 0;
}

/* Controls for checked items */
.line-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.qty-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 15px;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}

.qty-btn:active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: scale(0.9);
}

.qty-val {
  min-width: 18px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.unit-small {
  font-size: 10px;
  color: var(--muted);
}

.price-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.price-symbol {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}

.price-input {
  width: 52px;
  height: 22px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  text-align: center;
  padding: 0 4px;
  outline: none;
}

.price-input:focus {
  border-color: var(--primary);
}

.price-input::-webkit-inner-spin-button,
.price-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

/* Actions */
.current-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.btn-finish {
  min-height: 44px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
  transition: opacity 150ms ease;
}

.btn-finish:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-cancel {
  min-height: 40px;
  color: var(--danger);
  font-size: 14px;
  font-weight: 500;
}

/* Expand animation */
.expand-enter-active {
  transition: max-height 300ms ease, opacity 200ms ease;
  max-height: 3000px;
  overflow: hidden;
}
.expand-leave-active {
  transition: max-height 250ms ease, opacity 150ms ease;
  max-height: 3000px;
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
