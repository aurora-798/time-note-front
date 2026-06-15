<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Back, EditPen, Plus, Delete } from '@element-plus/icons-vue'
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
const leafEntry = ref(null) // 翻页时停留在“活动书页”上的内容
const FLIP_MS = 900

const preset = computed(() => (book.value ? coverPreset(book.value.cover) : null))
const isCustom = computed(() => book.value?.coverType === 'custom')
const bookFont = computed(() => (book.value ? fontFamily(book.value.font) : 'inherit'))
const current = computed(() => entries.value[index.value] || null)

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
    e.target.closest('.page-nav') ||
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

function flipTo(target) {
  if (flipping.value) return
  if (target < 0 || target >= entries.value.length || target === index.value) return
  const dir = target > index.value ? 'next' : 'prev'
  flipDir.value = dir
  flipping.value = true
  if (dir === 'next') {
    // 旧内容留在翻动的书页上，底层右页立即换成新内容（被书页盖住）
    leafEntry.value = entries.value[index.value]
    index.value = target
  } else {
    // 上一页：翻动的书页带着新内容从左侧合回到右页
    leafEntry.value = entries.value[target]
  }
  setTimeout(() => {
    if (dir === 'prev') index.value = target
    flipping.value = false
    flipDir.value = ''
    leafEntry.value = null
  }, FLIP_MS)
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

onMounted(load)
</script>

<template>
  <div v-if="book" class="book-view" :style="{ '--book-font': bookFont }" @click="onBackdropClick">
    <!-- 顶栏：返回按钮（左） + 日记操作 + 翻页控件（右，打开后显示）-->
    <div class="top-bar">
      <button class="back-btn" @click="router.push('/diary')">
        <el-icon><Back /></el-icon> 返回书架
      </button>
      <div v-if="opened" class="top-actions">
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
        <div v-if="entries.length" class="page-nav">
          <button :disabled="index === 0" @click="flipTo(index - 1)">
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="page-indicator">{{ index + 1 }} / {{ entries.length }}</span>
          <button :disabled="index >= entries.length - 1" @click="flipTo(index + 1)">
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
              <div class="entry-content">{{ current.content }}</div>
            </template>
            <div v-else class="entry-empty" @click="writeNew">
              <span class="empty-emoji">✍️</span>
              <p>开始写日记…</p>
            </div>
          </div>
        </div>

        <!-- 翻动的书页（翻页时出现，绕书脊掀起/落下，露出新内容）-->
        <div v-if="flipping && leafEntry" class="leaf" :class="flipDir">
          <div class="page-inner right-inner">
            <div class="entry-head">
              <span class="entry-mood">{{ leafEntry.mood || '📖' }}</span>
              <div>
                <h3 class="entry-title">{{ leafEntry.title || '无标题' }}</h3>
                <span class="entry-date">{{ fmtDate(leafEntry) }}</span>
              </div>
            </div>
            <div class="entry-content">{{ leafEntry.content }}</div>
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
              <ul class="toc">
                <li
                  v-for="(e, i) in entries"
                  :key="e.id"
                  :class="{ active: i === index }"
                  @click.stop="flipTo(i)"
                >
                  <span class="toc-dot" />
                  <span class="toc-title">{{ e.title || '无标题' }}</span>
                  <span class="toc-date">{{ fmtDate(e) }}</span>
                </li>
              </ul>
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
  min-height: 70vh;
}
.top-bar {
  width: 90%;
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
  width: 90%;
  margin: 12px auto 0;
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
/* 横线纸纹理（合上时保留，打开后隐藏正文横线）*/
.page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    transparent 0 31px,
    rgba(120, 90, 110, 0.08) 31px 32px
  );
  pointer-events: none;
}
.book.opened .page-right::before,
.book.opened .leaf::before,
.book.opened .cover-back::before {
  display: none;
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
.leaf::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    transparent 0 31px,
    rgba(120, 90, 110, 0.08) 31px 32px
  );
  pointer-events: none;
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
  margin: 4px 0 16px;
  font-size: 13px;
  color: var(--text-light);
}
.toc {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
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
  margin-top: 16px;
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
  white-space: pre-wrap;
  overflow-y: auto;
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
/* 翻到 -180°：背面（目录）正好平铺在左半边，与右页对称 */
.book-cover.open {
  transform: rotateY(-180deg);
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
.cover-back::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    transparent 0 31px,
    rgba(120, 90, 110, 0.08) 31px 32px
  );
  pointer-events: none;
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

/* —— 翻页控制条 —— */
.page-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page-nav button {
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
.page-nav button :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 18px;
}
.page-nav button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(230, 126, 154, 0.32);
}
.page-nav button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-indicator {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
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
