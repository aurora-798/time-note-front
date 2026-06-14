<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MagicStick, Picture, VideoCamera, Edit, View, Plus } from '@element-plus/icons-vue'
import { addDiary, updateDiary, getDiaryById } from '@/api/diary'
import { uploadFile } from '@/api/media'
import { resolveMediaUrl } from '@/utils/url'
import { renderMarkdown } from '@/utils/markdown'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const polishing = ref(false)
const uploading = ref(false)
const uploadingKind = ref('') // 'image' | 'video'
const formRef = ref()
const editorRef = ref()
const imageInputRef = ref()
const videoInputRef = ref()

// 编辑区视图：'edit' 源码编辑 | 'preview' 渲染预览
const editorView = ref('edit')

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  id: null,
  diaryDate: today,
  title: '',
  content: '',
  sourceContent: '',
  style: 'warm',
  status: 0,
})

// 本次润色需求（不保存历史，每次只用当前正文 + 这条需求）
const polishInput = ref('')

// 已上传媒体的元数据（暂不关联 diaryId，发布后可再关联）
const uploadedMedia = ref([])

const styleOptions = [
  { value: 'warm', label: '温暖治愈' },
  { value: 'literary', label: '文艺清新' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'simple', label: '简洁朴实' },
]

// 空态灵感提示
const inspirations = [
  '今天天气很好，去公园散步……',
  '和好久不见的朋友吃了顿饭',
  '工作上完成了一件有成就感的事',
  '记录一个突然冒出来的小想法',
]

const rules = {
  diaryDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  content: [{ required: true, message: '日记内容不能为空', trigger: 'blur' }],
}

const wordCount = computed(() => form.content.replace(/\s/g, '').length)
const hasDraft = computed(() => !!form.content.trim())
const renderedContent = computed(() => renderMarkdown(form.content))
const styleLabel = computed(
  () => styleOptions.find((s) => s.value === form.style)?.label || '默认',
)

async function loadDiary() {
  const data = await getDiaryById(route.params.id)
  Object.assign(form, {
    id: data.id,
    diaryDate: data.diaryDate || today,
    title: data.title || '',
    content: data.content || '',
    sourceContent: data.sourceContent || '',
    style: data.style || 'warm',
    status: data.status || 0,
  })
}

function useInspiration(text) {
  form.content = text
  nextTick(() => editorRef.value?.focus?.())
}

// 把光标处（或末尾）插入一段 markdown 到正文
function insertToContent(snippet) {
  form.content = form.content ? `${form.content}\n\n${snippet}` : snippet
}

// —— AI 润色（后端接口待接入，先用本地流式模拟）——
async function handlePolish() {
  if (!hasDraft.value) {
    ElMessage.warning('请先写下今天的日记内容，再让 AI 润色')
    return
  }
  const requirement = polishInput.value.trim()
  polishInput.value = ''
  polishing.value = true
  editorView.value = 'preview' // 润色时切到预览，流式观感更好

  // TODO: 后端「AI 润色日记」接口（POST /api/diary/polish，SSE 流式）补齐后接入：
  //   await polishDiaryStream(
  //     { content: form.content, requirement, style: form.style },
  //     (chunk) => { form.content += chunk; scrollEditorToBottom() },
  //   )
  // 目前后端尚未提供，这里用本地「流式打字」模拟，便于先跑通交互与渲染。
  try {
    await mockPolishStream(form.content, requirement)
  } finally {
    polishing.value = false
  }
}

// 本地流式模拟：把原文包一层标题 + 提示，逐字“打”进正文
function mockPolishStream(original, requirement) {
  const reqLine = requirement ? `> 润色需求：${requirement}\n\n` : ''
  const draft =
    `# ${form.title || '今日随记'}\n\n` +
    reqLine +
    `${original.trim()}\n\n` +
    `*（以上为本地模拟的润色占位。后端「润色」接口接入后，这里会替换为 AI 流式返回的 ${styleLabel.value} 风格 Markdown 日记。）*`

  form.content = ''
  return new Promise((resolve) => {
    let i = 0
    const timer = setInterval(() => {
      form.content += draft.slice(i, i + 3)
      i += 3
      scrollEditorToBottom()
      if (i >= draft.length) {
        clearInterval(timer)
        resolve()
      }
    }, 16)
  })
}

