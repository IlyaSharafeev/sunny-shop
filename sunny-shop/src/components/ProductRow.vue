<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSwipe, onLongPress, useVibrate } from '@vueuse/core'
import { animate } from 'motion'
import { useSessionStore } from '@/stores/session'
import { useI18nStore } from '@/stores/i18n'
import { useSpringAnimate } from '@/composables/useSpringAnimate'
import type { Product } from '@/stores/products'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const sessionStore = useSessionStore()
const i18n = useI18nStore()
const { bounceCheck, bounceBtn, bounceQty, slideOutRow } = useSpringAnimate()
const { vibrate } = useVibrate()

const rowEl = ref<HTMLElement>()
const contentEl = ref<HTMLElement>()
const checkboxEl = ref<HTMLElement>()
const qtyEl = ref<HTMLElement>()
const minusBtn = ref<HTMLButtonElement>()
const plusBtn = ref<HTMLButtonElement>()

const showDelete = ref(false)          // product delete (unchecked rows)
const showSessionDelete = ref(false)   // session remove (checked rows)
const sessionDeleteConfirming = ref(false)
const showConfirm = ref(false)
const offsetX = ref(0)
const lastTap = ref(0)

const isChecked = computed(() => sessionStore.isChecked(props.product.id))
const qty = computed(() => sessionStore.getQty(props.product.id))
const price = computed(() => sessionStore.getPrice(props.product.id))

function handlePriceInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  sessionStore.updatePrice(props.product.id, isNaN(val) ? 0 : val)
}

// Long press — differentiate checked vs unchecked
onLongPress(rowEl, () => {
  if (isChecked.value) {
    showSessionDelete.value = true
  } else {
    showDelete.value = true
  }
  vibrate([50])
}, { delay: 500 })

// Scroll detection
let isScrolling: boolean | null = null
let startX = 0
let startY = 0

onMounted(() => {
  contentEl.value?.addEventListener('touchstart', (e) => {
    startX = e.touches[0]?.clientX ?? 0
    startY = e.touches[0]?.clientY ?? 0
    isScrolling = null
  }, { passive: true })

  contentEl.value?.addEventListener('touchmove', (e) => {
    if (isScrolling === null) {
      const dx = Math.abs((e.touches[0]?.clientX ?? 0) - startX)
      const dy = Math.abs((e.touches[0]?.clientY ?? 0) - startY)
      isScrolling = dy > dx
    }
  }, { passive: true })
})

// Swipe gesture for qty control
// lengthX = start.x - end.x, so right swipe → negative lengthX
// We negate: offsetX > 0 = swiping right (→ +1), offsetX < 0 = swiping left (→ -1/delete)
const { isSwiping, lengthX, direction } = useSwipe(rowEl, {
  threshold: 40,
  onSwipe() {
    if (!isChecked.value || props.product.isReminder) return
    offsetX.value = Math.min(Math.max(-lengthX.value, -80), 80)
  },
  onSwipeEnd() {
    if (isChecked.value && !props.product.isReminder && isScrolling !== true) {
      if (direction.value === 'right') handleSwipeRight()
      else if (direction.value === 'left') handleSwipeLeft()
    }
    offsetX.value = 0
  },
})

// Derived opacities for swipe backgrounds
const swipeBgLeftOpacity = computed(() => Math.max(0, offsetX.value) / 80)
const swipeBgRightOpacity = computed(() => Math.max(0, -offsetX.value) / 80)

function handleCheck() {
  const wasChecked = isChecked.value
  showDelete.value = false
  showSessionDelete.value = false
  sessionDeleteConfirming.value = false
  sessionStore.toggle(props.product.id)
  vibrate(wasChecked ? [5] : [10])
  if (checkboxEl.value) bounceCheck(checkboxEl.value)
}

const doubleTapEase: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

function handleRowClick() {
  const now = Date.now()
  const timeSinceLastTap = now - lastTap.value

  if (timeSinceLastTap < 300 && isChecked.value && !props.product.isReminder) {
    // Double-tap: double the quantity
    const currentQty = sessionStore.getQty(props.product.id)
    sessionStore.updateQty(props.product.id, currentQty * 2)
    if (qtyEl.value) {
      animate(qtyEl.value,
        { scaleX: [1, 1.6, 0.9, 1.15, 1], scaleY: [1, 1.6, 0.9, 1.15, 1] },
        { ease: doubleTapEase, duration: 0.5 }
      )
    }
    if ('vibrate' in navigator) navigator.vibrate([15, 30, 15])
    lastTap.value = 0
    return
  }

  lastTap.value = now
  handleCheck()
}

function handleMinus() {
  if (minusBtn.value) bounceBtn(minusBtn.value)
  sessionStore.updateQty(props.product.id, qty.value - 1)
  if (qtyEl.value && qty.value > 1) bounceQty(qtyEl.value)
  vibrate([8])
}

function handlePlus() {
  if (plusBtn.value) bounceBtn(plusBtn.value)
  sessionStore.updateQty(props.product.id, qty.value + 1)
  if (qtyEl.value) bounceQty(qtyEl.value)
  vibrate([8])
}

function handleSwipeRight() {
  vibrate([8])
  sessionStore.updateQty(props.product.id, qty.value + 1)
  if (qtyEl.value) bounceQty(qtyEl.value)
}

function handleSwipeLeft() {
  const currentQty = sessionStore.getQty(props.product.id)
  if (currentQty > 1) {
    vibrate([8])
    sessionStore.updateQty(props.product.id, currentQty - 1)
    if (qtyEl.value) bounceQty(qtyEl.value)
  } else {
    // qty is 1 — swipe left removes item from session
    sessionStore.toggle(props.product.id)
    if ('vibrate' in navigator) navigator.vibrate([15, 40, 15])
  }
}

