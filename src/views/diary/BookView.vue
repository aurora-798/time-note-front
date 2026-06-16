<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Back, EditPen, Plus, Delete, Search } from '@element-plus/icons-vue'
import {
  getNotebook,
  listEntries,
  deleteEntry,
  coverPreset,
  fontFamily,
} from '@/services/notebooks'

const route = useRoute()
const router = useRouter()

const bookId = route.params.bookId
const book = ref(null)
const entries = ref([])
const opened = ref(false)
const index = ref(0)
const flipDir = ref('') // 'next' | 'prev'
const flipping = ref(false)
const leafContentPage = ref(null) // 正文翻页动画时，书页上停留的页码
const FLIP_MS = 900

const searchQuery = ref('')
const tocPage = ref(0)
const contentPage = ref(0)
const tocPageSize = ref(6)
const contentPages = ref([''])
const entryContentRef = ref(null)
const tocListRef = ref(null)

let contentObserver = null
let tocObserver = null

const preset = computed(() => (book.value ? coverPreset(book.value.cover) : null))
const isCustom = computed(() => book.value?.coverType === 'custom')
const bookFont = computed(() => (book.value ? fontFamily(book.value.font) : 'inherit'))
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
  Math.max(1, Math.ceil(filteredEntries.value.length / tocPageSize.value))
)

const tocPageItems = computed(() => {
  const start = tocPage.value * tocPageSize.value
  return filteredEntries.value.slice(start, start + tocPageSize.value)
})

const contentTotalPages = computed(() => Math.max(1, contentPages.value.length))
const contentSlice = computed(() => contentPages.value[contentPage.value] || '')

function splitTextToPages(text, container) {
  if (!text) return ['']
  if (!container || container.clientHeight <= 0) {
    const fallback = []
    for (let i = 0; i < text.length; i += 280) fallback.push(text.slice(i, i + 280))
    return fallback.length ? fallback : ['']
  }

  const width = container.clientWidth
  const maxHeight = container.clientHeight
  const style = getComputedStyle(container)
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
  contentPages.value = splitTextToPages(current.value?.content || '', entryContentRef.value)
}

function updateTocPageSize() {
  const list = tocListRef.value
  if (!list || list.clientHeight <= 0) return
  const sample = list.querySelector('li')
  const itemH = sample ? sample.offsetHeight + 2 : 42
  const next = Math.max(1, Math.floor(list.clientHeight / itemH))
  if (next === tocPageSize.value) return
  const anchor = tocPage.value * tocPageSize.value
  tocPageSize.value = next
  tocPage.value = Math.min(Math.floor(anchor / next), Math.max(0, tocTotalPages.value - 1))
}

function scheduleLayoutSync() {
  nextTick(() => {
    updateTocPageSize()
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
  tocObserver?.disconnect()
  if (entryContentRef.value) {
    contentObserver = new ResizeObserver(scheduleLayoutSync)
    contentObserver.observe(entryContentRef.value)
  }
  if (tocListRef.value) {
    tocObserver = new ResizeObserver(scheduleLayoutSync)
    tocObserver.observe(tocListRef.value)
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
    if (pos >= 0) tocPage.value = Math.floor(pos / tocPageSize.value)
    scheduleLayoutSync()
  }
)

watch(contentTotalPages, (total) => {
  if (contentPage.value >= total) contentPage.value = Math.max(0, total - 1)
})

watch(opened, (isOpen) => {
  if (isOpen) nextTick(bindLayoutObservers)
})

watch(() => current.value?.content, scheduleLayoutSync)
watch(filteredEntries, scheduleLayoutSync)
watch(tocPageItems, () => nextTick(updateTocPageSize))

const coverStyle = computed(() => {
  if (!book.value) return {}
  return isCustom.value
    ? { backgroundImage: `url(${book.value.cover})` }
    : { backgroundImage: preset.value.gradient }
})

function load() {
  book.value = getNotebook(bookId)
  if (!book.value) {
    ElMessage.error('日记本不存在')
    router.replace('/diary')
    return
  }
  entries.value = listEntries(bookId)
}

function openBook() {
  opened.value = true
}
function closeBook() {
  opened.value = false
}
// 点击日记本以外的区域（翻页控制、返回按钮除外）时合上
function onBackdropClick(e) {
  if (!opened.value) return
  if (
    e.target.closest('.book') ||
    e.target.closest('.content-nav') ||
    e.target.closest('.toc-nav') ||
    e.target.closest('.toc-search') ||
    e.target.closest('.book-actions') ||
    e.target.closest('.back-btn')
  ) {
    return
  }
  closeBook()
}

function fmtDate(e) {
  return e?.date || ''
}

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
    flipping.value = false
    flipDir.value = ''
    leafContentPage.value = null
  }, FLIP_MS)
}

function flipTocPage(target) {
  if (target < 0 || target >= tocTotalPages.value) return
  tocPage.value = target
}

function flipTo(target) {
  if (target < 0 || target >= entries.value.length || target === index.value) return
  flipping.value = false
  flipDir.value = ''
  leafContentPage.value = null
  index.value = target
  contentPage.value = 0
}

