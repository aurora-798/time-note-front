// import request from '@/utils/request'

// TODO: 后端「AI 助手对话」接口（POST /api/assistant/chat，SSE 流式）补齐后接入：
// export function chatStream(payload, onChunk, { signal } = {}) {
//   return request.post('/api/assistant/chat', payload, {
//     responseType: 'stream',
//     onDownloadProgress: (e) => { /* parse SSE chunks, call onChunk */ },
//     signal,
//   })
// }

// TODO: 非流式一次性回复
// export function chatOnce(payload) {
//   return request.post('/api/assistant/chat/once', payload)
// }

export function chatStream() {
  return Promise.reject(new Error('AI 助手接口尚未接入，请使用 services/assistant.js mock'))
}
