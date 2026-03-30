<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProductsStore } from '@/stores/products'
import { useSessionStore } from '@/stores/session'
import { useHistoryStore } from '@/stores/history'
import { useApi } from '@/composables/useApi'

declare global {
  interface Window {
    google: any
    AppleID: any
  }
}

const router = useRouter()
const authStore = useAuthStore()
const productsStore = useProductsStore()
const sessionStore = useSessionStore()
const historyStore = useHistoryStore()
const api = useApi()

const tab = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')

const newPassword = ref('')
const newPasswordConfirm = ref('')
const setPasswordError = ref('')
const setPasswordSuccess = ref(false)

async function onSetPassword() {
  setPasswordError.value = ''
  setPasswordSuccess.value = false
  if (newPassword.value.length < 8) {
    setPasswordError.value = 'Мінімум 8 символів'
    return
  }
  if (newPassword.value !== newPasswordConfirm.value) {
    setPasswordError.value = 'Паролі не збігаються'
    return
  }
  try {
    await authStore.setPassword(newPassword.value)
    setPasswordSuccess.value = true
    newPassword.value = ''
    newPasswordConfirm.value = ''
  } catch (e: any) {
    setPasswordError.value = e.message || 'Помилка'
  }
}

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

let googleTokenClient: any = null

async function handleGoogleTokenResponse(tokenResponse: any) {
  if (tokenResponse.error) {
    error.value = 'Google помилка: ' + tokenResponse.error
    return
  }
  try {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: any }>(
      '/api/auth/google-token',
      { accessToken: tokenResponse.access_token }
    )
    if (data?.accessToken) {
      authStore.setTokens(data.accessToken, data.refreshToken)
      authStore.setUser(data.user)
      await Promise.all([
        productsStore.fetchFromServer(),
        sessionStore.fetchFromServer(),
        historyStore.fetchFromServer(),
      ])
      router.push('/')
    }
  } catch (e: any) {
    error.value = e.message || 'Google login failed'
  }
}

function handleGoogleLogin() {
  if (!googleTokenClient) {
    error.value = 'Google не ініціалізовано'
    return
  }
  googleTokenClient.requestAccessToken({ prompt: 'select_account' })
}

onMounted(() => {
  // Redirect logged-in users to profile
  if (authStore.isLoggedIn) {
    router.replace('/profile')
    return
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID not set')
    return
  }

  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = () => {
    googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: handleGoogleTokenResponse,
    })
  }
  document.head.appendChild(script)
})

function appleSignIn() {
  window.AppleID?.auth.signIn()
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

      <!-- Set password for Google/Apple users -->
      <div v-if="!authStore.user?.hasPassword" class="set-password-section">
        <p class="set-password-hint">Встановіть пароль, щоб входити через email</p>
        <form class="login-form" @submit.prevent="onSetPassword">
          <input v-model="newPassword" type="password" placeholder="Новий пароль (мін. 8 символів)" class="login-input" autocomplete="new-password" />
          <input v-model="newPasswordConfirm" type="password" placeholder="Повторіть пароль" class="login-input" autocomplete="new-password" />
          <p v-if="setPasswordError" class="login-error">{{ setPasswordError }}</p>
          <p v-if="setPasswordSuccess" class="set-password-ok">Пароль встановлено!</p>
          <button type="submit" class="btn btn-primary" :disabled="authStore.loading">
            {{ authStore.loading ? '...' : 'Встановити пароль' }}
          </button>
        </form>
      </div>

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

      <!-- Google Sign-In — manual button, always visible -->
      <button class="google-btn-manual" type="button" @click="handleGoogleLogin">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
        </svg>
        Увійти через Google
      </button>

      <!-- Apple Sign-In -->
<!--       <button -->
<!--         class="btn btn-apple" -->
<!--         type="button" -->
<!--         @click="appleSignIn" -->
<!--       > -->
<!--         <svg class="apple-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"> -->
<!--           <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.34.07 2.27.74 3.04.8 1.15-.19 2.26-.89 3.46-.84 1.47.07 2.58.64 3.3 1.65-3.04 1.82-2.52 5.86.52 7.08-.6 1.66-1.38 3.3-2.32 4.19zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/> -->
<!--         </svg> -->
<!--         Увійти через Apple -->
<!--       </button> -->

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

.set-password-section {
  width: 100%;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.set-password-hint {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  margin-bottom: 12px;
}
.set-password-ok {
  font-size: 13px;
  color: var(--primary);
  text-align: center;
  margin-top: -4px;
}


.google-btn-manual {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #dadce0;
  border-radius: 8px;
  background: white;
  color: #3c4043;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
  transition: background 150ms ease, box-shadow 150ms ease;
}
.google-btn-manual:active {
  background: #f8f9fa;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
</style>
