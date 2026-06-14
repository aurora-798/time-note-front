<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Document } from '@element-plus/icons-vue'
import { pageDiaries, deleteDiary, getDiaryById } from '@/api/diary'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const list = ref([])
const pager = reactive({ pageNum: 1, pageSize: 9, total: 0 })

const styleMap = {
  warm: '温暖治愈',
  literary: '文艺清新',
  humorous: '幽默风趣',
  simple: '简洁朴实',
}

async function load() {
  loading.value = true
  try {
    const data = await pageDiaries({
      pageNum: pager.pageNum,
      pageSize: pager.pageSize,
      userId: userStore.userId,
    })
    list.value = data.records || []
    pager.total = Number(data.total) || 0
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  pager.pageNum = p
  load()
}

function openDetail(id) {
  router.push(`/diary/${id}`)
}

function openEdit(id) {
  router.push(`/diary/${id}/edit`)
}

async function handleDelete(item) {
  await ElMessageBox.confirm(`确定删除日记《${item.title || '无标题'}》吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  await deleteDiary(item.id)
  ElMessage.success('已删除')
  // 删除后若当前页空了则回退一页
  if (list.value.length === 1 && pager.pageNum > 1) pager.pageNum--
  load()
}

// 导出单篇为 .txt
async function handleExport(item) {
  const full = await getDiaryById(item.id)
  const text = `${full.title || '无标题'}\n${full.diaryDate || ''}\n\n${full.content || ''}`
  downloadText(`${full.title || 'diary'}-${full.diaryDate || full.id}.txt`, text)
  ElMessage.success('已导出')
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function preview(content) {
  return content || '（暂无内容）'
}

onMounted(load)
</script>

<template>
  <div class="diary-list">
    <header class="page-head">
      <div>
        <h1 class="page-title">我的日记</h1>
        <p class="page-sub">共 {{ pager.total }} 篇时光记录</p>
      </div>
      <el-button type="primary" :icon="Plus" round @click="router.push('/diary/new')">
        写日记
      </el-button>
    </header>

    <div v-loading="loading" class="grid-wrap">
      <!-- 空状态 -->
      <el-empty
        v-if="!loading && list.length === 0"
        description="还没有日记，点击「写日记」开始记录吧"
      >
        <el-button type="primary" :icon="Plus" @click="router.push('/diary/new')">
          立即创建
        </el-button>
      </el-empty>

      <transition-group v-else name="card-in" tag="div" class="card-grid">
        <article
          v-for="(item, idx) in list"
          :key="item.id"
          class="diary-card"
          :style="{ '--delay': idx * 0.05 + 's' }"
          @click="openDetail(item.id)"
        >
          <div class="card-top">
            <span class="card-date">{{ item.diaryDate || '—' }}</span>
            <el-tag
              v-if="item.style"
              size="small"
              effect="light"
              type="primary"
              round
            >
              {{ styleMap[item.style] || item.style }}
            </el-tag>
          </div>
          <h3 class="card-title">
            <el-icon class="title-icon"><Document /></el-icon>
            {{ item.title || '无标题' }}
          </h3>
          <p class="card-preview">{{ preview(item.content) }}</p>
          <div class="card-foot">
            <span class="word-count">{{ item.wordCount || 0 }} 字</span>
            <div class="card-actions" @click.stop>
              <el-button text size="small" @click="openEdit(item.id)">编辑</el-button>
              <el-button text size="small" @click="handleExport(item)">导出</el-button>
              <el-button
                text
                size="small"
                type="danger"
                @click="handleDelete(item)"
              >
                删除
              </el-button>
            </div>
          </div>
        </article>
      </transition-group>
    </div>

    <div v-if="pager.total > pager.pageSize" class="pager">
      <el-pagination
        layout="prev, pager, next"
        :current-page="pager.pageNum"
        :page-size="pager.pageSize"
        :total="pager.total"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  background: var(--tn-gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.page-sub {
  font-size: 14px;
  color: var(--tn-text-soft);
  margin-top: 4px;
}

.grid-wrap {
  min-height: 320px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.diary-card {
  position: relative;
  background: var(--tn-glass);
  backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  border-radius: 18px;
  padding: 20px;
  cursor: pointer;
  border: 1px solid var(--tn-glass-border);
  box-shadow: var(--tn-shadow);
  overflow: hidden;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* 顶部极光描边光条 */
.diary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--tn-gradient-aurora);
  opacity: 0;
  transition: opacity 0.28s ease;
}
.diary-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--tn-glow-strong);
  border-color: rgba(124, 92, 255, 0.4);
}
.diary-card:hover::before {
  opacity: 1;
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-date {
  font-size: 13px;
  color: var(--tn-text-soft);
}
.card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--tn-text);
}
.title-icon {
  color: var(--tn-aurora-1);
}
.card-preview {
  font-size: 14px;
  line-height: 1.7;
  color: var(--tn-text-soft);
  flex: 1;
  min-height: 48px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px dashed var(--tn-border);
  padding-top: 12px;
}
.word-count {
  font-size: 12px;
  color: var(--tn-text-faint);
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

/* 卡片入场动画 */
.card-in-enter-active {
  transition: all 0.45s ease;
  transition-delay: var(--delay);
}
.card-in-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
</style>
