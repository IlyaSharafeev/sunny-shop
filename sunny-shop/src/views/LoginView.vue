<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProductsStore } from '@/stores/products'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'

const router = useRouter()
const authStore = useAuthStore()
const productsStore = useProductsStore()
const sessionStore = useSessionStore()
const historyStore = useHistoryStore()

const tab = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')

async function onSubmit() {
  error.value = ''
  try {
    if (tab.value === 'login') {
      await authStore.login(email.value, password.value)
    } else {
      await authStore.register(email.value, password.value, name.value || undefined)
    }
    await Promise.all([
      productsStore.fetchFromServer(),
      sessionStore.fetchFromServer(),
      historyStore.fetchFromServer(),
    ])
    router.push('/')
  } catch (e: any) {
    error.value = e.message || 'Помилка. Спробуйте ще раз.'
  }
}

async function onLogout() {
  await authStore.logout()
  router.push('/')
}

function switchTab(t: 'login' | 'register') {
  tab.value = t
  error.value = ''
}

// Google Sign-In placeholder — rendered into #google-btn by the GSI script when ready
onMounted(() => {
  const g = (window as any).google
  if (g) {
    g.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: 280 }
    )
  }
})

function appleSignIn() {
  ;(window as any).AppleID?.auth.signIn()
}
</script>

<template>
  <div class="login-view">

    <!-- ── Logged-in panel ── -->
    <div v-if="authStore.isLoggedIn" class="login-card">
      <div class="avatar">
        <img v-if="authStore.user?.avatarUrl" :src="authStore.user.avatarUrl" alt="avatar" class="avatar-img" />
        <span v-else class="avatar-emoji">👤</span>
      </div>
      <h2 class="login-title">{{ authStore.user?.name || 'Профіль' }}</h2>
      <p v-if="authStore.user?.email" class="login-sub">{{ authStore.user.email }}</p>

      <button class="btn btn-danger" style="margin-top:20px" @click="onLogout">
        Вийти
      </button>
      <button class="btn-text" @click="router.push('/')">Назад</button>
    </div>

    <!-- ── Auth form ── -->
    <div v-else class="login-card">
      <div class="login-logo">☀️</div>
      <h1 class="login-title">Sunny Shop</h1>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: tab === 'login' }"
          @click="switchTab('login')"
        >Увійти</button>
        <button
          class="tab-btn"
          :class="{ active: tab === 'register' }"
          @click="switchTab('register')"
        >Реєстрація</button>
      </div>

      <!-- Form -->
      <form class="login-form" @submit.prevent="onSubmit">
        <input
          v-if="tab === 'register'"
          v-model="name"
          type="text"
          placeholder="Ім'я (необов'язково)"
          class="login-input"
          autocomplete="name"
        />
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="login-input"
          required
          autocomplete="email"
        />
        <input
          v-model="password"
          type="password"
          :placeholder="tab === 'register' ? 'Пароль (мін. 8 символів)' : 'Пароль'"
          class="login-input"
          required
          :minlength="tab === 'register' ? 8 : undefined"
          autocomplete="current-password"
        />

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary" :disabled="authStore.loading">
          {{ authStore.loading ? '...' : tab === 'login' ? 'Увійти' : 'Зареєструватись' }}
        </button>
      </form>

      <!-- Divider -->
      <div class="divider"><span>або</span></div>

      <!-- Google Sign-In (rendered by GSI script into this div) -->
      <div id="google-btn" class="oauth-btn-wrap"></div>

      <!-- Apple Sign-In -->
      <button
        class="btn btn-apple"
        type="button"
        @click="appleSignIn"
      >
        <svg class="apple-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.34.07 2.27.74 3.04.8 1.15-.19 2.26-.89 3.46-.84 1.47.07 2.58.64 3.3 1.65-3.04 1.82-2.52 5.86.52 7.08-.6 1.66-1.38 3.3-2.32 4.19zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        Увійти через Apple
      </button>

      <button class="btn-text" @click="router.push('/')">Продовжити без входу</button>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 24px 16px 88px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: var(--card);
  border-radius: 16px;
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
}

/* Avatar */
.avatar { margin-bottom: 12px; }
.avatar-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
.avatar-emoji { font-size: 56px; line-height: 1; }

.login-logo { font-size: 48px; line-height: 1; margin-bottom: 8px; }

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  text-align: center;
}

.login-sub { font-size: 14px; color: var(--muted); text-align: center; }

/* Tabs */
.tabs {
  display: flex;
  width: 100%;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 3px;
  margin: 16px 0 0;
  gap: 2px;
}

.tab-btn {
  flex: 1;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 600;
  border-radius: calc(var(--radius) - 2px);
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--card);
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

/* Form */
.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.login-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus { border-color: var(--primary); }

.login-error {
  font-size: 13px;
  color: var(--danger);
  text-align: center;
  margin-top: -4px;
}

/* Buttons */
.btn {
  width: 100%;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled { opacity: 0.6; }

.btn-primary { background: var(--primary); color: #fff; margin-top: 4px; }

.btn-danger { background: var(--danger); color: #fff; }

.btn-apple {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  background: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
}

[data-theme="dark"] .btn-apple { background: #fff; color: #000; }

.apple-icon { flex-shrink: 0; }

.btn-text {
  font-size: 13px;
  color: var(--muted);
  margin-top: 8px;
  cursor: pointer;
  background: none;
  border: none;
}

/* Divider */
.divider {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 12px;
  color: var(--muted);
  font-size: 13px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* Google btn container — GSI renders a button inside */
.oauth-btn-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: 44px;
  margin-bottom: 8px;
}
</style>
