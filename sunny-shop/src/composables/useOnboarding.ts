import { nextTick } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'

export async function startOnboarding() {
  // Dynamically import driver.js to keep initial bundle small
  const [{ driver }, _css] = await Promise.all([
    import('driver.js'),
    import('driver.js/dist/driver.css'),
  ])

  const settingsStore = useSettingsStore()
  const authStore = useAuthStore()

  function done() {
    settingsStore.completeOnboarding()
    driverObj.destroy()
  }

  const driverObj = driver({
    animate: true,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Далі →',
    prevBtnText: '← Назад',
    doneBtnText: 'Почати! 🎉',
    allowClose: true,
    overlayColor: 'rgba(0,0,0,0.72)',
    popoverClass: 'onb-popover',
    onDestroyStarted: () => done(),
    steps: [
      {
        element: '#onb-store-content',
        popover: {
          title: '🛒 Список покупок',
          description: 'Тут всі товари розбиті по магазинах. Натисни на товар щоб відмітити його — він потрапить у закуп.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#onb-store-manage',
        popover: {
          title: '⚙ Мої магазини',
          description: 'Тут можна додавати свої магазини, перейменовувати, змінювати порядок або ховати непотрібні вкладки.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#onb-count-pill',
        popover: {
          title: '✓ Відмічені товари',
          description: 'Тут відображається кількість відмічених товарів. Натисни щоб перейти до них.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#onb-nav-shopping',
        popover: {
          title: '🏪 Поточний закуп',
          description: 'Тут видно всі куплені товари з цінами та загальною сумою в трьох валютах.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#onb-nav-history',
        popover: {
          title: '📋 Історія закупів',
          description: 'Зберігаються всі попередні закупи. Можна повторити будь-який одним натиском.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#onb-profile-avatar',
        popover: {
          title: authStore.user?.name ? `👋 ${authStore.user.name}` : '👤 Профіль',
          description: 'Тут твій профіль, статистика витрат та налаштування сповіщень.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  })

  driverObj.drive()
}

export async function maybeStartOnboarding() {
  const settingsStore = useSettingsStore()
  const authStore = useAuthStore()

  // Only for logged-in users who haven't completed onboarding
  if (!authStore.isLoggedIn) return
  if (settingsStore.onboardingCompleted) return

  // Wait for DOM to be ready
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 800))

  // Make sure key elements exist before starting
  if (!document.getElementById('onb-store-content')) return

  await startOnboarding()
}
