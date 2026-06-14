<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, EditPen, Download, Delete } from '@element-plus/icons-vue'
import { getDiaryById, deleteDiary } from '@/api/diary'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const diary = ref(null)

const styleMap = {
  warm: '温暖治愈',
  literary: '文艺清新',
  humorous: '幽默风趣',
  simple: '简洁朴实',
}

async function load() {
  loading.value = true
  try {
    diary.value = await getDiaryById(route.params.id)
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

function handleExport() {
  const d = diary.value
  const text = `${d.title || '无标题'}\n${d.diaryDate || ''}\n\n${d.content || ''}`
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${d.title || 'diary'}-${d.diaryDate || d.id}.txt`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出')
}

async function handleDelete() {
  await ElMessageBox.confirm('确定删除这篇日记吗？', '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  await deleteDiary(diary.value.id)
  ElMessage.success('已删除')
  router.push('/diary')
}

onMounted(load)
</script>

<template>
  <div class="diary-detail" v-loading="loading">
    <div class="toolbar">
      <el-button :icon="ArrowLeft" text @click="router.push('/diary')">
        返回列表
      </el-button>
      <div class="tools" v-if="diary">
        <el-button :icon="EditPen" @click="router.push(`/diary/${diary.id}/edit`)">
          编辑
        </el-button>
        <el-button :icon="Download" @click="handleExport">导出</el-button>
        <el-button :icon="Delete" type="danger" plain @click="handleDelete">
          删除
        </el-button>
      </div>
    </div>

    <article v-if="diary" class="paper">
      <div class="paper-meta">
        <span class="date">{{ diary.diaryDate || '—' }}</span>
        <el-tag v-if="diary.style" round effect="light" type="primary">
          {{ styleMap[diary.style] || diary.style }}
        </el-tag>
        <span class="wc">{{ diary.wordCount || 0 }} 字</span>
      </div>
      <h1 class="paper-title">{{ diary.title || '无标题' }}</h1>
      <div class="paper-content">{{ diary.content || '（暂无内容）' }}</div>

      <div v-if="diary.sourceContent" class="source-box">
        <div class="source-label">原始素材</div>
        <p>{{ diary.sourceContent }}</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.paper {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  background: var(--tn-glass);
  backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  border: 1px solid var(--tn-glass-border);
  border-radius: 20px;
  padding: 48px 56px;
  box-shadow: var(--tn-shadow-lift);
  overflow: hidden;
  animation: paper-in 0.5s ease;
}
/* 顶部极光描边 */
.paper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--tn-gradient-aurora);
}
@keyframes paper-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.paper-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--tn-text-soft);
  font-size: 13px;
  margin-bottom: 16px;
}
.paper-title {
  font-size: 30px;
  font-weight: 700;
  margin: 0 0 28px;
  line-height: 1.4;
  background: var(--tn-gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.paper-content {
  font-size: 16px;
  line-height: 2.1;
  white-space: pre-wrap;
  color: var(--tn-text);
}
.source-box {
  margin-top: 36px;
  padding: 18px 20px;
  background: var(--tn-glass-strong);
  border-radius: 14px;
  border-left: 4px solid var(--tn-aurora-2);
}
.source-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--tn-aurora-1);
  margin-bottom: 8px;
}
.source-box p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--tn-text-soft);
}

@media (max-width: 768px) {
  .paper {
    padding: 28px 22px;
  }
}
</style>