function scrollEditorToBottom() {
  nextTick(() => {
    const el = editorRef.value
    if (el && editorView.value === 'preview') el.scrollTop = el.scrollHeight
  })
}

function onPolishKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (uploading.value || polishing.value) return
    handlePolish()
  }
}

function triggerImageUpload() {
  imageInputRef.value?.click()
}
function triggerVideoUpload() {
  videoInputRef.value?.click()
}

// 选中图片/视频后上传，成功后以 Markdown 形式插入正文
async function onFilePicked(e, kind) {
  const input = e.target
  const file = input.files?.[0]
  input.value = '' // 允许再次选择同一文件
  if (!file) return

  const limitMB = kind === 'image' ? 5 : 50
  if (file.size / 1024 / 1024 > limitMB) {
    ElMessage.error(`${kind === 'image' ? '图片' : '视频'}大小不能超过 ${limitMB}MB`)
    return
  }

  uploading.value = true
  uploadingKind.value = kind
  try {
    const media = await uploadFile(file, { mediaType: kind === 'image' ? 1 : 2 })
    uploadedMedia.value.push(media)
    const url = resolveMediaUrl(media.fileUrl)
    const name = media.fileName || file.name
    if (kind === 'image') {
      insertToContent(`![${name}](${url})`)
    } else {
      // markdown 无原生视频语法，用链接占位（预览区可点击查看）
      insertToContent(`🎬 [${name}](${url})`)
    }
    ElMessage.success(`${kind === 'image' ? '图片' : '视频'}已插入正文`)
  } catch {
    // 拦截器已提示
  } finally {
    uploading.value = false
    uploadingKind.value = ''
  }
}

async function handleSave(status) {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      ...form,
      userId: userStore.userId,
      status,
      wordCount: wordCount.value,
      isEdit: 1,
    }
    if (isEdit.value) {
      await updateDiary(payload)
    } else {
      await addDiary(payload)
    }
    ElMessage.success(status === 1 ? '已发布' : '已保存草稿')
    router.push('/diary')
  } catch {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadDiary()
})
</script>

