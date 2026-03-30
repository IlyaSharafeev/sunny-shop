<script setup lang="ts">
import { ref } from 'vue'
import { useProductsStore, type StoreId, type Unit } from '@/stores/products'
import { useStoresStore } from '@/stores/userStores'
import { useSessionStore } from '@/stores/session'
import { useI18nStore } from '@/stores/i18n'

const props = defineProps<{
  preselectedStoreId?: StoreId
}>()

const emit = defineEmits<{ close: [] }>()

const productsStore = useProductsStore()
const storesStore = useStoresStore()
const sessionStore = useSessionStore()
const i18n = useI18nStore()

const name = ref('')
const unit = ref<Unit>('шт')
const selectedStores = ref<StoreId[]>([
  props.preselectedStoreId ?? storesStore.visibleStores[0]?.id ?? 'zhanet',
])

const UNITS: Unit[] = ['кг', 'л', 'шт', 'г', 'пач', 'бан']

function toggleStore(id: StoreId) {
  const idx = selectedStores.value.indexOf(id)
  if (idx === -1) {
    selectedStores.value.push(id)
  } else if (selectedStores.value.length > 1) {
    selectedStores.value.splice(idx, 1)
  }
}

function submit() {
  if (!name.value.trim()) return
  const trimmedName = name.value.trim()
  const beforeIds = new Set(productsStore.products.map(p => p.id))
  selectedStores.value.forEach(storeId => {
    productsStore.addCustomProduct(trimmedName, storeId, unit.value)
  })
  productsStore.products
    .filter(p => !beforeIds.has(p.id))
    .forEach(p => sessionStore.toggle(p.id))
  emit('close')
}

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-overlay')) emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click="onOverlayClick">
    <div class="modal-sheet">
      <div class="modal-header">
        <span class="modal-title">{{ i18n.t('home.addProduct') }}</span>
        <button class="modal-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <input
          v-model="name"
          class="input"
          :placeholder="i18n.t('home.addProductName')"
          type="text"
          autofocus
          @keyup.enter="submit"
        />
        <select v-model="unit" class="select">
          <option v-for="u in UNITS" :key="u" :value="u">{{ i18n.t(`unit.${u}`) }}</option>
        </select>

        <div class="store-tags">
          <button
            v-for="store in storesStore.visibleStores"
            :key="store.id"
            class="store-tag"
            :class="{ active: selectedStores.includes(store.id) }"
            :style="{ '--store-color': store.color } as any"
            @click="toggleStore(store.id)"
          >
            {{ store.name }}
          </button>
        </div>

        <div class="form-actions">
          <button class="btn-submit" @click="submit">{{ i18n.t('home.addProductSubmit') }}</button>
          <button class="btn-cancel" @click="emit('close')">{{ i18n.t('home.addProductCancel') }}</button>
        </div>

        <!-- safe-area spacer so buttons clear the home indicator on iOS -->
        <div class="safe-area-spacer"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}

/* ── Bottom sheet card ── */
.modal-sheet {
  position: fixed;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - 120px);
  background: var(--card);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 240ms cubic-bezier(0.34, 1.2, 0.64, 1);
}

@keyframes slideUp {
  from { transform: translateX(-50%) translateY(100%); opacity: 0.7; }
  to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
}

/* ── Header — fixed inside the sheet ── */
.modal-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* ── Scrollable body ── */
.modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input {
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  color: var(--text);
  background: var(--bg);
  width: 100%;
  font-size: 16px;
  flex-shrink: 0;
}

.select {
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  color: var(--text);
  background: var(--bg);
  width: 100%;
  appearance: auto;
  flex-shrink: 0;
}

.store-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.store-tag {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 14px;
  color: var(--muted);
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;
}

.store-tag.active {
  background: var(--store-color);
  border-color: var(--store-color);
  color: white;
  font-weight: 500;
}

/* ── Sticky action bar ── */
.form-actions {
  position: sticky;
  bottom: 0;
  background: var(--card);
  border-top: 1px solid var(--border);
  padding: 12px 0 0;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.safe-area-spacer {
  height: calc(12px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}

.btn-submit {
  flex: 1;
  height: 48px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
}

.btn-cancel {
  width: 48px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  font-size: 18px;
}
</style>
