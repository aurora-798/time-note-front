import { API_BASE } from '@/utils/url'
import { isTokenExpired } from '@/utils/auth'
import request from '@/utils/request'

export const SESSION_STORAGE_KEY = 'assistant_session_id'
export const SESSION_HEADER = 'X-Chat-Session-Id'

/**
 * 从 SSE 缓冲区解析完整事件，返回 { events, rest }
 */
export function parseSSEBuffer(buffer) {
  const events = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const dataLines = []
    let hasDataPrefix = false

    for (const line of part.split('\n')) {
      if (line.startsWith('data:')) {
        hasDataPrefix = true
        dataLines.push(line.slice(5).replace(/^\s/, ''))
      } else if (line.startsWith('event:') || line.startsWith('id:') || line.startsWith('retry:')) {
        // ignore SSE metadata
      } else if (line.startsWith(':')) {
        // comment line
      } else if (!hasDataPrefix) {
        dataLines.push(line)
      }
    }

    if (dataLines.length) {
      events.push(dataLines.join('\n'))
    }
  }

  return { events, rest }
}

function authHeaders() {
  const token = localStorage.getItem('token') || ''
  if (token && isTokenExpired(token)) {
    throw Object.assign(new Error('登录已过期，请重新登录'), { code: 'UNAUTHORIZED' })
  }
  return {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function consumeSseResponse(res, onChunk) {
  if (!res.ok) {
    const err = new Error(
      res.status === 401 || res.status === 403
        ? '登录已过期，请重新登录'
        : `请求失败（${res.status}）`,
    )
    err.status = res.status
    throw err
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('无法读取流式响应')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  const contentType = res.headers.get('content-type') || ''
  const isSSE = contentType.includes('text/event-stream')

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      if (!chunk) continue

      if (isSSE) {
        buffer += chunk
        const { events, rest } = parseSSEBuffer(buffer)
        buffer = rest
        for (const data of events) {
          if (data) onChunk?.(data)
        }
      } else {
        onChunk?.(chunk)
      }
    }

    if (isSSE && buffer.trim()) {
      const { events } = parseSSEBuffer(`${buffer}\n\n`)
      for (const data of events) {
        if (data) onChunk?.(data)
      }
    } else if (!isSSE && buffer) {
      onChunk?.(buffer)
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 单轮聊天（GET，向后兼容）
 */
export async function chatStream({ userId, userMessage }, { signal, onChunk } = {}) {
  const token = localStorage.getItem('token') || ''
  if (token && isTokenExpired(token)) {
    throw Object.assign(new Error('登录已过期，请重新登录'), { code: 'UNAUTHORIZED' })
  }

  const params = new URLSearchParams({
    userId: userId ?? '',
    userMessage: userMessage ?? '',
  })

  const res = await fetch(`${API_BASE}/api/chat?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  })

  await consumeSseResponse(res, onChunk)
}

/**
 * 多轮 RAG 聊天（POST SSE）
 * @returns {Promise<{ sessionId: string | null }>}
 */
export async function chatStreamPost(
  { userId, userMessage, sessionId },
  { signal, onChunk } = {},
) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      userId: userId ?? '',
      userMessage: userMessage ?? '',
      sessionId: sessionId ?? undefined,
    }),
    signal,
  })

  const newSessionId = res.headers.get(SESSION_HEADER)
  await consumeSseResponse(res, onChunk)
  return { sessionId: newSessionId }
}

export function fetchSessionList(userId) {
  return request.get('/api/chat/sessions', { params: { userId } })
}

export function fetchSessionMessages(userId, sessionId) {
  return request.get(`/api/chat/sessions/${sessionId}/messages`, { params: { userId } })
}

export function deleteSession(userId, sessionId) {
  return request.delete(`/api/chat/sessions/${sessionId}`, { params: { userId } })
}
