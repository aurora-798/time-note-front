<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listNotebooks,
  deleteNotebook,
  verifyNotebookPassword,
} from '@/services/notebooks'
import NotebookCard from '@/components/diary/NotebookCard.vue'
import CreateNotebookModal from '@/components/diary/CreateNotebookModal.vue'

const router = useRouter()
const books = ref([])
const createVisible = ref(false)

function reload() {
  books.value = listNotebooks()
}

async function openNotebook(nb) {
  if (nb.encrypted) {
    try {
      const { value } = await ElMessageBox.prompt('请输入日记本密码', '输入密码', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputType: 'password',
      })
      if (!verifyNotebookPassword(nb.id, value || '')) {
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
    deleteNotebook(nb.id)
    ElMessage.success('已删除')
    reload()
  } catch {
    /* 取消 */
  }
}

function onCreated() {
  createVisible.value = false
  reload()
  ElMessage.success('日记本创建成功')
}

onMounted(reload)
</script>

<template>
  <div class="bookshelf">
<!--    <header class="shelf-head">-->
<!--      <div>-->
<!--        <h1 class="shelf-title">我的日记</h1>-->
<!--        <p class="shelf-sub">共 {{ books.length }} 个日记本 · 记录每一段时光</p>-->
<!--      </div>-->
<!--    </header>-->

    <section class="shelf-grid">
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.bookshelf::-webkit-scrollbar {
  display: none;
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 34px;
  margin-top: 28px;
  padding: 10px 4px 40px;
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

@media (max-width: 1200px) {
  .shelf-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 26px;
  }
}
@media (max-width: 960px) {
  .shelf-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
  }
}
@media (max-width: 680px) {
  .shelf-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }
}
</style>