function writeNew() {
  router.push(`/diary/book/${bookId}/write`)
}
function editCurrent() {
  if (current.value) router.push(`/diary/book/${bookId}/entry/${current.value.id}/edit`)
}
async function removeCurrent() {
  if (!current.value) return
  try {
    await ElMessageBox.confirm('确定要删除这篇日记吗？此操作不可恢复。', '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    deleteEntry(bookId, current.value.id)
    ElMessage.success('已删除')
    load()
    if (index.value >= entries.value.length) index.value = Math.max(0, entries.value.length - 1)
  } catch {
    /* 取消 */
  }
}

onMounted(() => {
  load()
  nextTick(bindLayoutObservers)
})

onUnmounted(() => {
  contentObserver?.disconnect()
  tocObserver?.disconnect()
})
</script>

<template>
  <div v-if="book" class="book-view" :style="{ '--book-font': bookFont }" @click="onBackdropClick">
    <!-- 顶栏：返回按钮（左） + 日记操作 + 翻页控件（右，打开后显示）-->
    <div class="top-bar">
      <button class="back-btn" @click="router.push('/diary')">
        <el-icon><Back /></el-icon> 返回书架
      </button>
      <div class="top-actions" :class="{ visible: opened }">
        <div class="book-actions">
          <button class="action-btn" @click="writeNew">
            <el-icon><Plus /></el-icon> 写新日记
          </button>
          <template v-if="current">
            <button class="action-btn" @click="editCurrent">
              <el-icon><EditPen /></el-icon> 编辑
            </button>
            <button class="action-btn danger" @click="removeCurrent">
              <el-icon><Delete /></el-icon> 删除
            </button>
          </template>
        </div>
        <div class="content-nav">
          <button
            :disabled="!current || flipping || contentPage === 0"
            @click="flipContentPage(contentPage - 1)"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="nav-indicator">{{ contentPage + 1 }} / {{ contentTotalPages }}</span>
          <button
            :disabled="!current || flipping || contentPage >= contentTotalPages - 1"
            @click="flipContentPage(contentPage + 1)"
          >
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <div class="stage-wrap">
    <div class="book-stage" :class="{ opened }">
      <div class="book" :class="{ opened }">
        <!-- 右页（内容）—— 位置固定，翻页时露出底层新内容 -->
        <div class="page page-right">
          <div class="page-inner right-inner">
            <template v-if="current">
              <div class="entry-head">
                <span class="entry-mood">{{ current.mood || '📖' }}</span>
                <div>
                  <h3 class="entry-title">{{ current.title || '无标题' }}</h3>
                  <span class="entry-date">{{ fmtDate(current) }}</span>
                </div>
              </div>
              <div ref="entryContentRef" class="entry-content">{{ contentSlice }}</div>
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
              <span class="entry-mood">{{ current.mood || '📖' }}</span>
              <div>
                <h3 class="entry-title">{{ current.title || '无标题' }}</h3>
                <span class="entry-date">{{ fmtDate(current) }}</span>
              </div>
            </div>
            <div class="entry-content">{{ contentPages[leafContentPage] || '' }}</div>
          </div>
        </div>

        <!-- 书脊（合上悬停时露出，竖排显示书名）-->
        <div class="book-spine" :class="{ open: opened }">
          <span class="spine-name">{{ book.name }}</span>
        </div>

        <!-- 封面（合上时盖在右页上，点击翻开）—— 双面：正面是封面，背面是目录（左页）-->
        <div class="book-cover" :class="{ open: opened }" @click="openBook">
          <!-- 正面：封面 -->
          <div class="cover-front" :style="coverStyle">
            <span v-if="!isCustom" class="cover-emoji">{{ preset.emoji }}</span>
            <div class="cover-plate">
              <span class="cover-title">{{ book.name }}</span>
            </div>
            <span v-if="!opened" class="cover-hint">轻触翻开</span>
          </div>
          <!-- 背面：翻开后成为左页（目录）-->
          <div class="cover-back">
            <div class="page-inner left-inner">
              <h2 class="book-name">{{ book.name }}</h2>
              <p class="book-sub">{{ entries.length }} 篇 · 创建于
                {{ new Date(book.createTime).toLocaleDateString() }}
              </p>
              <div class="toc-search" @click.stop>
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索标题、内容、日期…"
                  clearable
                  :prefix-icon="Search"
                />
              </div>
              <div ref="tocListRef" class="toc-body">
                <ul v-if="tocPageItems.length" class="toc">
                  <li
                    v-for="{ entry: e, index: i } in tocPageItems"
                    :key="e.id"
                    :class="{ active: i === index }"
                    @click.stop="flipTo(i)"
                  >
                    <span class="toc-dot" />
                    <span class="toc-title">{{ e.title || '无标题' }}</span>
                    <span class="toc-date">{{ fmtDate(e) }}</span>
                  </li>
                </ul>
                <p v-else class="toc-empty">未找到匹配日记</p>
              </div>
              <div v-if="filteredEntries.length" class="toc-nav" @click.stop>
                <button :disabled="tocPage === 0" @click="flipTocPage(tocPage - 1)">
                  <el-icon><ArrowLeft /></el-icon>
                </button>
                <span class="nav-indicator">{{ tocPage + 1 }} / {{ tocTotalPages }}</span>
                <button
                  :disabled="tocPage >= tocTotalPages - 1"
                  @click="flipTocPage(tocPage + 1)"
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
  width: 90%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 0;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--primary-color);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(230, 126, 154, 0.2);
  transition: 0.2s;
}
.back-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(230, 126, 154, 0.3);
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
  gap: 4px;
  padding: 7px 16px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: #fff;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: 0.2s;
}
.action-btn:hover {
  border-color: var(--accent-pink);
  color: var(--primary-color);
}
.action-btn.danger:hover {
  border-color: var(--danger-color);
  color: var(--danger-color);
}

