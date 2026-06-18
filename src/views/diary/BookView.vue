<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, EditPen, Plus, Delete, Search, Check, Setting, Calendar } from '@element-plus/icons-vue'
import {
  resolveNotebook,
  listEntries,
  deleteEntry,
  saveEntry,
  updateNotebook,
  notebookCoverUrl,
  fontFamily,
  formatNotebookDate,
} from '@/services/notebooks'
import { getWeather } from '@/api/diary'

const route = useRoute()
const router = useRouter()

const bookId = route.params.bookId
const book = ref(null)
const entries = ref([])
const entriesLoaded = ref(false)
const entriesLoading = ref(false)
const opened = ref(false)
const index = ref(0)
const flipDir = ref('') // 'next' | 'prev'
const flipping = ref(false)
const leafContentPage = ref(null) // 正文翻页动画时，书页上停留的页码
const FLIP_MS = 900
const TITLE_MAX_LEN = 15
const BOOK_NAME_MAX_LEN = 10
const TOC_PAGE_SIZE = 7
const COVER_ANGLE_KEY = 'tn-cover-open-angle'
const DEFAULT_COVER_OPEN_ANGLE = 155

function readCoverOpenAngle() {
  const raw = localStorage.getItem(COVER_ANGLE_KEY)
  const n = raw != null ? Number(raw) : DEFAULT_COVER_OPEN_ANGLE
  if (!Number.isFinite(n)) return DEFAULT_COVER_OPEN_ANGLE
  return Math.min(180, Math.max(0, Math.round(n)))
}

const coverOpenAngle = ref(readCoverOpenAngle())
const settingsVisible = ref(false)

const searchQuery = ref('')
const tocPage = ref(0)
const contentPage = ref(0)
const contentPages = ref([''])
const contentAreaHeight = ref(0)
const entryContentRef = ref(null)
const entryContentInputRef = ref(null)
const entryContentSlotRef = ref(null)
const titleInputRef = ref(null)

const editMode = ref(null) // null | 'new' | 'edit'
const draftTitle = ref('')
const draftContent = ref('')
const draftBookName = ref('')

let contentObserver = null

const bookFont = computed(() => (book.value ? fontFamily(book.value.font) : 'inherit'))
const stageWrapStyle = computed(() => ({
  '--cover-open-angle': `${coverOpenAngle.value}deg`,
}))
const current = computed(() => entries.value[index.value] || null)

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = entries.value.map((entry, i) => ({ entry, index: i }))
  if (!q) return list
  return list.filter(({ entry }) => {
    const title = (entry.title || '').toLowerCase()
    const content = (entry.content || '').toLowerCase()
    const date = (entry.date || '').toLowerCase()
    return title.includes(q) || content.includes(q) || date.includes(q)
  })
})

const tocTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredEntries.value.length / TOC_PAGE_SIZE))
)

const tocPageItems = computed(() => {
  const start = tocPage.value * TOC_PAGE_SIZE
  return filteredEntries.value.slice(start, start + TOC_PAGE_SIZE)
})

const contentTotalPages = computed(() => Math.max(1, contentPages.value.length))
const contentSlice = computed(() => contentPages.value[contentPage.value] || '')
const contentAreaStyle = computed(() =>
  contentAreaHeight.value > 0 ? { height: `${contentAreaHeight.value}px` } : undefined
)
const isEditing = computed(() => editMode.value !== null)

function contentMetrics() {
  const el = entryContentRef.value || entryContentInputRef.value || entryContentSlotRef.value
  if (!el) return { lineHeight: 30 }
  const style = getComputedStyle(el)
  const fontSize = parseFloat(style.fontSize) || 15
  return { lineHeight: parseFloat(style.lineHeight) || fontSize * 2 }
}

function alignedContentHeight(slotEl) {
  if (!slotEl || slotEl.clientHeight <= 0) return 0
  const { lineHeight: lh } = contentMetrics()
  const lines = Math.max(1, Math.floor(slotEl.clientHeight / lh))
  return lines * lh
}

function splitTextToPages(text, container, pageHeight) {
  if (!text) return ['']
  const height = pageHeight ?? container?.clientHeight ?? 0
  if (!container || height <= 0) {
    const fallback = []
    for (let i = 0; i < text.length; i += 280) fallback.push(text.slice(i, i + 280))
    return fallback.length ? fallback : ['']
  }

  const width = container.clientWidth
  const style = getComputedStyle(container)
  const maxHeight = height
  const measure = document.createElement('div')
  measure.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'left:-9999px',
    'top:0',
    'white-space:pre-wrap',
    'word-break:break-word',
    `width:${width}px`,
    `font-size:${style.fontSize}`,
    `line-height:${style.lineHeight}`,
    `font-family:${style.fontFamily}`,
    `font-weight:${style.fontWeight}`,
  ].join(';')
  document.body.appendChild(measure)

  const pages = []
  let rest = text
  while (rest.length > 0) {
    let lo = 1
    let hi = rest.length
    let best = 1
    while (lo <= hi) {
      const mid = Math.ceil((lo + hi) / 2)
      measure.textContent = rest.slice(0, mid)
      if (measure.scrollHeight <= maxHeight) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    pages.push(rest.slice(0, best))
    rest = rest.slice(best)
  }
  measure.remove()
  return pages.length ? pages : ['']
}

