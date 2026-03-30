<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useTheme } from '@/composables/useTheme'
import { useI18nStore } from '@/stores/i18n'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { accentColor, colorScheme, setAccentColor, setColorScheme, PRESETS } = useTheme()
const i18n = useI18nStore()

const panelEl = ref<HTMLElement>()

onClickOutside(panelEl, () => emit('close'))

function close() {
  emit('close')
}
</script>

<template>
  <Transition name="theme-drop">
    <div v-if="isOpen" ref="panelEl" class="theme-panel">
      <div class="theme-panel-header">
        <span class="theme-panel-title">{{ i18n.t('theme.title') }}</span>
        <button class="theme-close" @click="close">✕</button>
      </div>

      <!-- Preset swatches -->
      <div class="swatches">
        <button
          v-for="preset in PRESETS"
          :key="preset.value"
          class="swatch"
          :style="{ background: preset.value }"
          :title="preset.name"
          @click="setAccentColor(preset.value)"
        >
          <span v-if="accentColor === preset.value" class="swatch-check">✓</span>
        </button>
      </div>

      <!-- Custom color picker -->
      <label class="color-input-row">
        <span>{{ i18n.t('theme.custom') }}</span>
        <input
          type="color"
          :value="accentColor"
          @input="setAccentColor(($event.target as HTMLInputElement).value)"
        />
      </label>

      <!-- Light / Dark toggle -->
      <div class="scheme-toggle">
        <button
          class="scheme-btn"
          :class="{ active: colorScheme === 'light' }"
          :style="colorScheme === 'light' ? { background: accentColor, borderColor: accentColor, color: '#fff' } : {}"
          @click="setColorScheme('light')"
        >
          ☀️ {{ i18n.t('theme.light') }}
        </button>
        <button
          class="scheme-btn"
          :class="{ active: colorScheme === 'dark' }"
          :style="colorScheme === 'dark' ? { background: accentColor, borderColor: accentColor, color: '#fff' } : {}"
          @click="setColorScheme('dark')"
        >
          🌙 {{ i18n.t('theme.dark') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.theme-panel {
  position: absolute;
  top: 60px;
  right: 12px;
  width: 260px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  z-index: 200;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.theme-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.theme-panel-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.theme-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
  font-weight: 700;
  transition: transform 150ms ease;
  flex-shrink: 0;
}

.swatch:active {
  transform: scale(0.88);
}

.swatch-check {
  line-height: 1;
}

.color-input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
}

.color-input-row input[type="color"] {
  width: 44px;
  height: 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0 2px;
}

.scheme-toggle {
  display: flex;
  gap: 8px;
}

.scheme-btn {
  flex: 1;
  padding: 8px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 150ms ease;
}

/* Drop-down animation */
.theme-drop-enter-active { transition: opacity 200ms ease, transform 200ms ease; }
.theme-drop-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.theme-drop-enter-from   { opacity: 0; transform: translateY(-8px) scale(0.97); }
.theme-drop-leave-to     { opacity: 0; transform: translateY(-8px) scale(0.97); }
</style>
