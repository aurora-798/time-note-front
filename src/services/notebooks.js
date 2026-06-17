import {
  createDiaryBook,
  deleteDiaryBook,
  editDiaryBook,
  listDiaryBooks,
  getDiaryBook,
  verifyDiaryBookPassword,
} from '@/api/diarybook'
import { fetchAllDiaries, getDiary, addDiary, editDiary, deleteDiary } from '@/api/diary'

// —— 预设封面 ——
const COVER_CDN_BASE = 'http://tgldl5vcp.hn-bkt.clouddn.com/cover'

export const COVER_PRESETS = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i + 1}`,
  url: `${COVER_CDN_BASE}/cover-${i + 1}.png`,
}))

// —— 可选字体 ——
export const FONT_OPTIONS = [
  { id: 'default', label: '默认圆体', family: "'PingFang SC','Microsoft YaHei',sans-serif" },
  { id: 'song', label: '宋体', family: "'Songti SC','SimSun',serif" },
  { id: 'kai', label: '楷体', family: "'Kaiti SC','KaiTi',serif" },
  { id: 'hei', label: '黑体', family: "'Heiti SC','SimHei',sans-serif" },
]

// —— 日记本列表缓存 ——
let booksCache = null
/** 递增后使进行中的 list 请求结果作废，避免并发时旧响应覆盖新缓存 */
let listFetchGen = 0

export function clearBooksCache() {
  booksCache = null
  listFetchGen += 1
}

// ============================================================
//  数据转换
// ============================================================

function coverPresetUrl(id) {
  const preset = COVER_PRESETS.find((c) => c.id === id)
  return preset ? preset.url : COVER_PRESETS[0].url
}

function detectCoverType(url) {
  if (!url) return { coverType: 'preset', cover: 'c1' }
  const match = COVER_PRESETS.find((c) => c.url === url)
  if (match) return { coverType: 'preset', cover: match.id }
  return { coverType: 'custom', cover: url }
}

function resolveCoverValue(coverType, cover) {
  if (coverType === 'custom') return cover || ''
  return coverPresetUrl(cover)
}

function asId(value) {
  if (value == null || value === '') return value
  return String(value)
}

/** 解析后端时间字符串（如 2026-06-17 09:15） */
function parseBackendDateTime(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const str = String(value).trim()
  if (!str) return 0
  const normalized = str.includes('T') ? str : str.replace(' ', 'T')
  const ts = new Date(normalized).getTime()
  return Number.isFinite(ts) ? ts : 0
}

/** 日记本创建时间展示（年月日） */
export function formatNotebookDate(value) {
  const ts = typeof value === 'number' ? value : parseBackendDateTime(value)
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

/** 后端 SysDiaryBook / SysDiaryBookFindVo → 前端 notebook */
function toFrontendBook(b, entryCount = 0) {
  if (!b) return null
  const { coverType, cover } = detectCoverType(b.cover)
  return {
    id: asId(b.id),
    name: b.name || '',
    coverType,
    cover,
    font: b.font || 'default',
    encrypted: b.encrypted === 1,
    createTime: parseBackendDateTime(b.createTime),
    entryCount: Number(entryCount) || 0,
  }
}

/** 后端 SysDiaryBookListVo → 前端 notebook */
function toFrontendBookFromListItem(item) {
  return toFrontendBook(item?.sysDiaryBookFindVo, item?.entryCount)
}

/** 后端 SysDiary → 前端 entry */
function toFrontendEntry(e) {
  return {
    id: asId(e.id),
    bookId: asId(e.bookId),
    title: e.title || '',
    content: e.content || '',
    mood: '📖',
    location: { city: e.name || '', district: e.adm2 || '' },
    weather: {
      condition: e.text || '',
      temperature: e.temp != null && e.temp !== '' ? Number(e.temp) : null,
    },
    date: e.diaryDate || '',
    wordCount: e.wordCount || 0,
    createTime: e.createTime ? new Date(e.createTime).getTime() : Date.now(),
    updateTime: e.updateTime ? new Date(e.updateTime).getTime() : Date.now(),
  }
}

// ============================================================
//  日记本 CRUD
// ============================================================

/** 获取所有日记本（带缓存，create/delete/edit 时自动失效） */
export async function listNotebooks({ refresh = false } = {}) {
  if (!refresh && booksCache) return booksCache

  const fetchGen = listFetchGen
  const items = await listDiaryBooks()

  // 请求期间缓存已被清空（如刚创建/删除），丢弃过期响应
  if (fetchGen !== listFetchGen) {
    if (booksCache) return booksCache
    return listNotebooks({ refresh: true })
  }

  const list = Array.isArray(items) ? items : items?.list || []

  booksCache = list
    .map(toFrontendBookFromListItem)
    .filter(Boolean)
    .sort((a, b) => b.createTime - a.createTime || String(b.id).localeCompare(String(a.id)))

  return booksCache
}

/** 按 id 拉取最新日记本（编辑后刷新等场景） */
export async function getNotebook(id) {
  const data = await getDiaryBook(id)
  return toFrontendBook(data, 0)
}

/** 优先用列表缓存解析日记本；无缓存时按 id 获取，不拉全量 list */
export async function resolveNotebook(id) {
  const targetId = asId(id)

  if (booksCache) {
    const cached = booksCache.find((b) => b.id === targetId)
    if (cached) return cached
  }

  return getNotebook(id)
}

/** 创建日记本（仅提交创建请求并失效缓存，列表由页面侧 refresh 拉取） */
export async function createNotebook({ name, coverType, cover, coverFileName, coverFileSize, coverSuffix, font, encrypted, password }) {
  await createDiaryBook({
    name: name.trim(),
    cover: resolveCoverValue(coverType, cover),
    coverFileName: coverFileName || '',
    coverFileSize: coverFileSize || 0,
    coverSuffix: coverSuffix || '',
    font: font || 'default',
    encrypted: encrypted ? 1 : 0,
    password: encrypted && password ? password : '',
  })
  clearBooksCache()
}

/** 编辑日记本 */
export async function updateNotebook(id, patch) {
  await editDiaryBook({
    bookId: asId(id),
    name: String(patch.name || '').trim(),
  })
  clearBooksCache()
  return getNotebook(id)
}

/** 删除日记本 */
export async function deleteNotebook(id) {
  await deleteDiaryBook({ bookId: asId(id) })
  clearBooksCache()
}

/** 验证日记本密码 */
export async function verifyNotebookPassword(id, password) {
  try {
    await verifyDiaryBookPassword({ bookId: asId(id), password })
    return true
  } catch {
    return false
  }
}

// ============================================================
//  日记条目 CRUD
// ============================================================

/** 获取某日记本下所有日记（按标准 pageSize 分页循环拉取） */
export async function listEntries(bookId) {
  const records = await fetchAllDiaries({ bookId: asId(bookId) })
  return records
    .map(toFrontendEntry)
    .sort((a, b) => b.createTime - a.createTime)
}

/** 获取单篇日记 */
export async function getEntry(bookId, entryId) {
  const data = await getDiary(bookId, entryId)
  // getDiary 返回 SysDiaryFindVo（不含 id/bookId），用请求参数补全
  return toFrontendEntry({
    ...data,
    id: asId(entryId),
    bookId: asId(bookId),
  })
}

/** 保存日记（新建或编辑） */
export async function saveEntry(bookId, entry) {
  if (entry.id && !String(entry.id).startsWith('local-')) {
    await editDiary({
      bookId: asId(bookId),
      id: asId(entry.id),
      title: entry.title || '',
      content: entry.content || '',
    })
    return { ...entry, id: asId(entry.id) }
  }

  // 新建日记（后端不返回新记录详情，由调用方决定是否刷新列表）
  await addDiary({
    bookId: asId(bookId),
    title: entry.title || '',
    content: entry.content || '',
    name: entry.location?.city || '',
    adm2: entry.location?.district || '',
    text: entry.weather?.condition || '',
    temp: entry.weather?.temperature != null ? String(entry.weather.temperature) : '',
  })

  clearBooksCache()
}

/** 删除日记 */
export async function deleteEntry(bookId, entryId) {
  await deleteDiary({ id: asId(entryId) })
  clearBooksCache()
}

// ============================================================
//  工具函数
// ============================================================

export function coverPreset(id) {
  return COVER_PRESETS.find((c) => c.id === id) || COVER_PRESETS[0]
}

export function notebookCoverUrl(coverType, cover) {
  if (coverType === 'custom') return cover
  return coverPresetUrl(cover)
}

export function fontFamily(id) {
  return (FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0]).family
}