function rebuildContentPages() {
  if (isEditing.value) return
  const slot = entryContentSlotRef.value
  const content = entryContentRef.value
  if (!slot) return
  syncLineAlignedHeights()
  const pageHeight = contentAreaHeight.value || alignedContentHeight(slot)
  if (pageHeight <= 0) return
  contentPages.value = splitTextToPages(current.value?.content || '', content || slot, pageHeight)
}

function syncLineAlignedHeights() {
  const slot = entryContentSlotRef.value
  if (!slot || slot.clientHeight <= 0) return
  contentAreaHeight.value = alignedContentHeight(slot)
}

function scheduleLayoutSync() {
  nextTick(() => {
    if (flipping.value) return
    if (isEditing.value) {
      syncLineAlignedHeights()
      return
    }
    syncLineAlignedHeights()
    rebuildContentPages()
    if (contentPage.value >= contentTotalPages.value) {
      contentPage.value = Math.max(0, contentTotalPages.value - 1)
    }
    if (tocPage.value >= tocTotalPages.value) {
      tocPage.value = Math.max(0, tocTotalPages.value - 1)
    }
  })
}

function bindLayoutObservers() {
  contentObserver?.disconnect()
  const contentEl = entryContentSlotRef.value || entryContentRef.value
  if (contentEl) {
    contentObserver = new ResizeObserver(scheduleLayoutSync)
    contentObserver.observe(contentEl)
  }
  scheduleLayoutSync()
}

watch(searchQuery, () => {
  tocPage.value = 0
})

watch(
  () => index.value,
  (idx) => {
    contentPage.value = 0
    const pos = filteredEntries.value.findIndex((item) => item.index === idx)
    if (pos >= 0) tocPage.value = Math.floor(pos / TOC_PAGE_SIZE)
    scheduleLayoutSync()
  }
)

watch(contentTotalPages, (total) => {
  if (contentPage.value >= total) contentPage.value = Math.max(0, total - 1)
})

watch(coverOpenAngle, (angle) => {
  localStorage.setItem(COVER_ANGLE_KEY, String(angle))
})

watch(opened, (isOpen) => {
  if (isOpen) nextTick(bindLayoutObservers)
})

watch(() => current.value?.content, () => {
  if (!isEditing.value) scheduleLayoutSync()
})
watch(filteredEntries, () => {
  if (!isEditing.value) scheduleLayoutSync()
})

watch(editMode, (mode) => {
  if (mode !== null) return
  nextTick(() => {
    nextTick(() => {
      bindLayoutObservers()
      syncLineAlignedHeights()
      rebuildContentPages()
    })
  })
})

const coverUrl = computed(() => {
  if (!book.value) return ''
  return notebookCoverUrl(book.value.coverType, book.value.cover)
})

const coverStyle = computed(() => {
  if (!coverUrl.value) return {}
  return { backgroundImage: `url(${coverUrl.value})` }
})

/** 书脊沿用封面左缘色彩，叠加阴影渐变模拟装订厚度 */
const spineStyle = computed(() => {
  if (!coverUrl.value) return {}
  return { '--spine-cover-image': `url(${coverUrl.value})` }
})

async function loadBook() {
  try {
    book.value = await resolveNotebook(bookId)
    if (!book.value) {
      ElMessage.error('日记本不存在')
      router.replace('/diary')
    }
  } catch {
    ElMessage.error('加载日记本失败')
    router.replace('/diary')
  }
}

async function ensureEntries() {
  if (entriesLoaded.value || entriesLoading.value) return
  entriesLoading.value = true
  try {
    entries.value = await listEntries(bookId)
    entriesLoaded.value = true
  } catch {
    ElMessage.error('加载日记列表失败')
  } finally {
    entriesLoading.value = false
  }
}

async function reloadEntries() {
  entries.value = await listEntries(bookId)
  entriesLoaded.value = true
}

async function openBook() {
  opened.value = true
  await ensureEntries()
}
function closeBook() {
  opened.value = false
}
// 点击日记本以外的区域（翻页控制除外）时合上
const BACKDROP_GUARD =
  '.book, .top-bar, .top-actions, .book-actions, .content-nav, .toc-nav, .toc-search'

function onBackdropClick(e) {
  if (!opened.value) return
  const nodes = typeof e.composedPath === 'function' ? e.composedPath() : [e.target]
  if (nodes.some((node) => node instanceof Element && node.closest(BACKDROP_GUARD))) return
  closeBook()
}

function fmtDate(e) {
  const raw = e?.date
  if (raw == null || raw === '') return ''
  const text = String(raw).trim()
  const datePart = (text.includes('T') ? text.split('T')[0] : text.split(' ')[0])
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(datePart)) return datePart
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[1]}/${match[2]}/${match[3]}`
  return datePart
}

function padDatePart(n) {
  return String(n).padStart(2, '0')
}

function formatEntryDateTime(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${padDatePart(d.getMonth() + 1)}-${padDatePart(d.getDate())} ${padDatePart(d.getHours())}:${padDatePart(d.getMinutes())}`
  }
  const text = String(value).trim()
  if (!text) return ''
  const normalized = text.includes('T') ? text.replace('T', ' ') : text
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
}

function fmtTocDate(entry) {
  if (!entry) return ''
  const fromCreateTime = formatEntryDateTime(entry.createTime)
  if (fromCreateTime) return fromCreateTime
  return formatEntryDateTime(entry.date) || entry.date || ''
}

