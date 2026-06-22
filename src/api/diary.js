import request from '@/utils/request'

export const DIARY_PAGE_SIZE = 20

// 分页查询日记
export function pageDiaries(data) {
  return request.post('/api/diary/page', data)
}

/** 按标准分页循环拉取，合并全部 records */
export async function fetchAllDiaries(params = {}) {
  const pageSize = params.pageSize ?? DIARY_PAGE_SIZE
  let pageNum = 1
  const records = []

  while (true) {
    const data = await pageDiaries({ ...params, pageNum, pageSize })
    const batch = data.records || []
    records.push(...batch)

    const pages = Number(data.pages) || 1
    if (pageNum >= pages || batch.length === 0) break
    pageNum += 1
  }

  return records
}

// 根据日记本 ID 和日记 ID 查询单条日记
export function getDiary(bookId, diaryId, password) {
  const body = password ? { password } : {}
  return request.post(`/api/diary/${bookId}/${diaryId}`, body)
}

// 根据 ID 查询日记（用于仅有 diaryId 的场景，通过分页接口查找）
export async function getDiaryById(id) {
  let pageNum = 1
  const targetId = String(id)

  while (true) {
    const data = await pageDiaries({ pageNum, pageSize: DIARY_PAGE_SIZE })
    const records = data.records || []
    const found = records.find((r) => String(r.id) === targetId)
    if (found) return found

    const pages = Number(data.pages) || 1
    if (pageNum >= pages || records.length === 0) break
    pageNum += 1
  }

  throw new Error('日记不存在')
}

// 新增日记
export function addDiary(data) {
  return request.post('/api/diary/create', data)
}

// 编辑日记
export function editDiary(data) {
  return request.post('/api/diary/edit', data)
}

// 删除日记
export function deleteDiary(data) {
  return request.post('/api/diary/delete', data)
}

// 根据经纬度获取气象数据
export function getWeather(data) {
  return request.post('/api/diary/weather', data, { skipErrorHandler: true })
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
