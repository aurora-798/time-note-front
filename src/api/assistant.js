import request from '@/utils/request'

/** AI 助手对话：POST /api/chat */
export function chat(data, { signal } = {}) {
  return request.post('/api/chat', data, { signal })
}