function tocWordCount(entry, entryIndex) {
  if (isEditing.value && entryIndex === index.value) {
    return (draftContent.value || '').replace(/\s/g, '').length
  }
  return entry?.wordCount || 0
}

const WEEK_LABELS = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

function formatWeekLabel(week) {
  const n = Number(week)
  if (!Number.isFinite(n) || n < 1 || n > 7) return ''
  return WEEK_LABELS[n]
}

function weekFromDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const jsDay = d.getDay()
  return formatWeekLabel(jsDay === 0 ? 7 : jsDay)
}

const weekLabel = computed(() => {
  const entry = current.value
  if (!entry) return ''
  if (entry.week != null) return formatWeekLabel(entry.week)
  return weekFromDate(entry.date)
})

function formatTemperature(value) {
  if (value == null || value === '') return ''
  const text = String(value).trim()
  return text.endsWith('°') || text.endsWith('℃') || text.endsWith('°C') ? text : `${text}°C`
}

function fmtWeatherMeta(entry) {
  if (!entry) return ''
  if (entry._weatherLoading) return '定位中…'
  if (entry._weatherError) return entry._weatherError
  const loc = entry.location
  const w = entry.weather
  const locParts = [loc?.city, loc?.district].filter(Boolean)
  const locStr = locParts.join(' · ')
  const temp =
    w?.temperature != null && w.temperature !== ''
      ? formatTemperature(w.temperature)
      : ''
  const weatherParts = [w?.condition, temp].filter(Boolean)
  const weatherStr = weatherParts.join(' ')
  if (locStr && weatherStr) return `${locStr} | ${weatherStr}`
  return locStr || weatherStr
}

const weatherMetaText = computed(() => fmtWeatherMeta(current.value))

function patchEntryById(entryId, patch) {
  const idx = entries.value.findIndex((e) => e.id === entryId)
  if (idx < 0) return
  entries.value[idx] = { ...entries.value[idx], ...patch }
}

function buildWeatherPatch(data) {
  const { location, weather } = weatherToEntryFields(data)
  const patch = { location, weather, week: data?.week ?? null }
  if (data?.nowTime) {
    const datePart = String(data.nowTime).slice(0, 10)
    if (datePart) patch.date = datePart
  }
  return patch
}

function weatherToEntryFields(data) {
  if (!data) {
    return {
      location: { city: '', district: '' },
      weather: { condition: '', temperature: null },
    }
  }
  const temp = data.temperature
  const parsedTemp =
    temp != null && temp !== '' && !Number.isNaN(Number(temp)) ? Number(temp) : null
  return {
    location: { city: data.city || '', district: data.name || '' },
    weather: { condition: data.weather || '', temperature: parsedTemp },
  }
}

function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => {
        const msg =
          err.code === 1
            ? '需要定位权限才能获取天气'
            : err.code === 2
              ? '无法获取当前位置'
              : '定位请求超时'
        reject(new Error(msg))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}

async function fetchWeatherForEntry(entryId) {
  if (!entryId) return
  patchEntryById(entryId, { _weatherLoading: true, _weatherError: '' })
  try {
    const { latitude, longitude } = await requestGeolocation()
    const data = await getWeather({ lat: latitude, lng: longitude })
    patchEntryById(entryId, {
      ...buildWeatherPatch(data),
      _weatherLoading: false,
      _weatherError: '',
    })
  } catch (err) {
    patchEntryById(entryId, {
      _weatherLoading: false,
      _weatherError: err?.response?.data?.msg || err?.message || '获取天气失败',
    })
  }
}

const CLOSED_GUIDES = [
  { main: '轻触封面', sub: '翻开属于你的故事' },
  { main: '纸页在等待', sub: '把今天的心情写进去' },
  { main: '每一页都是时光', sub: '从这里开始阅读' },
  { main: '故事尚未开启', sub: '点击封面，打开日记' },
]
const closedGuide = computed(() => CLOSED_GUIDES[new Date().getHours() % CLOSED_GUIDES.length])

function flipContentPage(target) {
  if (flipping.value) return
  if (target < 0 || target >= contentTotalPages.value || target === contentPage.value) return
  const dir = target > contentPage.value ? 'next' : 'prev'
  flipDir.value = dir
  flipping.value = true
  if (dir === 'next') {
    leafContentPage.value = contentPage.value
    contentPage.value = target
  } else {
    leafContentPage.value = target
  }
  setTimeout(() => {
    if (dir === 'prev') contentPage.value = target
    nextTick(() => {
      flipping.value = false
      flipDir.value = ''
      leafContentPage.value = null
    })
  }, FLIP_MS)
}

function flipTocPage(target) {
  if (target < 0 || target >= tocTotalPages.value) return
  tocPage.value = target
}

function flipTo(target) {
  if (editMode.value) return
  if (target < 0 || target >= entries.value.length || target === index.value) return
  flipping.value = false
  flipDir.value = ''
  leafContentPage.value = null
  index.value = target
  contentPage.value = 0
}

function createLocalDraft() {
  const now = Date.now()
  return {
    id: `local-${now}`,
    bookId,
    title: '',
    content: '',
    location: { city: '', district: '' },
    weather: { condition: '', temperature: null },
    week: null,
    _weatherLoading: true,
    _weatherError: '',
    date: new Date(now).toISOString().slice(0, 10),
    createTime: now,
    updateTime: now,
    _local: true,
  }
}

