<script setup lang="ts">
import { ref } from 'vue'
import html2canvas from 'html2canvas'

defineProps<{ disabled?: boolean }>()

const isGenerating = ref(false)

async function handleShare() {
  isGenerating.value = true
  try {
    const listEl = document.querySelector('.product-list-area') as HTMLElement | null
    if (!listEl) {
      alert('Не вдалося знайти список')
      return
    }
    const canvas = await html2canvas(listEl, {
      backgroundColor: '#f5f5f5',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 480,
    })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'sunny-shop-list.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Мій список закупів 🛒', files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'sunny-shop.png'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  } catch (e) {
    console.error('Share failed:', e)
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <button class="share-btn" @click="handleShare" :disabled="isGenerating || disabled">
    <span v-if="isGenerating">⏳</span>
    <span v-else>📤</span>
  </button>
</template>

<style scoped>
.share-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.share-btn:active {
  transform: scale(0.92);
}

.share-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