<template>
  <div class="diary-edit">
    <header class="page-head">
      <div class="head-meta">
        <h1 class="page-title">{{ isEdit ? '编辑日记' : '写日记' }}</h1>
        <div class="meta-row">
          <el-date-picker
            v-model="form.diaryDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="日期"
            size="small"
            style="width: 140px"
          />
          <el-select v-model="form.style" size="small" style="width: 130px">
            <el-option
              v-for="s in styleOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
          <span class="wc">{{ wordCount }} 字</span>
        </div>
      </div>
      <div class="head-actions">
        <el-button @click="router.push('/diary')">取消</el-button>
        <el-button :loading="saving" @click="handleSave(0)">保存草稿</el-button>
        <el-button type="primary" class="publish-btn" :loading="saving" @click="handleSave(1)">
          发布
        </el-button>
      </div>
    </header>

    <el-form ref="formRef" :model="form" :rules="rules" class="editor-form">
      <!-- 编辑器卡片：占满主区，底部留出胶囊空间 -->
      <section class="editor-card">
        <!-- 顶部工具条：标题 + 编辑/预览切换 -->
        <div class="editor-toolbar">
          <el-form-item prop="title" class="title-item">
            <el-input
              v-model="form.title"
              placeholder="标题（可留空）"
              class="title-input"
            />
          </el-form-item>
          <el-radio-group v-model="editorView" size="small" class="view-switch">
            <el-radio-button value="edit">
              <el-icon><Edit /></el-icon> 编辑
            </el-radio-button>
            <el-radio-button value="preview">
              <el-icon><View /></el-icon> 预览
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 空态欢迎引导 -->
        <div v-if="!hasDraft && editorView === 'edit'" class="welcome">
          <el-icon class="welcome-icon"><MagicStick /></el-icon>
          <p class="welcome-title">今天过得怎么样？</p>
          <p class="welcome-sub">先写下今天的点滴，再让 AI 帮你润色成 {{ styleLabel }} 风格的日记</p>
          <div class="chips">
            <button
              v-for="(tip, i) in inspirations"
              :key="i"
              type="button"
              class="chip"
              @click="useInspiration(tip)"
            >
              {{ tip }}
            </button>
          </div>
          <el-form-item prop="content" class="welcome-input">
            <el-input
              ref="editorRef"
              v-model="form.content"
              type="textarea"
              :autosize="{ minRows: 6, maxRows: 16 }"
              resize="none"
              placeholder="在这里写下今天发生的事，支持 Markdown…"
            />
          </el-form-item>
        </div>

        <!-- 编辑态：Markdown 源码 -->
        <el-form-item
          v-else-if="editorView === 'edit'"
          prop="content"
          class="body-item"
        >
          <el-input
            ref="editorRef"
            v-model="form.content"
            type="textarea"
            resize="none"
            class="md-textarea"
            placeholder="支持 Markdown 语法，自由编辑…"
          />
        </el-form-item>

        <!-- 预览态：渲染 Markdown -->
        <div v-else ref="editorRef" class="md-preview-wrap">
          <div v-if="hasDraft" class="md-preview markdown-body" v-html="renderedContent"></div>
          <p v-else class="preview-empty">还没有内容，切到「编辑」写点什么吧</p>
          <span v-if="polishing" class="stream-cursor"></span>
        </div>
      </section>

      <!-- 底部悬浮胶囊：媒体 + 润色指令 + 润色按钮 -->
      <div class="capsule">
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*"
          hidden
          @change="(e) => onFilePicked(e, 'image')"
        />
        <input
          ref="videoInputRef"
          type="file"
          accept="video/*"
          hidden
          @change="(e) => onFilePicked(e, 'video')"
        />
        <el-tooltip content="插入图片" placement="top">
          <button
            type="button"
            class="capsule-icon-btn"
            :disabled="uploading || polishing"
            @click="triggerImageUpload"
          >
            <el-icon><Picture /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip content="插入视频" placement="top">
          <button
            type="button"
            class="capsule-icon-btn"
            :disabled="uploading || polishing"
            @click="triggerVideoUpload"
          >
            <el-icon><VideoCamera /></el-icon>
          </button>
        </el-tooltip>

        <el-input
          v-model="polishInput"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          resize="none"
          class="capsule-input"
          :placeholder="
            uploading
              ? `正在上传${uploadingKind === 'image' ? '图片' : '视频'}…`
              : '告诉 AI 怎么润色（可留空，回车润色）。例如：写得更温暖一些'
          "
          :disabled="uploading || polishing"
          @keydown="onPolishKeydown"
        />

        <el-button
          type="primary"
          class="polish-btn"
          :icon="MagicStick"
          :loading="polishing"
          :disabled="uploading || !hasDraft"
          @click="handlePolish"
        >
          {{ polishing ? '润色中' : '润色' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.diary-edit {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
  gap: 16px;
}
.head-meta {
  min-width: 0;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 10px;
  background: var(--tn-gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wc {
  font-size: 12px;
  color: var(--tn-text-faint);
}
.head-actions {
  flex-shrink: 0;
}
.publish-btn {
  color: #fff;
  background: var(--tn-gradient-primary);
  background-size: 200% 100%;
  border: none;
  transition: transform 0.25s, box-shadow 0.25s, background-position 0.5s;
}
.publish-btn:hover {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: var(--tn-glow-strong);
}

.editor-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 编辑器卡片 */
.editor-card {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--tn-glass);
  backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  border: 1px solid var(--tn-glass-border);
  border-radius: 18px;
  box-shadow: var(--tn-shadow);
  overflow: hidden;
}
.editor-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--tn-gradient-aurora);
  z-index: 1;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 22px 0;
}
.title-item {
  flex: 1;
  margin-bottom: 0;
}
.title-item :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
  padding-left: 0;
}
.title-input :deep(.el-input__inner) {
  font-size: 22px;
  font-weight: 700;
  height: 40px;
}
.view-switch {
  flex-shrink: 0;
}
.view-switch :deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 正文编辑/预览 */
.body-item {
  flex: 1;
  margin: 14px 0 0;
  padding: 0 22px 22px;
  min-height: 0;
  display: flex;
}
.body-item :deep(.el-form-item__content) {
  flex: 1;
  height: 100%;
}
.md-textarea {
  height: 100%;
}
.md-textarea :deep(.el-textarea__inner) {
  height: 100%;
  font-size: 15px;
  line-height: 1.9;
  font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
}