function enterEditMode(mode) {
  editMode.value = mode
  draftBookName.value = book.value?.name || ''
}

async function writeNew() {
  if (editMode.value) return
  if (!opened.value) opened.value = true
  const draft = createLocalDraft()
  entries.value.unshift(draft)
  searchQuery.value = ''
  tocPage.value = 0
  index.value = 0
  contentPage.value = 0
  enterEditMode('new')
  draftTitle.value = ''
  draftContent.value = ''
  nextTick(() => titleInputRef.value?.focus())
  await fetchWeatherForEntry(draft.id)
}

function editCurrent() {
  if (!current.value || editMode.value) return
  enterEditMode('edit')
  draftTitle.value = current.value.title || ''
  draftContent.value = current.value.content || ''
  contentPage.value = 0
  nextTick(() => titleInputRef.value?.focus())
}

async function saveDraft() {
  const title = draftTitle.value.trim()
  const content = draftContent.value.trim()
  const bookName = draftBookName.value.trim()
  if (bookName.length > BOOK_NAME_MAX_LEN) {
    ElMessage.warning(`日记本名称不能超过 ${BOOK_NAME_MAX_LEN} 个字`)
    return
  }
  if (!bookName) {
    ElMessage.warning('请填写日记本名称')
    return
  }
  if (title.length > TITLE_MAX_LEN) {
    ElMessage.warning(`日记标题不能超过 ${TITLE_MAX_LEN} 个字`)
    return
  }
  if (!title && !content) {
    ElMessage.warning('写点什么再保存吧')
    return
  }
  const entry = current.value
  if (!entry) return

  const mode = editMode.value
  const entryId = entry.id

  try {
    if (bookName !== book.value?.name) {
      const updated = await updateNotebook(bookId, { name: bookName })
      if (updated) book.value = updated
    }

    if (mode === 'new') {
      await saveEntry(bookId, {
        title,
        content: draftContent.value,
        location: entry.location,
        weather: entry.weather,
      })
    } else {
      await saveEntry(bookId, {
        id: entry.id,
        title,
        content: draftContent.value,
        date: entry.date,
      })
    }

    editMode.value = null
    draftTitle.value = ''
    draftContent.value = ''
    draftBookName.value = ''
    await reloadEntries()
    const savedIdx =
      mode === 'new'
        ? entries.value.findIndex((e) => e.title === title)
        : entries.value.findIndex((e) => e.id === entryId)
    index.value = savedIdx >= 0 ? savedIdx : 0
    if (mode === 'new') tocPage.value = 0
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}
async function removeCurrent() {
  if (!current.value) return
  try {
    await ElMessageBox.confirm('确定要删除这篇日记吗？此操作不可恢复。', '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteEntry(bookId, current.value.id)
    ElMessage.success('已删除')
    await reloadEntries()
    if (index.value >= entries.value.length) index.value = Math.max(0, entries.value.length - 1)
  } catch {
    /* 取消 */
  }
}

onMounted(() => {
  loadBook()
  nextTick(bindLayoutObservers)
})

onUnmounted(() => {
  contentObserver?.disconnect()
})
</script>

<template>
  <div v-if="book" class="book-view" :style="{ '--book-font': bookFont }" @click="onBackdropClick">
    <div class="stage-wrap" :style="stageWrapStyle">
    <div class="book-stage" :class="{ opened }">
      <!-- 合上时左侧引导语 -->
      <aside class="book-closed-panel" :class="{ 'is-hidden': opened }" aria-hidden="opened">
        <div class="closed-guide">
          <p class="guide-main">{{ closedGuide.main }}</p>
          <p class="guide-sub">{{ closedGuide.sub }}</p>
          <span class="guide-arrow" aria-hidden="true">→</span>
        </div>
      </aside>

      <!-- 顶栏：相对日记本绝对定位，右对齐、上移 20px -->
      <div class="top-bar" @click.stop>
        <div class="top-actions" :class="{ visible: opened }">
          <div class="book-actions">
            <button
              class="action-btn"
              :class="{ primary: editMode === 'new' }"
              :disabled="editMode === 'edit'"
              :title="editMode === 'new' ? '保存' : '新增'"
              @click.stop="editMode === 'new' ? saveDraft() : writeNew()"
            >
              <el-icon><component :is="editMode === 'new' ? Check : Plus" /></el-icon>
            </button>
            <template v-if="current">
              <button
                class="action-btn"
                :class="{ primary: editMode === 'edit' }"
                :disabled="editMode === 'new'"
                :title="editMode === 'edit' ? '保存' : '编辑'"
                @click.stop="editMode === 'edit' ? saveDraft() : editCurrent()"
              >
                <el-icon><component :is="editMode === 'edit' ? Check : EditPen" /></el-icon>
              </button>
              <button
                class="action-btn danger"
                :disabled="isEditing"
                title="删除"
                @click.stop="removeCurrent"
              >
                <el-icon><Delete /></el-icon>
              </button>
            </template>
            <button
              class="action-btn"
              title="设置"
              @click.stop="settingsVisible = true"
            >
              <el-icon><Setting /></el-icon>
            </button>
          </div>
          <div class="content-nav">
            <button
              :disabled="!current || isEditing || flipping || contentPage === 0"
              @click.stop="flipContentPage(contentPage - 1)"
            >
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <span class="nav-indicator">{{ contentPage + 1 }} / {{ contentTotalPages }}</span>
            <button
              :disabled="!current || isEditing || flipping || contentPage >= contentTotalPages - 1"
              @click.stop="flipContentPage(contentPage + 1)"
            >
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>
      </div>
      <div class="book" :class="{ opened }">
        <!-- 右页（内容）—— 位置固定，翻页时露出底层新内容 -->
        <div class="page page-right">
          <div class="page-inner right-inner">
            <template v-if="current">
              <div class="entry-head">
                <span class="entry-date">
                  <el-icon class="entry-date-icon"><Calendar /></el-icon>
                  <span class="entry-date-text">{{ fmtDate(current) }}</span>
                  <span v-if="weekLabel" class="entry-week">{{ weekLabel }}</span>
                </span>
                <span
                  v-if="weatherMetaText || current._weatherLoading || current._weatherError"
                  class="entry-weather-meta"
                  :class="{ 'is-error': current._weatherError, 'is-loading': current._weatherLoading }"
                >{{ weatherMetaText }}</span>
              </div>
              <div class="entry-title-slot">
                <input
                  v-show="isEditing"
                  ref="titleInputRef"
                  v-model="draftTitle"
                  class="entry-title-input"
                  placeholder="这里用于书写日记名称"
                  :maxlength="TITLE_MAX_LEN"
                  @click.stop
                />
                <h3 v-show="!isEditing" class="entry-title">{{ current.title || '无标题' }}</h3>
              </div>
              <div ref="entryContentSlotRef" class="entry-content-slot">
                <textarea
                  v-show="isEditing"
                  ref="entryContentInputRef"
                  v-model="draftContent"
                  class="entry-content-input"
                  :style="contentAreaStyle"
                  placeholder="这里用于书写笔记内容"
                  @click.stop
                />
                <div
                  v-show="!isEditing"
                  ref="entryContentRef"
                  class="entry-content"
                  :style="contentAreaStyle"
                >{{ contentSlice }}</div>
              </div>
            </template>
            <div v-else class="entry-empty" @click="writeNew">
              <span class="empty-emoji">✍️</span>
              <p>开始写日记…</p>
            </div>
          </div>
        </div>

        <!-- 翻动的书页（正文翻页时出现，绕书脊掀起/落下，露出新内容）-->
        <div v-if="flipping && leafContentPage !== null && current" class="leaf" :class="flipDir">
          <div class="page-inner right-inner">
            <div class="entry-head">
              <span class="entry-date">
                <el-icon class="entry-date-icon"><Calendar /></el-icon>
                <span class="entry-date-text">{{ fmtDate(current) }}</span>
                <span v-if="weekLabel" class="entry-week">{{ weekLabel }}</span>
              </span>
              <span
                v-if="weatherMetaText || current._weatherLoading || current._weatherError"
                class="entry-weather-meta"
                :class="{ 'is-error': current._weatherError, 'is-loading': current._weatherLoading }"
              >{{ weatherMetaText }}</span>
            </div>
            <div class="entry-title-slot">
              <h3 class="entry-title">{{ current.title || '无标题' }}</h3>
            </div>
            <div class="entry-content-slot">
              <div class="entry-content" :style="contentAreaStyle">
                {{ contentPages[leafContentPage] || '' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 书脊（合上悬停时露出，竖排显示书名）-->
        <div class="book-spine" :class="{ open: opened }" :style="spineStyle">
          <span class="spine-name">{{ isEditing ? draftBookName : book.name }}</span>
        </div>

        <!-- 封面（合上时盖在右页上，点击翻开）—— 双面：正面是封面，背面是目录（左页）-->
        <div class="book-cover" :class="{ open: opened }" @click="openBook">
          <!-- 正面：封面 -->
          <div class="cover-front" :style="coverStyle" />
          <!-- 背面：翻开后成为左页（目录）-->
          <div class="cover-back">
            <div class="page-inner left-inner">
              <div class="book-name-slot">
                <input
                  v-if="isEditing"
                  v-model="draftBookName"
                  class="book-name-input"
                  placeholder="日记本名称"
                  :maxlength="BOOK_NAME_MAX_LEN"
                  @click.stop
                />
                <h2 v-else class="book-name">{{ book.name }}</h2>
              </div>
              <p class="book-sub">{{ entries.length }} 篇 · 创建于 {{ formatNotebookDate(book.createTime) }}</p>
              <div class="toc-search" @click.stop>
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索标题、内容、日期…"
                  clearable
                  :prefix-icon="Search"
                  :disabled="isEditing"
                />
              </div>
              <div class="toc-body">
                <ul v-if="tocPageItems.length" class="toc">
                  <li
                    v-for="{ entry: e, index: i } in tocPageItems"
                    :key="e.id"
                    :class="{ active: i === index, 'no-click': isEditing }"
                    @click.stop="flipTo(i)"
                  >
                    <span class="toc-title">
                      <span class="toc-title-text">{{
                        isEditing && i === index
                          ? draftTitle.trim() || '未命名'
                          : e.title || '无标题'
                      }}</span>
                      <span class="toc-word-count">{{ tocWordCount(e, i) }} 字</span>
                    </span>
                    <span class="toc-date">{{ fmtTocDate(e) }}</span>
                  </li>
                </ul>
                <p v-else class="toc-empty">未找到匹配日记</p>
              </div>
              <div v-if="filteredEntries.length" class="toc-nav" @click.stop>
                <button
                  :disabled="isEditing || tocPage === 0"
                  @click.stop="flipTocPage(tocPage - 1)"
                >
                  <el-icon><ArrowLeft /></el-icon>
                </button>
                <span class="nav-indicator">{{ tocPage + 1 }} / {{ tocTotalPages }}</span>
                <button
                  :disabled="isEditing || tocPage >= tocTotalPages - 1"
                  @click.stop="flipTocPage(tocPage + 1)"
                >
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <el-dialog
      v-model="settingsVisible"
      title="翻开角度"
      width="420px"
      append-to-body
      class="book-settings-dialog"
      @click.stop
    >
      <div class="angle-setting">
        <p class="angle-label">当前角度：<strong>{{ coverOpenAngle }}°</strong></p>
        <el-slider v-model="coverOpenAngle" :min="0" :max="180" :step="1" />
        <p class="angle-hint">拖动滑块调整日记本翻开角度（0°～180°）</p>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.book-view {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  flex: 1;
  min-height: 0;
}
.top-bar {
  position: absolute;
  right: 0;
  bottom: 100%;
  margin-bottom: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  visibility: hidden;
  pointer-events: none;
}
.top-actions.visible {
  visibility: visible;
  pointer-events: auto;
}
.book-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background: var(--surface-solid);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  box-shadow: 0 2px 10px rgba(230, 126, 154, 0.12);
  transition: 0.2s;
}
.action-btn :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 16px;
}
.action-btn:hover:not(:disabled) {
  border-color: var(--accent-pink);
  color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(230, 126, 154, 0.22);
}
.action-btn.primary {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #fff;
}
.action-btn.primary:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: #fff;
  filter: brightness(1.05);
  transform: translateY(-1px);
}
.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.action-btn.danger:hover:not(:disabled) {
  border-color: var(--danger-color);
  color: var(--danger-color);
  transform: translateY(-1px);
}

.angle-setting {
  padding: 4px 4px 0;
}
.angle-label {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary);
}
.angle-label strong {
  color: var(--primary-color);
  font-size: 18px;
}
.angle-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-light);
}

