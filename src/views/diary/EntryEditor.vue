<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Picture, VideoCamera, Check, Close } from '@element-plus/icons-vue'
import {
  resolveNotebook,
  getEntry,
  saveEntry,
  fontFamily,
} from '@/services/notebooks'

const route = useRoute()
const router = useRouter()

const bookId = route.params.bookId
const entryId = route.params.entryId
const isEdit = computed(() => !!entryId)

const book = ref(null)
const imageInput = ref()
const saving = ref(false)

const MOODS = ['😊', '🥰', '😌', '😢', '😡', '😴', '🤔', '🌧️', '☀️', '🌙', '🎉', '📖']

const form = reactive({
  id: null,
  title: '',
  content: '',
  mood: '😊',
  date: new Date().toISOString().slice(0, 10),
  media: [],
})

const bookFont = computed(() => (book.value ? fontFamily(book.value.font) : 'inherit'))
const wordCount = computed(() => form.content.replace(/\s/g, '').length)

async function load() {
  try {
    book.value = await resolveNotebook(bookId)
    if (!book.value) {
      ElMessage.error('日记本不存在')
      router.replace('/diary')
      return
    }
    if (isEdit.value) {
      const e = await getEntry(bookId, entryId)
      if (e) Object.assign(form, { ...e })
    }
  } catch {
    ElMessage.error('加载失败')
    router.replace('/diary')
  }
}

function onImage(e) {
  const files = Array.from(e.target.files || [])
  files.forEach((file) => {
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.warning(`${file.name} 超过 5MB，已跳过`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      // TODO: 接后端时改为 uploadFile() 上传并保存 fileUrl
      form.media.push({ type: 'image', url: reader.result })
    }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

function addVideo() {
  ElMessage.info('外链视频插入：接后端后开放')
}

function removeMedia(i) {
  form.media.splice(i, 1)
}

async function save() {
  if (!form.content.trim() && !form.title.trim()) {
    ElMessage.warning('写点什么再保存吧')
    return
  }
  saving.value = true
  try {
    await saveEntry(bookId, { ...form })
    ElMessage.success('已保存')
    router.push(`/diary/book/${bookId}`)
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="book" class="entry-editor" :style="{ '--book-font': bookFont }">
    <div class="editor-bar">
      <button class="bar-btn" @click="router.push(`/diary/book/${bookId}`)">
        <el-icon><Back /></el-icon> 返回
      </button>
      <span class="bar-title">{{ book.name }} · {{ isEdit ? '编辑日记' : '写日记' }}</span>
      <button class="bar-btn primary" :disabled="saving" @click="save">
        <el-icon><Check /></el-icon> 保存
      </button>
    </div>

    <!-- 书页样式的写作区 -->
    <div class="paper">
      <div class="paper-top">
        <div class="mood-row">
          <button
            v-for="m in MOODS"
            :key="m"
            class="mood"
            :class="{ active: form.mood === m }"
            @click="form.mood = m"
          >
            {{ m }}
          </button>
        </div>
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="YYYY-MM-DD"
          size="small"
          class="date-pick"
        />
      </div>

      <input v-model="form.title" class="title-input" placeholder="今天的标题…" />

      <textarea
        v-model="form.content"
        class="content-input"
        placeholder="记录今天发生的点滴…"
      />

      <!-- 媒体 -->
      <div v-if="form.media.length" class="media-grid">
        <div v-for="(m, i) in form.media" :key="i" class="media-item">
          <img :src="m.url" alt="" />
          <button class="media-del" @click="removeMedia(i)">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>

      <div class="paper-foot">
        <div class="insert-tools">
          <button @click="imageInput.click()">
            <el-icon><Picture /></el-icon> 插入图片
          </button>
          <button @click="addVideo">
            <el-icon><VideoCamera /></el-icon> 插入视频
          </button>
          <input
            ref="imageInput"
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="onImage"
          />
        </div>
        <span class="wordcount">{{ wordCount }} 字</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entry-editor {
  max-width: 820px;
  margin: 0 auto;
}
.editor-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.bar-title {
  font-weight: 800;
  color: var(--text-primary);
}
.bar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--primary-color);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(230, 126, 154, 0.18);
  transition: 0.2s;
}
.bar-btn.primary {
  background: var(--gradient-primary);
  color: #fff;
}
.bar-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.bar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 书页 */
.paper {
  position: relative;
  border-radius: 6px 16px 16px 6px;
  padding: 32px 36px 24px;
  background: linear-gradient(150deg, #fffdf7 0%, #fff8ec 60%, #fef3df 100%);
  border-left: 10px solid var(--primary-color);
  box-shadow: 0 18px 50px rgba(150, 110, 120, 0.18),
    inset 0 0 40px rgba(180, 140, 120, 0.06);
  font-family: var(--book-font);
}
.paper::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 6px 16px 16px 6px;
  background-image: repeating-linear-gradient(
    transparent 0 35px,
    rgba(120, 90, 110, 0.07) 35px 36px
  );
  pointer-events: none;
}
.paper-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: relative;
  z-index: 1;
}
.mood-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.mood {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  transition: 0.18s;
  opacity: 0.55;
}
.mood:hover {
  opacity: 1;
  transform: scale(1.15);
}
.mood.active {
  opacity: 1;
  background: rgba(255, 154, 183, 0.2);
  transform: scale(1.1);
}

.title-input,
.content-input {
  position: relative;
  z-index: 1;
  width: 100%;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--text-color);
  resize: none;
}
.title-input {
  margin-top: 18px;
  font-size: 24px;
  font-weight: 800;
  line-height: 36px;
}
.title-input:focus,
.content-input:focus {
  outline: none;
}
.content-input {
  margin-top: 10px;
  min-height: 360px;
  font-size: 16px;
  line-height: 36px;
}

.media-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.media-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paper-foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed rgba(180, 140, 120, 0.35);
}
.insert-tools {
  display: flex;
  gap: 10px;
}
.insert-tools button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: #fff;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: 0.2s;
}
.insert-tools button:hover {
  border-color: var(--accent-pink);
  color: var(--primary-color);
}
.wordcount {
  font-size: 13px;
  color: var(--text-light);
}

@media (max-width: 768px) {
  .paper {
    padding: 22px 20px;
  }
}
</style>
