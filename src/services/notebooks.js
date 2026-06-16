/* ============================================================
   日记本数据适配层（Notebook Data Adapter）
   ------------------------------------------------------------
   现阶段：全部用 localStorage 跑通，自带演示数据。
   预留接口位：每个方法都对应一个后端 API（见 TODO），
   后端补齐「日记本」实体后，把方法体替换为 request 调用即可，
   组件层无需改动。

   建议后端实体：
     SysDiaryBook { id, userId, name, cover, coverType, font,
                    encrypted, passwordHash, createTime }
     SysDiary 增加字段：bookId（关联日记本）、location、weather
   建议接口：
     GET    /api/diary-book/page?userId=
     POST   /api/diary-book
     DELETE /api/diary-book/{id}
     GET    /api/diary/page?bookId=
     ...（沿用现有 /api/diary 增删改查，新增 bookId 过滤）
   ============================================================ */

// —— 预设封面（对象存储外链，cover-{n}.png 对应 c{n}）——
const COVER_CDN_BASE = 'http://tgldl5vcp.hn-bkt.clouddn.com/cover'

export const COVER_PRESETS = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i + 1}`,
  url: `${COVER_CDN_BASE}/cover-${i + 1}.png`,
}))

// —— 可选字体（占位：用系统字体族名，后续可换成网络字体）——
export const FONT_OPTIONS = [
  { id: 'default', label: '默认圆体', family: "'PingFang SC','Microsoft YaHei',sans-serif" },
  { id: 'song', label: '宋体', family: "'Songti SC','SimSun',serif" },
  { id: 'kai', label: '楷体', family: "'Kaiti SC','KaiTi',serif" },
  { id: 'hei', label: '黑体', family: "'Heiti SC','SimHei',sans-serif" },
]

function currentUserId() {
  return localStorage.getItem('userId') || 'guest'
}

function nsKey(suffix) {
  return `tn-nb:${currentUserId()}:${suffix}`
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// 简单可逆混淆（演示用，非真实加密）。TODO: 接后端时改为服务端校验。
function obfuscate(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    return str
  }
}

const DEMO_MOODS = ['😊', '🌧️', '📖', '☀️', '🌙', '🍃', '✨', '🌸', '🍊', '🦄']

const DEMO_LOCATIONS = [
  { city: '潍坊市', district: '寒亭区' },
  { city: '青岛市', district: '市南区' },
  { city: '济南市', district: '历下区' },
  { city: '烟台市', district: '芝罘区' },
  { city: '威海市', district: '环翠区' },
  { city: '淄博市', district: '张店区' },
  { city: '临沂市', district: '兰山区' },
  { city: '泰安市', district: '泰山区' },
]

const DEMO_WEATHERS = [
  { condition: '多云', temperature: 25 },
  { condition: '晴', temperature: 28 },
  { condition: '阴', temperature: 22 },
  { condition: '小雨', temperature: 18 },
  { condition: '雷阵雨', temperature: 26 },
  { condition: '雾', temperature: 15 },
  { condition: '小雪', temperature: 3 },
  { condition: '大风', temperature: 12 },
]

/** 按索引选取演示用的位置与天气（后续可替换为接口数据） */
export function pickDemoLocationWeather(seed = 0) {
  const i = Math.abs(Number(seed) || 0)
  return {
    location: DEMO_LOCATIONS[i % DEMO_LOCATIONS.length],
    weather: DEMO_WEATHERS[i % DEMO_WEATHERS.length],
  }
}

/** 生成长正文，用于测试正文分页（约 280 字/页） */
function longContent(pages = 5) {
  const paragraph =
    '今天走在校园里，阳光透过树叶洒下斑驳的光影。我停下脚步，深吸一口气，感受着微风拂过脸颊的温柔。这样的时刻总让人想写点什么，把心里的感受慢慢记录下来，留给未来的自己回顾。'
  const targetLen = pages * 280
  let text = ''
  while (text.length < targetLen) {
    text += paragraph
    if (text.length < targetLen) text += '\n\n'
  }
  return text
}

/** 生成足够触发目录分页（>8 篇）与正文分页的演示条目 */
function buildPaginationDemoEntries(bookId, baseTime, count = 22) {
  const entries = []
  for (let i = 0; i < count; i++) {
    const t = baseTime - i * 3600000 * 6
    const day = new Date(t).toISOString().slice(0, 10)
    const { location, weather } = pickDemoLocationWeather(i)
    entries.push({
      id: uid(),
      bookId,
      title: `测试日记 ${String(i + 1).padStart(2, '0')}`,
      content:
        i === 0
          ? longContent(5)
          : `这是第 ${i + 1} 篇日记，用于测试左侧目录的分页与搜索功能。日期：${day}。`,
      mood: DEMO_MOODS[i % DEMO_MOODS.length],
      location,
      weather,
      date: day,
      createTime: t,
      updateTime: t,
    })
  }
  return entries
}

function ensurePaginationDemoData() {
  const flag = nsKey('pagination-demo-v1')
  if (localStorage.getItem(flag)) return

  ensureSeed()
  const books = read(nsKey('books'), [])
  if (!books.length) {
    localStorage.setItem(flag, '1')
    return
  }

  const bookId = books[0].id
  let entries = read(nsKey(`entries:${bookId}`), [])
  const targetCount = 22

  if (entries.length < targetCount) {
    const baseTime = Date.now()
    const start = entries.length
    const extra = buildPaginationDemoEntries(bookId, baseTime - start * 3600000 * 6, targetCount - start)
    extra.forEach((e, i) => {
      e.title = `测试日记 ${String(start + i + 1).padStart(2, '0')}`
      e.content =
        start + i === 0 && entries.length === 0
          ? longContent(5)
          : `这是第 ${start + i + 1} 篇日记，用于测试左侧目录的分页与搜索功能。`
    })
    entries = [...entries, ...extra]
  }

  if (entries.length && entries[0].content.length < 600) {
    entries[0] = {
      ...entries[0],
      title: entries[0].title || '长文测试：新的开始',
      content: longContent(5),
    }
  }

  write(nsKey(`entries:${bookId}`), entries)
  localStorage.setItem(flag, '1')
}

function ensureEntryLocationWeather() {
  const flag = nsKey('location-weather-v1')
  if (localStorage.getItem(flag)) return

  ensureSeed()
  const books = read(nsKey('books'), [])
  books.forEach((book) => {
    const key = nsKey(`entries:${book.id}`)
    const entries = read(key, [])
    if (!entries.length) return
    let changed = false
    const next = entries.map((e, i) => {
      if (e.location && e.weather) return e
      changed = true
      const demo = pickDemoLocationWeather(i + e.createTime)
      return {
        ...e,
        location: e.location || demo.location,
        weather: e.weather || demo.weather,
      }
    })
    if (changed) write(key, next)
  })
  localStorage.setItem(flag, '1')
}

function ensureSeed() {
  const seededFlag = nsKey('seeded')
  if (localStorage.getItem(seededFlag)) return
  const now = Date.now()
  const books = [
    {
      id: uid(),
      name: '第一篇日记',
      coverType: 'preset',
      cover: 'c1',
      font: 'default',
      encrypted: false,
      passwordHash: '',
      createTime: now,
    },
    {
      id: uid(),
      name: '夏日海边',
      coverType: 'preset',
      cover: 'c2',
      font: 'default',
      encrypted: false,
      passwordHash: '',
      createTime: now - 86400000,
    },
  ]
  write(nsKey('books'), books)
  write(nsKey(`entries:${books[0].id}`), buildPaginationDemoEntries(books[0].id, now))
  write(nsKey(`entries:${books[1].id}`), [
    {
      id: uid(),
      bookId: books[1].id,
      title: '海边的早晨',
      content: longContent(4),
      mood: '🌊',
      ...pickDemoLocationWeather(0),
      date: new Date(now - 86400000).toISOString().slice(0, 10),
      createTime: now - 86400000,
      updateTime: now - 86400000,
    },
    ...buildPaginationDemoEntries(books[1].id, now - 86400000 * 2, 10),
  ])
  localStorage.setItem(seededFlag, '1')
}

function ensureShelfDemoFill() {
  const flag = nsKey('shelf-fill-v1')
  if (localStorage.getItem(flag)) return

  ensureSeed()
  const books = read(nsKey('books'), [])
  const now = Date.now()
  const demoNames = [
    '春日随笔',
    '旅行记忆',
    '工作总结',
    '读书笔记',
    '梦境碎片',
    '咖啡时光',
    '雨夜心情',
    '成长记录',
    '美食探店',
    '健身打卡',
    '音乐合集',
    '电影观后',
    '学习笔记',
    '育儿日记',
    '宠物日常',
    '周末计划',
    '灵感速写',
  ]
  const covers = ['c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12']
  const fonts = ['default', 'song', 'kai', 'hei']

  demoNames.forEach((name, i) => {
    const id = uid()
    const createTime = now - (i + 3) * 86400000
    const encrypted = i === 2 || i === 9
    books.push({
      id,
      name,
      coverType: 'preset',
      cover: covers[i % covers.length],
      font: fonts[i % fonts.length],
      encrypted,
      passwordHash: encrypted ? obfuscate('123456') : '',
      createTime,
    })
    write(nsKey(`entries:${id}`), [
      {
        id: uid(),
        bookId: id,
        title: `${name} · 开篇`,
        content: '这是一本用于填充书架展示的演示日记本，滚动页面即可浏览更多日记本卡片。',
        mood: DEMO_MOODS[i % DEMO_MOODS.length],
        ...pickDemoLocationWeather(i),
        date: new Date(createTime).toISOString().slice(0, 10),
        createTime,
        updateTime: createTime,
      },
    ])
  })

  write(nsKey('books'), books)
  localStorage.setItem(flag, '1')
}

// —— 日记本 CRUD ——

export function listNotebooks() {
  ensureSeed()
  ensureShelfDemoFill()
  // TODO: return request.get('/api/diary-book/page', { params:{ userId } })
  const books = read(nsKey('books'), [])
  return books
    .map((b) => ({ ...b, entryCount: listEntries(b.id).length }))
    .sort((a, b) => b.createTime - a.createTime)
}

export function getNotebook(id) {
  return read(nsKey('books'), []).find((b) => b.id === id) || null
}

export function createNotebook({ name, coverType, cover, font, encrypted, password }) {
  // TODO: return request.post('/api/diary-book', {...})
  const books = read(nsKey('books'), [])
  const book = {
    id: uid(),
    name: name.trim(),
    coverType: coverType || 'preset',
    cover: cover || 'c1',
    font: font || 'default',
    encrypted: !!encrypted,
    passwordHash: encrypted && password ? obfuscate(password) : '',
    createTime: Date.now(),
  }
  books.push(book)
  write(nsKey('books'), books)
  return book
}

export function updateNotebook(id, patch) {
  // TODO: return request.put(`/api/diary-book/${id}`, patch)
  const books = read(nsKey('books'), [])
  const idx = books.findIndex((b) => b.id === id)
  if (idx < 0) return null
  const next = { ...books[idx], ...patch }
  if (patch.name !== undefined) next.name = String(patch.name).trim()
  books[idx] = next
  write(nsKey('books'), books)
  return next
}

export function deleteNotebook(id) {
  // TODO: return request.delete(`/api/diary-book/${id}`)
  const books = read(nsKey('books'), []).filter((b) => b.id !== id)
  write(nsKey('books'), books)
  localStorage.removeItem(nsKey(`entries:${id}`))
}

export function verifyNotebookPassword(id, password) {
  const book = getNotebook(id)
  if (!book || !book.encrypted) return true
  return book.passwordHash === obfuscate(password)
}

// —— 日记条目 CRUD（隶属某个日记本）——

export function listEntries(bookId) {
  ensurePaginationDemoData()
  ensureEntryLocationWeather()
  // TODO: return request.get('/api/diary/page', { params:{ bookId } })
  return read(nsKey(`entries:${bookId}`), []).sort((a, b) => b.createTime - a.createTime)
}

export function getEntry(bookId, entryId) {
  return listEntries(bookId).find((e) => e.id === entryId) || null
}

export function saveEntry(bookId, entry, { prepend = false } = {}) {
  // TODO: POST/PUT /api/diary（带 bookId）
  const entries = read(nsKey(`entries:${bookId}`), [])
  const now = Date.now()
  if (entry.id) {
    const idx = entries.findIndex((e) => e.id === entry.id)
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], ...entry, updateTime: now }
      write(nsKey(`entries:${bookId}`), entries)
      return entries[idx]
    }
  }
  const demo = pickDemoLocationWeather(now)
  const created = {
    id: uid(),
    bookId,
    title: entry.title || '',
    content: entry.content || '',
    mood: entry.mood || '',
    location: entry.location || demo.location,
    weather: entry.weather || demo.weather,
    date: entry.date || new Date(now).toISOString().slice(0, 10),
    media: entry.media || [],
    createTime: now,
    updateTime: now,
  }
  if (prepend) entries.unshift(created)
  else entries.push(created)
  write(nsKey(`entries:${bookId}`), entries)
  return created
}

export function deleteEntry(bookId, entryId) {
  // TODO: DELETE /api/diary/{id}
  const entries = read(nsKey(`entries:${bookId}`), []).filter((e) => e.id !== entryId)
  write(nsKey(`entries:${bookId}`), entries)
}

export function coverPreset(id) {
  return COVER_PRESETS.find((c) => c.id === id) || COVER_PRESETS[0]
}

/** 解析日记本封面外链（预设或自定义） */
export function notebookCoverUrl(coverType, cover) {
  if (coverType === 'custom') return cover
  return coverPreset(cover).url
}

export function fontFamily(id) {
  return (FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0]).family
}