/* ============================================================
   3D 书本舞台
   ============================================================ */
.stage-wrap {
  --ease-book: cubic-bezier(0.22, 0.61, 0.36, 1);
  flex: 1;
  min-height: 0;
  width: 90%;
  margin: 0 auto;
  padding-top: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.book-stage {
  position: relative;
  perspective: 2200px;
  width: 100%;
  /* 保持原有 560px / 70vh，同时在矮视口时限制高度，避免底部与四季按钮重叠 */
  height: min(560px, 70vh, calc(100vh - var(--nav-h, 76px) - var(--dock-zone-h, 108px) - 72px));
  display: flex;
  justify-content: center;
}

/* —— 合上时左侧引导语 —— */
.book-closed-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 50%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  opacity: 1;
  transform: translateX(0);
  transition: opacity 0.65s var(--ease-book), transform 0.65s var(--ease-book);
}
.book-closed-panel.is-hidden {
  opacity: 0;
  transform: translateX(-12px);
}
.closed-guide {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  padding: 0 clamp(20px, 5vw, 56px) 0 clamp(12px, 3vw, 32px);
  text-align: right;
}
.guide-main {
  margin: 0 0 12px;
  font-size: clamp(26px, 3.6vw, 38px);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--primary-color);
  opacity: 0.72;
  line-height: 1.4;
}
.guide-sub {
  margin: 0 0 20px;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--text-light);
  opacity: 0.8;
  line-height: 1.6;
}
.guide-arrow {
  display: inline-block;
  font-size: clamp(22px, 2.8vw, 28px);
  color: var(--accent-pink);
  opacity: 0.55;
  animation: guide-nudge 2.4s ease-in-out infinite;
}
@keyframes guide-nudge {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.4;
  }
  50% {
    transform: translateX(8px);
    opacity: 0.85;
  }
}

