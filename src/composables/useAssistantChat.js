import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { chatStream } from '@/api/assistant'
import { detectMessageMode } from '@/services/assistant'
import { useUserStore } from '@/store/user'
import { beginAuthRedirect } from '@/utils/auth'

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
  let scrollRaf = null

  async function scrollToBottom() {
    await nextTick()
    const el = listRef.value
    if (el) el.scrollTop = el.scrollHeight
  }

  function scheduleScrollToBottom() {
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null
      scrollToBottom()
    })
  }

  function handleAuthError(message) {
    if (!beginAuthRedirect()) return
    userStore.logout()
    if (router.currentRoute.value.path !== '/login') {
      const redirect = router.currentRoute.value.fullPath
      router.replace({
        path: '/login',
        query: redirect && redirect !== '/login' ? { redirect } : undefined,
      })
    }
    ElMessage.error(message || '请先登录')
  }

  async function sendMessage(text, files = []) {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    if (isLoading.value) return

    if (!userStore.userId) {
      ElMessage.warning('请先登录后再使用 AI 助手')
      return
    }

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
      await chatStream(
        {
          userId: String(userStore.userId),
          userMessage: trimmed,
        },
        {
          signal: abortController.signal,
          onChunk: (chunk) => {
            messages.value[assistantIndex].content += chunk
            scheduleScrollToBottom()
          },
        },
      )

      if (!messages.value[assistantIndex].content) {
        messages.value[assistantIndex].content = '（暂无回复内容）'
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // 用户主动停止，保留已生成内容
      } else if (err?.code === 'UNAUTHORIZED' || err?.status === 401 || err?.status === 403) {
        handleAuthError(err.message)
        messages.value[assistantIndex].content = '（登录已过期，请重新登录后再试。）'
      } else {
        if (!messages.value[assistantIndex].content) {
          messages.value[assistantIndex].content = '（回复生成出错，请稍后再试。）'
        }
        ElMessage.error(err?.message || 'AI 回复失败')
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
