<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useStoresStore, PRESET_COLORS, EMOJI_OPTIONS, type UserStore } from '@/stores/userStores'

const emit = defineEmits<{ close: [] }>()
const storesStore = useStoresStore()

// ── Inline rename ─────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editingName = ref('')
let editInputEl: HTMLInputElement | null = null

function startEdit(store: UserStore) {
  editingId.value = store.id
  editingName.value = store.name
  nextTick(() => editInputEl?.focus())
}

function commitEdit() {
  if (editingId.value && editingName.value.trim()) {
    storesStore.rename(editingId.value, editingName.value)
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// ── Color picker popup ────────────────────────────────────────────
const colorPickerFor = ref<string | null>(null)

function toggleColorPicker(id: string) {
  colorPickerFor.value = colorPickerFor.value === id ? null : id
}

// ── Drag to reorder ───────────────────────────────────────────────
const dragId = ref<string | null>(null)
const overIndex = ref<number>(-1)
let dragStartY = 0
const ITEM_HEIGHT = 60

const sorted = computed(() => storesStore.allSorted)

function onHandlePointerDown(e: PointerEvent, id: string) {
  e.preventDefault()
  dragId.value = id
  dragStartY = e.clientY
  overIndex.value = sorted.value.findIndex(s => s.id === id)
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
}

function onContainerPointerMove(e: PointerEvent) {
  if (!dragId.value) return
  const dy = e.clientY - dragStartY
  const startIdx = sorted.value.findIndex(s => s.id === dragId.value)
  const newIdx = Math.max(0, Math.min(sorted.value.length - 1, startIdx + Math.round(dy / ITEM_HEIGHT)))
  overIndex.value = newIdx
}

function onContainerPointerUp() {
  if (!dragId.value) return
  const fromIdx = sorted.value.findIndex(s => s.id === dragId.value)
  const toIdx = overIndex.value
  if (toIdx >= 0 && toIdx !== fromIdx) {
    const ids = sorted.value.map(s => s.id)
    const [removed] = ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, removed)
    storesStore.reorder(ids)
  }
  dragId.value = null
  overIndex.value = -1
}

// ── Add new store form ────────────────────────────────────────────
const showAddForm = ref(false)
const newName = ref('')
const newColor = ref('#4caf50')
const newEmoji = ref('🏪')

function handleAdd() {
  if (!newName.value.trim()) return
  storesStore.addStore(newName.value, newColor.value, newEmoji.value)
  newName.value = ''
  newColor.value = '#4caf50'
  newEmoji.value = '🏪'
  showAddForm.value = false
}

function overlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('manager-overlay')) emit('close')
}
</script>

<template>
  <div
    class="manager-overlay"
    @click="overlayClick"
    @pointermove="onContainerPointerMove"
    @pointerup="onContainerPointerUp"
  >
    <div class="manager-sheet">
      <!-- Header -->
      <div class="sheet-handle" />
      <div class="sheet-header">
        <span class="sheet-title">Мої магазини</span>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="sheet-hint">Торкніться назви щоб перейменувати · Тягніть ⠿ щоб змінити порядок</div>

      <!-- Store list -->
      <div class="store-list">
        <div
          v-for="(store, index) in sorted"
          :key="store.id"
          class="store-item"
          :class="{
            'is-dragging': dragId === store.id,
            'drag-over-top': overIndex === index && dragId !== null && dragId !== store.id && overIndex < sorted.findIndex(s => s.id === dragId),
            'drag-over-bot': overIndex === index && dragId !== null && dragId !== store.id && overIndex >= sorted.findIndex(s => s.id === dragId),
          }"
        >
          <!-- Drag handle -->
          <div
            class="drag-handle"
            @pointerdown="onHandlePointerDown($event, store.id)"
          >⠿</div>

          <!-- Color swatch + picker -->
          <div class="color-wrap">
            <button
              class="color-swatch"
              :style="{ background: store.color }"
              :title="'Змінити колір'"
              @click.stop="toggleColorPicker(store.id)"
            />
            <div v-if="colorPickerFor === store.id" class="color-picker-popup" @click.stop>
              <button
                v-for="c in PRESET_COLORS"
                :key="c"
                class="color-option"
                :style="{ background: c }"
                :class="{ selected: store.color === c }"
                @click="storesStore.updateColor(store.id, c); colorPickerFor = null"
              />
            </div>
          </div>

          <!-- Emoji -->
          <span class="store-emoji">{{ store.emoji }}</span>

          <!-- Name -->
          <div class="name-wrap">
            <input
              v-if="editingId === store.id"
              :ref="el => { if (el) editInputEl = el as HTMLInputElement }"
              v-model="editingName"
              class="name-input"
              @blur="commitEdit"
              @keyup.enter="commitEdit"
              @keyup.escape="cancelEdit"
            />
            <span
              v-else
              class="name-text"
              :class="{ hidden: !store.visible }"
              @click="startEdit(store)"
            >{{ store.name }}</span>
          </div>

          <!-- Visibility toggle -->
          <button
            class="icon-action"
            :title="store.visible ? 'Сховати' : 'Показати'"
            @click="storesStore.toggleVisibility(store.id)"
          >
            <span :style="{ opacity: store.visible ? 1 : 0.35 }">👁</span>
          </button>

          <!-- Delete (custom stores only) -->
          <button
            v-if="!store.isDefault"
            class="icon-action danger"
            title="Видалити"
            @click="storesStore.deleteStore(store.id)"
          >🗑</button>
          <div v-else class="icon-placeholder" />
        </div>
      </div>

      <!-- Add store section -->
      <div class="add-section">
        <button v-if="!showAddForm" class="add-store-btn" @click="showAddForm = true">
          + Додати магазин
        </button>

        <div v-else class="add-form" @click.stop>
          <div class="add-form-row">
            <select v-model="newEmoji" class="emoji-select">
              <option v-for="e in EMOJI_OPTIONS" :key="e" :value="e">{{ e }}</option>
            </select>
            <input
              v-model="newName"
              class="name-input-new"
              placeholder="Назва магазину"
              autofocus
              @keyup.enter="handleAdd"
              @keyup.escape="showAddForm = false"
            />
          </div>

          <div class="color-grid">
            <button
              v-for="c in PRESET_COLORS"
              :key="c"
              class="color-option"
              :style="{ background: c }"
              :class="{ selected: newColor === c }"
              @click="newColor = c"
            />
          </div>

          <div class="add-form-actions">
            <button class="btn-confirm" @click="handleAdd">Додати</button>
            <button class="btn-cancel" @click="showAddForm = false; newName = ''">Скасувати</button>
          </div>
        </div>
      </div>

      <div class="safe-spacer" />
    </div>
  </div>
