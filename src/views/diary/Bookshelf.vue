<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import {
  listNotebooks,
  deleteNotebook,
  verifyNotebookPassword,
} from '@/services/notebooks'
import NotebookCard from '@/components/diary/NotebookCard.vue'
import CreateNotebookModal from '@/components/diary/CreateNotebookModal.vue'

const router = useRouter()
const userStore = useUserStore()
const books = ref([])
const createVisible = ref(false)
const loading = ref(true)
const ready = ref(false)

async function reload({ refresh = false } = {}) {
  loading.value = true
  try {
    const list = await listNotebooks({ refresh })
    books.value = [...list]
  } catch {
    ElMessage.error('加载日记本列表失败')
  } finally {
    loading.value = false
    ready.value = true
  }
}

async function openNotebook(nb) {
  if (nb.encrypted) {
    try {
      const { value } = await ElMessageBox.prompt('请输入日记本密码', '输入密码', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputType: 'password',
      })
      const ok = await verifyNotebookPassword(nb.id, value || '')
      if (!ok) {
        ElMessage.error('密码错误')
        return
      }
    } catch {
      return
    }
  }
  router.push(`/diary/book/${nb.id}`)
}

async function removeNotebook(nb) {
  try {
    await ElMessageBox.confirm(
      `确定删除日记本《${nb.name}》吗？本内所有日记也将一并删除，且不可恢复。`,
      '确认删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteNotebook(nb.id)
    ElMessage.success('已删除')
    await reload()
  } catch {
    /* 取消 */
  }
}

async function onCreated() {
  createVisible.value = false
  await reload({ refresh: true })
  ElMessage.success('日记本创建成功')
}

onMounted(() => reload({ refresh: true }))

watch(
  () => userStore.userId,
  (id, prev) => {
    if (id && id !== prev) reload({ refresh: true })
  },
)
</script>

<template>
  <div class="bookshelf">
<!--    <header class="shelf-head">-->
<!--      <div>-->
<!--        <h1 class="shelf-title">我的日记</h1>-->
<!--        <p class="shelf-sub">共 {{ books.length }} 个日记本 · 记录每一段时光</p>-->
<!--      </div>-->
<!--    </header>-->

    <div v-if="!ready" class="shelf-loading" aria-busy="true" aria-live="polite">
      <span class="shelf-loading-dots" aria-hidden="true">
        <i /><i /><i />
      </span>
      <span class="shelf-loading-text">正在整理日记架…</span>
    </div>

    <section v-else class="shelf-grid" :class="{ 'is-reloading': loading }">
      <NotebookCard
        v-for="nb in books"
        :key="nb.id"
        :notebook="nb"
        @open="openNotebook"
        @delete="removeNotebook"
      />

      <!-- 新建日记本 -->
      <button class="notebook-new" @click="createVisible = true">
        <span class="new-inner">
          <span class="new-icon"><el-icon><Plus /></el-icon></span>
          <span class="new-text">今天不记录点什么吗？</span>
        </span>
      </button>
    </section>

    <CreateNotebookModal v-model="createVisible" @created="onCreated" />
  </div>
</template>

<style scoped>
.bookshelf {
  width: 100%;
}

.shelf-loading {
  min-height: 280px;
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.shelf-loading-dots {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.shelf-loading-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(230, 126, 154, 0.55);
  animation: shelf-dot 1.2s ease-in-out infinite;
}

.shelf-loading-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.shelf-loading-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

.shelf-loading-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(138, 107, 115, 0.82);
  letter-spacing: 0.02em;
}

@keyframes shelf-dot {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 40px;
  margin-top: 24px;
  padding: 6px 4px 50px;
  transition: opacity 0.2s ease;
}

.shelf-grid.is-reloading {
  opacity: 0.72;
  pointer-events: none;
}

.shelf-grid > * {
  width: 100%;
  min-width: 0;
}

/* 新建卡片（虚线笔记本）*/
.notebook-new {
  min-height: 320px;
  border: 2px dashed rgba(230, 126, 154, 0.42);
  border-left-width: 4px;
  border-left-color: rgba(230, 126, 154, 0.55);
  border-radius: 12px;
  background: linear-gradient(165deg, #fffbf8 0, #fff5f7 50%, #fef8f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
  transform: perspective(1300px) rotateX(1.1deg) rotateY(-1.2deg) translateZ(0);
  box-shadow: -14px 18px 24px rgba(123, 93, 118, 0.18),
    0 3px 0 rgba(255, 255, 255, 0.72) inset;
}
.notebook-new:hover {
  border-color: rgba(230, 126, 154, 0.65);
  transform: perspective(1300px) rotateX(2deg) rotateY(-2deg) translate3d(-3px, -3px, 0);
  box-shadow: -19px 24px 28px rgba(118, 85, 114, 0.26),
    0 4px 0 rgba(255, 255, 255, 0.8) inset;
}
.new-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px;
  text-align: center;
}
.new-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 240, 245, 0.6));
  color: #e67e9a;
  border: 2px solid rgba(230, 126, 154, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 2px 8px rgba(230, 126, 154, 0.14);
  transition: 0.25s;
}
.notebook-new:hover .new-icon {
  background: linear-gradient(145deg, rgba(255, 182, 193, 0.25), rgba(230, 126, 154, 0.15));
  color: #d86a8a;
  box-shadow: 0 4px 14px rgba(230, 126, 154, 0.22);
}
.new-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #8a6b73;
}
.notebook-new:hover .new-text {
  color: #c45d7a;
}

@media (max-width: 768px) {
  .shelf-loading {
    min-height: 200px;
    margin-top: 12px;
  }
  .shelf-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 12px;
    padding-bottom: 32px;
  }
}
@media (max-width: 480px) {
  .shelf-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
  }
}
</style>
