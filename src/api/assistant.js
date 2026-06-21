import { API_BASE } from '@/utils/url'
import { isTokenExpired } from '@/utils/auth'

/**
 * 从 SSE 缓冲区解析完整事件，返回 { events, rest }
 * 兼容 Spring WebFlux Flux<String>（data: xxx\n\n）及纯文本流
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

/**
 * AI 助手对话（SSE 流式）：GET /api/chat
 * @param {{ userId: string, userMessage: string }} params
 * @param {{ signal?: AbortSignal, onChunk?: (text: string) => void }} options
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
