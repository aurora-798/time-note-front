import { ref, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '@/router'
import {
  chatStreamPost,
  fetchSessionList,
  fetchSessionMessages,
  deleteSession,
  SESSION_STORAGE_KEY,
} from '@/api/assistant'
import { parseUserMessage } from '@/services/assistant'
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

function toUiMessage(msg) {
  return {
    id: msg.id ? `db-${msg.id}` : nextId(),
    role: msg.role,
    content: msg.content || '',
    images: [],
    mode: 'normal',
    createdAt: msg.createTime ? new Date(msg.createTime).getTime() : Date.now(),
    streaming: false,
  }
}

function unwrapList(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  return []
}

export function useAssistantChat() {
  const userStore = useUserStore()
  const messages = ref([])
  const sessions = ref([])
  const sessionId = ref(localStorage.getItem(SESSION_STORAGE_KEY) || '')
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

  function persistSessionId(id) {
    sessionId.value = id || ''
    if (id) {
      localStorage.setItem(SESSION_STORAGE_KEY, id)
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  async function refreshSessionList() {
    if (!userStore.userId) return
    try {
      const res = await fetchSessionList(String(userStore.userId))
      sessions.value = unwrapList(res)
    } catch {
      // 列表失败不阻断聊天
    }
  }

  async function loadSessionMessages(id) {
    if (!userStore.userId || !id) {
      messages.value = []
      return
    }
    const res = await fetchSessionMessages(String(userStore.userId), id)
    const list = unwrapList(res)
    messages.value = list.map(toUiMessage)
    await scrollToBottom()
  }

  async function switchSession(id) {
    if (isLoading.value) return
    if (id === sessionId.value) return
    persistSessionId(id)
    await loadSessionMessages(id)
  }

  async function startNewChat() {
    if (isLoading.value) stopGeneration()
    messages.value = []
    persistSessionId('')
  }

  async function removeSession(id) {
    if (!userStore.userId || !id) return
    try {
      await ElMessageBox.confirm('确定删除该对话吗？', '提示', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    await deleteSession(String(userStore.userId), id)
    if (sessionId.value === id) {
      await startNewChat()
    }
    await refreshSessionList()
    ElMessage.success('已删除对话')
  }

  async function sendMessage(text, files = []) {
    const { mode, content } = parseUserMessage(text)
    const trimmed = content.trim()
    if (!trimmed && files.length === 0) return
    if (isLoading.value) return

    if (!userStore.userId) {
      ElMessage.warning('请先登录后再使用 AI 助手')
      return
    }

    const images = files.length > 0 ? await readFilesAsDataUrls(files) : []

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
      const { sessionId: newSessionId } = await chatStreamPost(
        {
          userId: String(userStore.userId),
          userMessage: trimmed,
          sessionId: sessionId.value || undefined,
        },
        {
          signal: abortController.signal,
          onChunk: (chunk) => {
            messages.value[assistantIndex].content += chunk
            scheduleScrollToBottom()
          },
        },
      )

      if (newSessionId) {
        persistSessionId(newSessionId)
      }

      if (!messages.value[assistantIndex].content) {
        messages.value[assistantIndex].content = '（暂无回复内容）'
      }

      await refreshSessionList()
    } catch (err) {
      if (err?.name === 'AbortError') {
        // 用户主动停止
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
    startNewChat()
  }

  onMounted(async () => {
    if (!userStore.userId) return
    await refreshSessionList()
    if (sessionId.value) {
      try {
        await loadSessionMessages(sessionId.value)
      } catch {
        persistSessionId('')
      }
    }
  })

  return {
    messages,
    sessions,
    sessionId,
    isLoading,
    listRef,
    sendMessage,
    stopGeneration,
    clearMessages,
    startNewChat,
    switchSession,
    removeSession,
    refreshSessionList,
  }
}