.book {
  position: relative;
  width: 50%;
  height: 100%;
  transform-style: preserve-3d;
  /* 始终右移半页宽：合上时整本偏右（预留左侧空间），翻开后左右两页正好居中，
     且右页（内容页）位置全程不变 */
  transform: translateX(50%) rotateX(4deg);
  transition: transform 0.9s var(--ease-book);
}
/* 合上状态悬停：整本书绕左缘向右转开，露出书脊 */
.book:not(.opened):hover {
  transform: translateX(50%) rotateX(4deg) rotateY(34deg);
}
/* 打开后保持右移：右页位置不动，封面（左侧）绕书脊旋转翻开，左页补到左半边 */
.book.opened {
  transform: translateX(50%) rotateX(4deg);
}

.page {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px 10px 10px 4px;
  background: var(--paper-gradient);
  box-shadow: inset 0 0 40px rgba(180, 140, 120, 0.08);
  overflow: hidden;
}
.page-right {
  left: 0;
  transform-origin: left center;
  box-shadow: inset 18px 0 30px rgba(150, 110, 120, 0.1);
}
.page-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 34px 32px;
  font-family: var(--book-font);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* —— 翻动的书页（真实翻页效果）——
   绕书脊（左缘）旋转，单面 + backface 隐藏：转过 90° 后自然消失，
   露出底层已经准备好的新内容，模拟纸张被掀起翻过去的过程。 */
