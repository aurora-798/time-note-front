import request from '@/utils/request'

// 分页查询日记
export function pageDiaries(params) {
  return request.get('/api/diary/page', { params })
}

// 根据 ID 查询日记
export function getDiaryById(id) {
  return request.get(`/api/diary/${id}`)
}

// 新增日记
export function addDiary(data) {
  return request.post('/api/diary', data)
}

// 更新日记
export function updateDiary(data) {
  return request.put('/api/diary', data)
}

// 删除日记
export function deleteDiary(id) {
  return request.delete(`/api/diary/${id}`)
}

// TODO: 后端暂无「AI 润色日记」接口。
// 写日记页流程：用户在编辑区写下当天内容 → 点「润色」→ 携带「当前正文 + 本次润色需求」
// 调用 AI，流式返回润色后的 Markdown 日记（不保存对话历史，每次只基于当前正文润色）。
// 预期：POST /api/diary/polish，入参 { content, requirement, style }，
// 以 SSE / 流式分片返回 Markdown 文本。后端补齐后接入下面实现：
//
// 流式（推荐，配合 EventSource 或 fetch ReadableStream）：
//   export async function polishDiaryStream({ content, requirement, style }, onChunk) {
//     const res = await fetch(`${API_BASE}/api/diary/polish`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
//       },
//       body: JSON.stringify({ content, requirement, style }),
//     })
//     const reader = res.body.getReader()
//     const decoder = new TextDecoder()
//     while (true) {
//       const { value, done } = await reader.read()
//       if (done) break
//       onChunk(decoder.decode(value, { stream: true }))
//     }
//   }
//
// 非流式（备选）：
//   export function polishDiary(data) {
//     return request.post('/api/diary/polish', data)
//   }
//
// 另：若后端先提供「根据素材生成日记」(POST /api/diary/generate, 入参 { sourceContent, style })，
// 返回 { title, content, wordCount }，也在此接入。