/* ============================================================
   3D 书本舞台
   ============================================================ */
.stage-wrap {
  --ease-book: cubic-bezier(0.22, 0.61, 0.36, 1);
  --cover-open-angle: 135deg; /* 设置日记本的翻开到的角度 */
  flex: 1;
  min-height: 0;
  width: 90%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.book-stage {
  perspective: 2200px;
  width: 100%;
  /* 保持原有 560px / 70vh，同时在矮视口时限制高度，避免底部与四季按钮重叠 */
  height: min(560px, 70vh, calc(100vh - var(--nav-h, 76px) - var(--dock-zone-h, 108px) - 72px));
  display: flex;
  justify-content: center;
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
  background: linear-gradient(150deg, #fffdf7 0%, #fff8ec 60%, #fef3df 100%);
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
  background: linear-gradient(150deg, #fffdf7 0%, #fff8ec 60%, #fef3df 100%);
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
.book-name {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--primary-color);
}
.book-sub {
  margin: 4px 0 12px;
  font-size: 13px;
  color: var(--text-light);
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: none;
}
.toc li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.toc li:hover {
  background: rgba(230, 126, 154, 0.1);
}
.toc li.active {
  background: rgba(230, 126, 154, 0.16);
}
.toc-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-pink);
  flex-shrink: 0;
}
.toc-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toc-date {
  font-size: 11px;
  color: var(--text-light);
}

/* —— 目录 / 正文翻页 —— */
.toc-nav {
  display: grid;
  grid-template-columns: 32px 7.5ch 32px;
  gap: 6px;
  align-items: center;
  justify-items: center;
  flex-shrink: 0;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(180, 140, 120, 0.28);
}
.content-nav {
  display: grid;
  grid-template-columns: 42px 8.5ch 42px;
  gap: 8px;
  align-items: center;
  justify-items: center;
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
  background: rgba(255, 255, 255, 0.9);
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
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
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
  width: 100%;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.content-nav .nav-indicator {
  font-size: 14px;
}

/* —— 右页：内容 —— */
.entry-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px dashed rgba(180, 140, 120, 0.3);
}
.entry-mood {
  font-size: 34px;
}
.entry-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-color);
}
.entry-date {
  font-size: 12px;
  color: var(--text-light);
}
.entry-content {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
  scrollbar-width: none;
}
.entry-content::-webkit-scrollbar {
  display: none;
}
.leaf .entry-content {
  overflow: hidden;
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

/* —— 书脊（左侧面）—— */
.book-spine {
  position: absolute;
  top: 0;
  left: 0;
  width: 34px;
  height: 100%;
  transform-origin: left center;
  transform: rotateY(-90deg);
  border-radius: 4px 0 0 4px;
  background: linear-gradient(
    100deg,
    #4a2c44 0%,
    var(--primary-color) 45%,
    #5a3450 100%
  );
  box-shadow: inset 2px 0 4px rgba(255, 255, 255, 0.18),
    inset -3px 0 8px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  opacity: 1;
  transition: opacity 0.4s;
  z-index: 4;
}
.book-spine.open {
  opacity: 0;
}
.spine-name {
  writing-mode: vertical-rl;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background-size: cover;
  background-position: center;
  box-shadow: 6px 8px 28px rgba(120, 80, 100, 0.32),
    inset -8px 0 16px rgba(0, 0, 0, 0.12), inset 2px 0 0 rgba(255, 255, 255, 0.3);
}
/* 背面就是左页：纸张质感 + 目录，绕 Y 轴翻 180° 与正面背靠背 */
.cover-back {
  transform: rotateY(180deg);
  border-radius: 10px 4px 4px 10px;
  background: linear-gradient(150deg, #fffdf7 0%, #fff8ec 60%, #fef3df 100%);
  box-shadow: inset -18px 0 30px rgba(150, 110, 120, 0.12);
}
.cover-emoji {
  font-size: 90px;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.2));
}
.cover-plate {
  padding: 10px 22px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.cover-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary-color);
  letter-spacing: 0.04em;
}
.cover-hint {
  position: absolute;
  bottom: 22px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.18);
  padding: 4px 12px;
  border-radius: 12px;
  animation: hintPulse 1.8s ease-in-out infinite;
}
@keyframes hintPulse {
  0%,
  100% {
    opacity: 0.7;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
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