.leaf {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px 10px 10px 4px;
  background: var(--paper-gradient);
  box-shadow: inset 18px 0 30px rgba(150, 110, 120, 0.1),
    6px 0 26px rgba(120, 80, 100, 0.22);
  overflow: hidden;
  transform-origin: left center;
  backface-visibility: hidden;
  will-change: transform;
  z-index: 6;
}
.leaf.next {
  animation: leafNext 0.9s var(--ease-book) forwards;
}
.leaf.prev {
  animation: leafPrev 0.9s var(--ease-book) forwards;
}
@keyframes leafNext {
  0% {
    transform: rotateY(0deg);
    filter: brightness(1);
  }
  45% {
    filter: brightness(0.9);
  }
  100% {
    transform: rotateY(-180deg);
    filter: brightness(1);
  }
}
@keyframes leafPrev {
  0% {
    transform: rotateY(-180deg);
    filter: brightness(1);
  }
  55% {
    filter: brightness(0.9);
  }
  100% {
    transform: rotateY(0deg);
    filter: brightness(1);
  }
}

/* —— 左页：目录 —— */
.book-name-slot {
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
}
.book-name {
  margin: 0;
  width: 100%;
  font-size: 22px;
  font-weight: 800;
  line-height: 30px;
  color: var(--primary-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-name-input {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 22px;
  font-weight: 800;
  line-height: 30px;
  height: 30px;
  color: var(--primary-color);
  font-family: inherit;
  outline: none;
}
.book-name-input::placeholder {
  color: var(--text-light);
  font-weight: 600;
}
.book-sub {
  margin: 4px 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-light);
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toc-search {
  flex-shrink: 0;
  margin-bottom: 10px;
}
.toc-search :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--border-color) inset;
}
.toc-empty {
  flex: 1;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-light);
}
.toc-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
}
.toc::-webkit-scrollbar,
.toc-body::-webkit-scrollbar {
  display: none;
}
.left-inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.toc {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: none;
}
.toc li {
  position: relative;
  flex: 0 0 calc((100% - 60px) / 7);
  height: calc((100% - 60px) / 7);
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 0 8px;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  border-left: 2px solid rgba(212, 160, 18, 0.82);
  background: var(--paper-gradient-soft);
  box-shadow: -1px 2px 4px rgba(123, 93, 118, 0.08), 0 1px 0 var(--book-page-inset) inset;
  transition: background 0.2s, box-shadow 0.22s, transform 0.22s, border-color 0.2s;
}
/* 页堆层叠（与书架日记本 card 右侧效果一致） */
.toc li::after {
  content: '';
  position: absolute;
  right: 3px;
  top: 12%;
  width: 5px;
  height: 76%;
  border-radius: 0 3px 3px 0;
  background: repeating-linear-gradient(
    to right,
    var(--notebook-page-edge) 0,
    var(--notebook-page-edge) 1px,
    rgba(228, 214, 190, 0.58) 1px,
    rgba(228, 214, 190, 0.58) 2px
  );
  box-shadow: 1px 2px 4px rgba(123, 93, 118, 0.14);
  transform: skewY(2deg);
  opacity: 0.92;
  pointer-events: none;
}
.toc li:hover {
  background: var(--paper-gradient-hover);
  box-shadow: -3px 3px 7px rgba(123, 93, 118, 0.14), 0 1px 0 var(--book-page-inset-hover) inset;
  transform: translateX(-1px);
}
.toc li:hover::after {
  opacity: 1;
  transform: skewY(2deg) translateX(1px);
}
.toc li.active {
  background: var(--paper-gradient-active);
  box-shadow: -3px 3px 8px rgba(230, 126, 154, 0.16), 0 0 0 1px rgba(230, 126, 154, 0.12) inset;
  border-left-color: var(--primary-color);
}
.toc li.no-click {
  cursor: default;
}
.toc li.no-click:hover {
  background: var(--paper-gradient-soft);
  box-shadow: -1px 2px 4px rgba(123, 93, 118, 0.08), 0 1px 0 var(--book-page-inset) inset;
  transform: none;
}
.toc li.no-click.active {
  background: var(--paper-gradient-active);
  box-shadow: -3px 3px 8px rgba(230, 126, 154, 0.16), 0 0 0 1px rgba(230, 126, 154, 0.12) inset;
  border-left-color: var(--primary-color);
}
.toc-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toc-title-text {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  line-height: 1.35;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toc-word-count {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1.35;
  color: var(--text-light);
}
.toc-date {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1.35;
  color: var(--text-light);
  white-space: nowrap;
}

/* —— 目录 / 正文翻页 —— */
.toc-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(180, 140, 120, 0.28);
}
.content-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.toc-nav button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--surface-glass);
  color: var(--primary-color);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  box-shadow: 0 2px 10px rgba(230, 126, 154, 0.18);
  transition: 0.2s;
}
.content-nav button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--surface-muted);
  color: var(--primary-color);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  box-shadow: 0 4px 14px rgba(230, 126, 154, 0.22);
  transition: 0.2s;
}
.toc-nav button :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 16px;
}
.content-nav button :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 18px;
}
.toc-nav button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(230, 126, 154, 0.28);
}
.content-nav button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(230, 126, 154, 0.32);
}
.toc-nav button:disabled,
.content-nav button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.nav-indicator {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
}
.toc-nav .nav-indicator,
.content-nav .nav-indicator {
  width: auto;
  text-align: center;
}
.content-nav .nav-indicator {
  font-size: 14px;
}

