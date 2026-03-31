import { ref, computed } from 'vue'
import { useApi } from './useApi'

export interface SharedItem {
  productClientId: string
  quantity: number
  price: number
}

export interface Participant {
  name: string
  isOwner: boolean
}

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
const WS_URL = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')

// Singleton state
const isActive = ref(false)
const isOwner = ref(false)
const shareCode = ref('')
const ownerName = ref('')
const participants = ref<Participant[]>([])
const items = ref<SharedItem[]>([])
const ws = ref<WebSocket | null>(null)
const error = ref('')

type OnUpdateCallback = (items: SharedItem[]) => void
let onUpdate: OnUpdateCallback | null = null

export function useShareSession() {
  const api = useApi()

  const participantCount = computed(() => participants.value.length + 1)

  async function createShare(): Promise<string> {
    const data = await api.post<{ shareCode: string }>('/api/share', {})
    if (!data) throw new Error('Failed to create share')
    shareCode.value = data.shareCode
    isOwner.value = true
    return data.shareCode
  }

  async function validateCode(code: string): Promise<{ ownerName: string }> {
    const data = await api.get<{ ownerName: string }>(`/api/share/${code}`)
    if (!data) throw new Error('Invalid code')
    return data
  }

  function connect(code: string, callbacks?: { onUpdate?: OnUpdateCallback }) {
    if (callbacks?.onUpdate) onUpdate = callbacks.onUpdate

    const token = localStorage.getItem('accessToken')
    if (!token) { error.value = 'Not authenticated'; return }

    const url = `${WS_URL}/ws?shareCode=${code}&token=${token}`
    const socket = new WebSocket(url)
    ws.value = socket
    shareCode.value = code

    socket.onopen = () => {
      isActive.value = true
      error.value = ''
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)

        if (msg.type === 'INIT') {
          ownerName.value = msg.ownerName
          participants.value = msg.participants ?? []
          items.value = msg.items ?? []
          onUpdate?.(items.value)
        } else if (msg.type === 'SESSION_UPDATE') {
          items.value = msg.items ?? []
          onUpdate?.(items.value)
        } else if (msg.type === 'MEMBER_JOIN') {
          participants.value.push({ name: msg.name, isOwner: msg.isOwner })
        } else if (msg.type === 'MEMBER_LEAVE') {
          participants.value = participants.value.filter(p => p.name !== msg.name)
        }
      } catch { /* ignore parse errors */ }
    }

    socket.onerror = () => {
      error.value = 'Помилка з\'єднання'
    }

    socket.onclose = () => {
      isActive.value = false
      participants.value = []
    }
  }

  function disconnect() {
    ws.value?.close()
    ws.value = null
    isActive.value = false
    isOwner.value = false
    shareCode.value = ''
    ownerName.value = ''
    participants.value = []
    items.value = []
    onUpdate = null
  }

  function send(msg: object) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg))
    }
  }

  function toggle(productClientId: string, price: number) {
    send({ type: 'TOGGLE', productClientId, price })
  }

  function setQty(productClientId: string, qty: number) {
    send({ type: 'SET_QTY', productClientId, qty })
  }

  function setPrice(productClientId: string, price: number) {
    send({ type: 'SET_PRICE', productClientId, price })
  }

  async function revokeShare() {
    await api.delete('/api/share')
    disconnect()
  }

  function getShareUrl(code: string): string {
    return `${window.location.origin}/?share=${code}`
  }

  return {
    isActive,
    isOwner,
    shareCode,
    ownerName,
    participants,
    participantCount,
    items,
    error,
    createShare,
    validateCode,
    connect,
    disconnect,
    toggle,
    setQty,
    setPrice,
    revokeShare,
    getShareUrl,
  }
}
