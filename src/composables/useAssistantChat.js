import { ref, nextTick } from 'vue'
import { chat } from '@/api/assistant'
import { detectMessageMode } from '@/services/assistant'
import { useUserStore } from '@/store/user'

let idCounter = 0
function nextId() {
  idCounter += 1
  return `msg-${Date.now()}-${idCounter}`
}

function readFilesAsDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) =>
            resolve({ name: file.name, url: e.target?.result || '', type: file.type })
          reader.readAsDataURL(file)
        }),
    ),
  )
}

export function useAssistantChat() {
  const userStore = useUserStore()
  const messages = ref([])
  const isLoading = ref(false)
  const listRef = ref(null)
  let abortController = null

  async function scrollToBottom() {
    await nextTick()
    const el = listRef.value
    if (el) el.scrollTop = el.scrollHeight
  }

  async function sendMessage(text, files = []) {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    if (isLoading.value) return

    const images = files.length > 0 ? await readFilesAsDataUrls(files) : []
    const mode = detectMessageMode(trimmed)

    const userMsg = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      images,
      mode,
      createdAt: Date.now(),
      streaming: false,
    }
    messages.value.push(userMsg)
    await scrollToBottom()

    const assistantMsg = {
      id: nextId(),
      role: 'assistant',
      content: '',
      images: [],
      mode,
      createdAt: Date.now(),
      streaming: true,
    }
    messages.value.push(assistantMsg)
    const assistantIndex = messages.value.length - 1

    isLoading.value = true
    abortController = new AbortController()

    try {
      const data = await chat(
        {
          userId: userStore.userId != null ? String(userStore.userId) : '',
          userMessage: trimmed,
        },
        { signal: abortController.signal },
      )
      messages.value[assistantIndex].content = data?.result || ''
      await scrollToBottom()
    } catch (err) {
      if (err?.name !== 'AbortError') {
        messages.value[assistantIndex].content = '（回复生成出错，请稍后再试。）'
      }
    } finally {
      messages.value[assistantIndex].streaming = false
      isLoading.value = false
      abortController = null
      await scrollToBottom()
    }
  }

  function stopGeneration() {
    abortController?.abort()
    isLoading.value = false
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant' && last.streaming) {
      last.streaming = false
    }
  }

  function clearMessages() {
    if (isLoading.value) stopGeneration()
    messages.value = []
  }

  return {
    messages,
    isLoading,
    listRef,
    sendMessage,
    stopGeneration,
    clearMessages,
  }
}