// Session delete (for checked rows)
function handleSessionDeleteClick() {
  if (!sessionDeleteConfirming.value) {
    sessionDeleteConfirming.value = true
    setTimeout(() => { sessionDeleteConfirming.value = false }, 2000)
  } else {
    showSessionDelete.value = false
    sessionDeleteConfirming.value = false
    sessionStore.toggle(props.product.id)
    if ('vibrate' in navigator) navigator.vibrate([20, 50, 20])
  }
}

// Product delete (for unchecked rows)
function requestDelete() {
  showConfirm.value = true
}

function confirmDelete() {
  showConfirm.value = false
  showDelete.value = false
  if (rowEl.value) {
    slideOutRow(rowEl.value)?.then(() => emit('delete', props.product.id))
      ?? emit('delete', props.product.id)
  } else {
    emit('delete', props.product.id)
  }
}

function cancelDelete() {
  showConfirm.value = false
}
</script>

<template>
  <div
    ref="rowEl"
    class="product-row"
    :class="{ checked: isChecked }"
    @click.self="showDelete = false; showSessionDelete = false; sessionDeleteConfirming = false"
  >
    <!-- Swipe background indicators -->
    <!-- Left side (green): reveals when swiping right → +1 -->
    <div class="swipe-bg-left" :style="{ opacity: swipeBgLeftOpacity }">＋1</div>
    <!-- Right side (red): reveals when swiping left → -1 or 🗑 -->
    <div class="swipe-bg-right" :style="{ opacity: swipeBgRightOpacity }">
      {{ qty === 1 ? '🗑' : '−1' }}
    </div>

    <!-- Row content — handles both single tap (toggle) and double-tap (×2 qty) -->
    <div
      ref="contentEl"
      class="row-content"
      :class="{ swiping: isSwiping }"
      :style="{ transform: `translateX(${offsetX}px)` }"
      @click="handleRowClick"
    >
      <!-- @pointerdown.stop prevents long-press from firing when touching checkbox -->
      <button
        class="checkbox-btn"
        @pointerdown.stop
        :aria-label="product.name"
      >
        <div ref="checkboxEl" class="checkbox" :class="{ active: isChecked }">
          <span class="checkmark" :style="{ opacity: isChecked ? 1 : 0 }">✓</span>
        </div>
      </button>

      <span class="product-name">{{ product.name }}</span>

      <div v-if="isChecked && !product.isReminder" class="qty-price-group" @click.stop>
        <div class="qty-stepper">
          <button ref="minusBtn" @click="handleMinus">−</button>
          <span ref="qtyEl" class="qty-num">{{ qty }}</span>
          <button ref="plusBtn" @click="handlePlus">＋</button>
        </div>
        <div class="price-input-wrap">
          <span class="price-currency">₴</span>
          <input
            class="price-input"
            type="number"
            min="0"
            step="0.5"
            placeholder="0"
            :value="price || ''"
            @change="handlePriceInput"
            @click.stop
          />
        </div>
      </div>

      <span class="unit">{{ product.isReminder ? '' : i18n.t(`unit.${product.unit}`) }}</span>

      <!-- Session remove button (for checked rows, long press) -->
      <Transition name="fade-delete">
        <button
          v-if="showSessionDelete"
          class="delete-btn"
          :class="{ confirming: sessionDeleteConfirming }"
          @click.stop="handleSessionDeleteClick"
        >
          {{ sessionDeleteConfirming ? '✓ Видалити?' : '🗑' }}
        </button>
      </Transition>

      <!-- Product delete button (for unchecked rows, long press) -->
      <Transition name="fade-delete">
        <button v-if="showDelete" class="delete-btn" @click.stop="requestDelete">🗑</button>
      </Transition>
    </div>

    <ConfirmDialog
      :visible="showConfirm"
      :message="i18n.t('home.deleteConfirm', { name: product.name })"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.product-row {
  position: relative;
  overflow: hidden;
  min-height: 52px;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  will-change: transform, opacity;
}

.swipe-bg-left {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.swipe-bg-right {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.row-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  min-height: 52px;
  background: var(--card);
  will-change: transform;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 1;
}

.row-content.swiping {
  transition: none;
}

.checkbox-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  will-change: transform, background-color;
  transition: background-color 150ms ease, border-color 150ms ease;
  flex-shrink: 0;
}

.checkbox.active {
  background: var(--primary);
  border-color: var(--primary);
}

.checkmark {
  color: white;
  font-size: 16px;
  font-weight: 700;
  transition: opacity 100ms ease;
  will-change: opacity, transform;
}

.product-name {
  flex: 1;
  font-size: 15px;
  line-height: 1.3;
  transition: color 200ms ease;
}

.product-row.checked {
  opacity: 0.55;
}

.product-row.checked .product-name {
  text-decoration: line-through;
  color: var(--muted);
}

.product-row:not(.checked) .product-name {
  color: var(--text);
}

.qty-price-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.qty-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.price-input-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.price-currency {
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

.qty-stepper button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
  line-height: 1;
  color: var(--text);
}

.qty-num {
  min-width: 24px;
  text-align: center;
  font-weight: 500;
  font-size: 15px;
  will-change: transform;
}

.unit {
  font-size: 12px;
  color: var(--muted);
  min-width: 24px;
  text-align: right;
  flex-shrink: 0;
}

.delete-btn {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: #fff0f0;
  color: var(--danger);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 4px;
}

.delete-btn.confirming {
  width: auto;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.fade-delete-enter-active,
.fade-delete-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.fade-delete-enter-from,
.fade-delete-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

@media (prefers-reduced-motion: reduce) {
  .row-content {
    transition: none;
  }
  .checkbox,
  .checkmark,
  .product-name {
    transition: none;
  }
}
</style>
