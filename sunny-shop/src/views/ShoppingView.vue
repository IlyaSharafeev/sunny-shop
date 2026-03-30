<script setup lang="ts">
import CurrentSessionCard from '@/components/CurrentSessionCard.vue'
</script>

<template>
  <div class="shopping-view">
    <header class="top-header">
      <span class="title">🛒 Поточний закуп</span>
    </header>

    <main class="content">
      <CurrentSessionCard />
    </main>
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
  padding: 0 16px;
  z-index: 20;
}

.title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
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
