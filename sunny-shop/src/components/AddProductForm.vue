<script setup lang="ts">
import { ref } from 'vue'
import { useProductsStore, STORES, type StoreId, type Unit } from '@/stores/products'
import { useSessionStore } from '@/stores/session'
import { useI18nStore } from '@/stores/i18n'

const props = defineProps<{
  storeId: StoreId
}>()

const productsStore = useProductsStore()
const sessionStore = useSessionStore()
const i18n = useI18nStore()

const open = ref(false)
const name = ref('')
const unit = ref<Unit>('шт')
const selectedStores = ref<StoreId[]>([props.storeId])

const UNITS: Unit[] = ['кг', 'л', 'шт', 'г', 'пач', 'бан']

function toggleStore(id: StoreId) {
  const idx = selectedStores.value.indexOf(id)
  if (idx === -1) {
    selectedStores.value.push(id)
  } else if (selectedStores.value.length > 1) {
    selectedStores.value.splice(idx, 1)
  }
  // always keep at least 1 selected
}

function submit() {
  if (!name.value.trim()) return
  const trimmedName = name.value.trim()

  // Track existing IDs so we can find the new ones
  const beforeIds = new Set(productsStore.products.map(p => p.id))

  selectedStores.value.forEach(storeId => {
    productsStore.addCustomProduct(trimmedName, storeId, unit.value)
  })

  // Auto-check only the newly added products
  productsStore.products
    .filter(p => !beforeIds.has(p.id))
    .forEach(p => sessionStore.toggle(p.id))

  name.value = ''
  unit.value = 'шт'
  selectedStores.value = [props.storeId]
  open.value = false
}

function cancel() {
  name.value = ''
  unit.value = 'шт'
  selectedStores.value = [props.storeId]
  open.value = false
}
</script>

<template>
  <div class="add-form-wrapper">
    <button class="open-btn" @click="open = !open">
      {{ i18n.t('home.addProduct') }}
    </button>

    <Transition name="expand">
      <div v-if="open" class="form">
        <input
          v-model="name"
          class="input"
          :placeholder="i18n.t('home.addProductName')"
          type="text"
          @keyup.enter="submit"
        />
        <select v-model="unit" class="select">
          <option v-for="u in UNITS" :key="u" :value="u">{{ i18n.t(`unit.${u}`) }}</option>
        </select>

        <!-- Multi-store checkboxes -->
        <div class="store-checkboxes">
          <p class="field-label">{{ i18n.t('addProduct.stores') }}</p>
          <div
            v-for="store in STORES"
            :key="store.id"
            class="store-checkbox-row"
            @click="toggleStore(store.id)"
          >
            <div class="mini-checkbox" :class="{ active: selectedStores.includes(store.id) }">
              <span v-if="selectedStores.includes(store.id)">✓</span>
            </div>
            <span class="store-dot" :style="{ background: store.color }"></span>
            <span class="store-label">{{ store.name }}</span>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-submit" @click="submit">{{ i18n.t('home.addProductSubmit') }}</button>
          <button class="btn-cancel" @click="cancel">{{ i18n.t('home.addProductCancel') }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.add-form-wrapper {
  padding: 8px 16px 12px;
  background: var(--card);
}

.open-btn {
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
  min-height: 44px;
  padding: 8px 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  overflow: hidden;
}

.input {
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  color: var(--text);
  background: var(--bg);
  width: 100%;
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
}

/* ── Store checkboxes ── */
.store-checkboxes {
  margin: 4px 0;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.store-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.store-checkbox-row:last-child {
  border-bottom: none;
}

.mini-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: white;
  flex-shrink: 0;
  transition: all 150ms ease;
}

.mini-checkbox.active {
  background: var(--primary);
  border-color: var(--primary);
}

.store-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.store-label {
  font-size: 15px;
  color: var(--text);
}

/* ── Actions ── */
.form-actions {
  display: flex;
  gap: 8px;
}

.btn-submit {
  flex: 1;
  height: 44px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
}

.btn-cancel {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  font-size: 18px;
}

/* ── Expand transition ── */
.expand-enter-active {
  transition: max-height 300ms ease, opacity 200ms ease;
  max-height: 600px;
}
.expand-leave-active {
  transition: max-height 200ms ease, opacity 150ms ease;
  max-height: 600px;
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