.md-preview-wrap {
  position: relative;
  flex: 1;
  margin-top: 14px;
  padding: 4px 26px 26px;
  overflow-y: auto;
}
.preview-empty {
  color: var(--tn-text-faint);
  font-size: 14px;
  text-align: center;
  padding: 48px 0;
}
.stream-cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  margin-left: 2px;
  background: var(--tn-aurora-1);
  border-radius: 2px;
  animation: cursor-blink 0.9s steps(2) infinite;
  vertical-align: text-bottom;
}
@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* 空态欢迎 */
.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 24px 26px;
  overflow-y: auto;
}
.welcome-icon {
  font-size: 46px;
  background: var(--tn-gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.welcome-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--tn-text);
  margin-top: 14px;
}
.welcome-sub {
  font-size: 14px;
  color: var(--tn-text-soft);
  margin-top: 6px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 22px 0 6px;
}
.chip {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--tn-text-soft);
  background: var(--tn-glass-strong);
  border: 1px solid var(--tn-glass-border);
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, color 0.2s;
}
.chip:hover {
  transform: translateY(-2px);
  color: var(--tn-aurora-1);
  border-color: var(--tn-aurora-1);
}
.welcome-input {
  width: 100%;
  max-width: 640px;
  margin: 18px auto 0;
}

/* 底部悬浮胶囊 */
.capsule {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--tn-glass);
  backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--tn-glass-blur)) saturate(140%);
  border: 1px solid var(--tn-glass-border);
  border-radius: 22px;
  box-shadow: var(--tn-shadow);
}
.capsule-icon-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--tn-text-soft);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.capsule-icon-btn:hover:not(:disabled) {
  color: var(--tn-aurora-1);
  background: var(--tn-glass-strong);
}
.capsule-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.capsule-input {
  flex: 1;
}
.capsule-input :deep(.el-textarea__inner) {
  box-shadow: none;
  background: transparent;
  padding: 8px 6px;
  font-size: 14px;
}
.polish-btn {
  flex-shrink: 0;
  color: #fff;
  background: var(--tn-gradient-primary);
  background-size: 200% 100%;
  border: none;
  border-radius: 18px;
  transition: transform 0.25s, box-shadow 0.25s, background-position 0.5s;
}
.polish-btn:hover:not(.is-disabled) {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: var(--tn-glow-strong);
}

/* Markdown 渲染样式 */
.markdown-body {
  font-size: 15px;
  line-height: 1.9;
  color: var(--tn-text);
  word-break: break-word;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-weight: 700;
  margin: 1.2em 0 0.6em;
  color: var(--tn-text);
}
.markdown-body :deep(h1) {
  font-size: 1.6em;
}
.markdown-body :deep(h2) {
  font-size: 1.35em;
}
.markdown-body :deep(h3) {
  font-size: 1.15em;
}
.markdown-body :deep(p) {
  margin: 0.7em 0;
}
.markdown-body :deep(blockquote) {
  margin: 0.9em 0;
  padding: 6px 16px;
  border-left: 3px solid var(--tn-aurora-1);
  background: var(--tn-glass-strong);
  border-radius: 0 8px 8px 0;
  color: var(--tn-text-soft);
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.6em;
  margin: 0.7em 0;
}
.markdown-body :deep(li) {
  margin: 0.3em 0;
}
.markdown-body :deep(code) {
  padding: 2px 6px;
  font-size: 0.9em;
  background: var(--tn-glass-strong);
  border-radius: 5px;
}
.markdown-body :deep(pre) {
  padding: 14px 16px;
  margin: 0.9em 0;
  overflow-x: auto;
  background: var(--tn-glass-strong);
  border: 1px solid var(--tn-glass-border);
  border-radius: 10px;
}
.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}
.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  margin: 0.6em 0;
}
.markdown-body :deep(a) {
  color: var(--tn-aurora-1);
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--tn-border);
  margin: 1.4em 0;
}

@media (max-width: 768px) {
  .page-head {
    flex-direction: column;
  }
  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>
