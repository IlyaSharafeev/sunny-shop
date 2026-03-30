<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()


const initials = computed(() => {
  const name = authStore.user?.name
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

const avatarUrl = computed(() => authStore.user?.avatarUrl ?? null)
const isLoggedIn = computed(() => authStore.isLoggedIn)
</script>

<template>
  <button class="profile-avatar" @click="router.push(authStore.isLoggedIn ? '/profile' : '/login')" :title="authStore.user?.name ?? 'Профіль'">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="authStore.user?.name ?? 'Avatar'"
      class="avatar-img"
    />
    <span v-else-if="isLoggedIn" class="avatar-initials">{{ initials }}</span>
    <span v-else class="avatar-icon">👤</span>
  </button>
</template>

<style scoped>
.profile-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease;
}

.profile-avatar:active {
  transform: scale(0.92);
  border-color: var(--primary);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-initials {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
  user-select: none;
}

.avatar-icon {
  font-size: 18px;
  line-height: 1;
}
</style>