</template>

<style scoped>
.manager-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.manager-sheet {
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  background: var(--card);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 250ms cubic-bezier(0.34, 1.15, 0.64, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0.7; }
  to   { transform: translateY(0);    opacity: 1; }
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 10px auto 0;
  flex-shrink: 0;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
  flex-shrink: 0;
}

.sheet-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-hint {
  font-size: 11px;
  color: var(--muted);
  padding: 0 16px 10px;
  flex-shrink: 0;
}

/* ── Store list ── */
.store-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.store-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 60px;
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: background 120ms ease;
  user-select: none;
}

.store-item.is-dragging {
  opacity: 0.45;
  background: var(--bg);
}

.store-item.drag-over-top {
  border-top: 2px solid var(--primary);
}

.store-item.drag-over-bot {
  border-bottom: 2px solid var(--primary);
}

.drag-handle {
  font-size: 18px;
  color: var(--muted);
  cursor: grab;
  padding: 4px;
  touch-action: none;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

/* ── Color swatch ── */
.color-wrap {
  position: relative;
  flex-shrink: 0;
}

.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.15);
  cursor: pointer;
  flex-shrink: 0;
}

.color-picker-popup {
  position: absolute;
  top: 30px;
  left: 0;
  z-index: 50;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(4, 28px);
  gap: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

/* ── Emoji ── */
.store-emoji {
  font-size: 18px;
  flex-shrink: 0;
}

/* ── Name ── */
.name-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.name-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  cursor: pointer;
}

.name-text.hidden {
  color: var(--muted);
  text-decoration: line-through;
}

.name-input {
  width: 100%;
  height: 34px;
  border: 1.5px solid var(--primary);
  border-radius: var(--radius);
  padding: 0 8px;
  font-size: 15px;
  background: var(--bg);
  color: var(--text);
  outline: none;
}

/* ── Icons ── */
.icon-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 8px;
  flex-shrink: 0;
  transition: background 120ms;
}

.icon-action:active {
  background: var(--bg);
}

.icon-placeholder {
  width: 36px;
  flex-shrink: 0;
}

/* ── Color option (shared) ── */
.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 100ms;
}

.color-option:active {
  transform: scale(0.9);
}

.color-option.selected {
  border-color: var(--text);
  box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--text);
}

/* ── Add section ── */
.add-section {
  padding: 12px 16px 0;
  flex-shrink: 0;
}

.add-store-btn {
  width: 100%;
  height: 44px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--primary);
  font-weight: 600;
  background: transparent;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-form-row {
  display: flex;
  gap: 8px;
}

.emoji-select {
  width: 58px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 18px;
  text-align: center;
  cursor: pointer;
  flex-shrink: 0;
}

.name-input-new {
  flex: 1;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  font-size: 15px;
  background: var(--bg);
  color: var(--text);
  outline: none;
}

.name-input-new:focus {
  border-color: var(--primary);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.color-grid .color-option {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
}

.add-form-actions {
  display: flex;
  gap: 8px;
}

.btn-confirm {
  flex: 1;
  height: 44px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
}

.btn-cancel {
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  font-size: 14px;
}

.safe-spacer {
  height: calc(16px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
</style>
