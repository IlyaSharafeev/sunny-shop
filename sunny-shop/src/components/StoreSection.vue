<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore, type Store, type Product } from '@/stores/products'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'
import { useI18nStore } from '@/stores/i18n'
import ProductRow from './ProductRow.vue'
import AddProductForm from './AddProductForm.vue'

const props = defineProps<{
  store: Store
  sortMode: 'default' | 'alpha' | 'frequency'
}>()

const productsStore = useProductsStore()
const sessionStore = useSessionStore()
const historyStore = useHistoryStore()
const i18n = useI18nStore()

const products = computed(() => productsStore.productsByStore.get(props.store.id) ?? [])

function applySort(arr: Product[]): Product[] {
  if (props.sortMode === 'alpha') {
    return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
  }
  if (props.sortMode === 'frequency') {
    const freq = historyStore.getFrequentProductIds(999)
    return [...arr].sort((a, b) => {
      const ai = freq.indexOf(a.id)
      const bi = freq.indexOf(b.id)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }
  return arr
}

// Checked items sink to bottom; sort applied within each group
const sortedProducts = computed(() => {
  const list = products.value
  const unchecked = list.filter(p => !sessionStore.isChecked(p.id))
  const checked = list.filter(p => sessionStore.isChecked(p.id))
  return [...applySort(unchecked), ...applySort(checked)]
})

const checkedInStore = computed(() =>
  products.value.filter(p => sessionStore.isChecked(p.id)).length
)

function handleDelete(id: string) {
  productsStore.deleteProduct(id)
}
</script>

<template>
  <section class="store-section">
    <div v-if="sortedProducts.length === 0" class="empty-store">
      <p>{{ i18n.t('store.empty') }}</p>
    </div>

    <TransitionGroup name="sink" tag="div" class="product-list product-list-area">
      <ProductRow
        v-for="product in sortedProducts"
        :key="product.id"
        :product="product"
        @delete="handleDelete"
      />
    </TransitionGroup>

    <p v-if="sortedProducts.length > 0 && checkedInStore === 0" class="store-hint">
      {{ i18n.t('store.hint') }}
    </p>

    <AddProductForm :storeId="store.id" />
  </section>
</template>

<style scoped>
.store-section {
  background: var(--card);
  border-radius: 0 0 var(--radius) var(--radius);
  overflow: hidden;
}

.product-list {
  background: var(--card);
  position: relative; /* needed for sink-leave-active: position absolute */
}

/* ── Sink transition ── */
.sink-move {
  transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.sink-enter-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.sink-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.sink-leave-active {
  transition: opacity 150ms ease;
  position: absolute;
  width: 100%;
}

.sink-leave-to {
  opacity: 0;
}

.empty-store {
  padding: 32px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

.store-hint {
  padding: 8px 16px 4px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .sink-move,
  .sink-enter-active,
  .sink-leave-active {
    transition: none;
  }
}
</style>
