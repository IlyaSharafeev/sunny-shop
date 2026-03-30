<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useProductsStore } from '@/stores/products'
import { useStoresStore } from '@/stores/userStores'
import { useAuthStore } from '@/stores/auth'
import { buildShareUrl } from '@/composables/useShareList'
import type { SharedList } from '@/composables/useShareList'
import CurrentSessionCard from '@/components/CurrentSessionCard.vue'
import ShareModal from '@/components/ShareModal.vue'

const sessionStore = useSessionStore()
const productsStore = useProductsStore()
const storesStore = useStoresStore()
const authStore = useAuthStore()

const showShare = ref(false)

const shareUrl = computed(() => {
  const items = sessionStore.checkedItems.map(ci => {
    const product = productsStore.products.find(p => p.id === ci.productId)
    const store = storesStore.getById(product?.storeId ?? '')
    return {
      n: product?.name ?? ci.productId,
      q: ci.quantity,
      u: product?.unit ?? 'шт',
      s: store?.name ?? 'Інше',
    }
  })
  const data: SharedList = {
    v: 1,
    t: authStore.user?.name?.split(' ')[0] ?? undefined,
    items,
  }
  return buildShareUrl(data)
})
</script>

<template>
  <div class="shopping-view">
    <header class="top-header">
      <span class="title">🛒 Поточний закуп</span>
      <button
        v-if="sessionStore.checkedCount > 0"
        class="share-btn"
        @click="showShare = true"
        title="Поділитись списком"
      >
        📤
      </button>
    </header>

    <main class="content">
      <CurrentSessionCard />
    </main>

    <ShareModal
      v-if="showShare"
      :url="shareUrl"
      :title="`Список покупок${authStore.user?.name ? ` від ${authStore.user.name.split(' ')[0]}` : ''}`"
      @close="showShare = false"
    />
  </div>
</template>

<style scoped>
.shopping-view {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

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
  padding: 0 16px;
  z-index: 20;
}

.title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.share-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 150ms ease;
}

.share-btn:active {
  transform: scale(0.9);
}

.content {
  margin-top: 60px;
  padding: 12px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

@media (min-width: 768px) {
  .top-header {
    top: 64px;
  }

  .content {
    margin-top: calc(64px + 60px);
  }
}
</style>
