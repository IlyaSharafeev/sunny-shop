import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

// Module-level singleton — accessible from anywhere (stores, useApi, components)
const state = reactive<{ items: Toast[] }>({ items: [] })
let _id = 0

function add(type: ToastType, message: string, duration: number) {
  const id = _id++
  state.items.push({ id, type, message })
  setTimeout(() => remove(id), duration)
}

function remove(id: number) {
  const i = state.items.findIndex(t => t.id === id)
  if (i !== -1) state.items.splice(i, 1)
}

export function useToast() {
  return {
    items: state.items,
    success: (msg: string, dur = 3500) => add('success', msg, dur),
    error:   (msg: string, dur = 5000) => add('error',   msg, dur),
    warning: (msg: string, dur = 4000) => add('warning', msg, dur),
    info:    (msg: string, dur = 3500) => add('info',    msg, dur),
    remove,
  }
}