/* —— 右页：内容 —— */
.entry-head {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(180, 140, 120, 0.3);
  cursor: default;
}
.entry-date {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-color);
}
.entry-date-icon {
  font-size: 15px;
  color: #c49a6c;
  opacity: 0.92;
}
.entry-date-text {
  flex-shrink: 0;
}
.entry-week {
  flex-shrink: 0;
  margin-left: 2px;
  font-size: 13px;
  color: var(--text-light);
}
.entry-weather-meta {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.4;
  font-style: italic;
  color: #888;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.entry-weather-meta.is-loading {
  color: var(--text-light);
}
.entry-weather-meta.is-error {
  font-style: normal;
  color: #c97a5a;
}
.entry-title-slot {
  flex-shrink: 0;
  height: 24px;
  margin-top: 12px;
  display: flex;
  align-items: center;
}
.entry-title {
  margin: 0;
  width: 100%;
  font-size: 20px;
  font-weight: 800;
  line-height: 24px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entry-title-input {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 20px;
  font-weight: 800;
  line-height: 24px;
  height: 24px;
  color: var(--text-color);
  font-family: inherit;
  outline: none;
}
.entry-title-input::placeholder {
  color: var(--text-light);
  font-weight: 600;
}
.entry-content-slot {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.entry-content,
.entry-content-input {
  flex: 0 0 auto;
  width: 100%;
  margin: 0;
  box-sizing: border-box;
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
}
.entry-content {
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  scrollbar-width: none;
}
.entry-content::-webkit-scrollbar {
  display: none;
}
.entry-content-input {
  padding: 0;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  outline: none;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}
.entry-content-input::-webkit-scrollbar {
  display: none;
}
.entry-content-input::placeholder {
  color: var(--text-light);
}
.entry-empty {
  margin: auto;
  text-align: center;
  color: var(--text-light);
  cursor: pointer;
}
.empty-emoji {
  font-size: 44px;
}

/* —— 书脊（左侧面：取封面左缘色 + 装订阴影）—— */
.book-spine {
  position: absolute;
  /* 高度直接等于书本高度，无需按视口大小做任何换算 */
  --spine-w: 34px;
  top: 0;
  left: 0;
  width: var(--spine-w);
  height: 100%;
  transform-origin: left center;
  /* 先沿纵深后移一个书脊宽度，再绕左缘旋开：
     使书脊远端正好落在封面所在平面上，透视下投影与封面完全等高，
     从而书脊上下永远与日记本对齐（不随书本尺寸变化而溢出或变短） */
  transform: translateZ(calc(-1 * var(--spine-w))) rotateY(-90deg);
  border-radius: 4px 0 0 4px;
  background-color: #6b5d58;
  background-image:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.16) 0%,
      rgba(255, 255, 255, 0.03) 38%,
      rgba(0, 0, 0, 0.1) 72%,
      rgba(0, 0, 0, 0.32) 100%
    ),
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.42) 0%,
      rgba(0, 0, 0, 0.14) 42%,
      rgba(255, 255, 255, 0.07) 78%,
      rgba(0, 0, 0, 0.22) 100%
    ),
    var(--spine-cover-image, none);
  background-size: 100% 100%, 100% 100%, 480% 100%;
  background-position: center, center, 0% center;
  background-repeat: no-repeat;
  box-shadow: inset 2px 0 5px rgba(255, 255, 255, 0.22),
    inset -3px 0 10px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  opacity: 1;
  transition: opacity 0.4s;
  z-index: 4;
  overflow: hidden;
}
.book-spine::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03) 0,
    rgba(255, 255, 255, 0.03) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.35;
}
.book-spine.open {
  opacity: 0;
}
.spine-name {
  position: relative;
  z-index: 1;
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.96);
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.75), 0 1px 3px rgba(0, 0, 0, 0.65),
    1px 0 2px rgba(0, 0, 0, 0.45);
  max-height: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* —— 封面（双面翻转：正面=封面，背面=左页目录）—— */
.book-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transform-origin: left center;
  transform: rotateY(0);
  transition: transform 0.9s var(--ease-book);
  transform-style: preserve-3d;
  z-index: 5;
}
/* 翻到 -150°：左页略向内收，保留书本微张的自然感 */
.book-cover.open {
  transform: rotateY(calc(-1 * var(--cover-open-angle)));
}
/* 两个面：各自背面隐藏，转过 90° 时无缝交接 */
.cover-front,
.cover-back {
  position: absolute;
  inset: 0;
  height: 100%;
  border-radius: 4px 12px 12px 4px;
  backface-visibility: hidden;
  overflow: hidden;
}
.cover-front {
  background-size: cover;
  background-position: center;
  box-shadow: 6px 8px 28px rgba(120, 80, 100, 0.32),
    inset -8px 0 16px rgba(0, 0, 0, 0.12), inset 2px 0 0 rgba(255, 255, 255, 0.3);
}
/* 背面就是左页：纸张质感 + 目录，绕 Y 轴翻 180° 与正面背靠背 */
.cover-back {
  transform: rotateY(180deg);
  border-radius: 10px 4px 4px 10px;
  background: var(--paper-gradient);
  box-shadow: inset -18px 0 30px rgba(150, 110, 120, 0.12);
}

@media (max-width: 768px) {
  .book-stage {
    height: 64vh;
  }
  .page-inner {
    padding: 22px 18px;
  }
}
</style>
