<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Check, Loading } from '@element-plus/icons-vue'
import { uploadFile } from '@/api/media'
import { COVER_PRESETS, FONT_OPTIONS, createNotebook } from '@/services/notebooks'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'created'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = reactive({
  name: '',
  coverType: 'preset',
  cover: 'c1',
  customCover: '',
  font: 'default',
  encrypted: false,
  password: '',
})

const fileInput = ref()
const uploadingCover = ref(false)

const nameLen = computed(() => form.name.length)

function reset() {
  form.name = ''
  form.coverType = 'preset'
  form.cover = 'c1'
  form.customCover = ''
  form.font = 'default'
  form.encrypted = false
  form.password = ''
}

watch(visible, (v) => {
  if (v) reset()
})

function pickPreset(id) {
  form.coverType = 'preset'
  form.cover = id
}

async function onUpload(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片不超过 2MB')
    return
  }
  uploadingCover.value = true
  try {
    const media = await uploadFile(file, { mediaType: 1 })
    form.customCover = media.fileUrl
    form.coverType = 'custom'
  } catch {
    // 拦截器已提示
  } finally {
    uploadingCover.value = false
  }
}

function submit() {
  if (uploadingCover.value) {
    ElMessage.warning('封面正在上传，请稍候')
    return
  }
  if (!form.name.trim()) {
    ElMessage.warning('请填写日记本名称')
    return
  }
  if (form.encrypted && !form.password) {
    ElMessage.warning('请设置加密密码')
    return
  }
  createNotebook({
    name: form.name,
    coverType: form.coverType,
    cover: form.coverType === 'custom' ? form.customCover : form.cover,
    font: form.font,
    encrypted: form.encrypted,
    password: form.password,
  })
  emit('created')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="创建新日记本"
    width="580px"
    class="nb-create-dialog"
    align-center
  >
    <div class="cn-body">
      <!-- 名称 -->
      <div class="cn-field">
        <label>日记本名称</label>
        <div class="cn-name-wrap">
          <input
            v-model="form.name"
            maxlength="30"
            placeholder="给这个日记本起个名字…"
          />
          <span class="cn-counter">{{ nameLen }}/30</span>
        </div>
      </div>

      <!-- 封面 -->
      <div class="cn-field">
        <label>选择封面</label>
        <div class="cn-covers-outer">
          <div class="cn-covers">
          <button
            v-for="c in COVER_PRESETS"
            :key="c.id"
            class="cn-cover"
            :class="{ active: form.coverType === 'preset' && form.cover === c.id }"
            @click="pickPreset(c.id)"
          >
            <span
              class="cn-cover-face"
              :style="{ backgroundImage: `url(${c.url})` }"
            />
            <span v-if="form.coverType === 'preset' && form.cover === c.id" class="cn-check">
              <el-icon><Check /></el-icon>
            </span>
          </button>

          <!-- 自定义上传 -->
          <button
            class="cn-cover cn-cover-upload"
            :class="{ active: form.coverType === 'custom' }"
            :disabled="uploadingCover"
            @click="fileInput.click()"
          >
            <span
              class="cn-cover-face"
              :style="
                form.customCover ? { backgroundImage: `url(${form.customCover})` } : {}
              "
            >
              <el-icon v-if="uploadingCover" class="is-loading"><Loading /></el-icon>
              <el-icon v-else-if="!form.customCover"><Plus /></el-icon>
            </span>
            <span v-if="form.coverType === 'custom' && !uploadingCover" class="cn-check">
              <el-icon><Check /></el-icon>
            </span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            hidden
            :disabled="uploadingCover"
            @change="onUpload"
          />
          </div>
        </div>
      </div>

      <!-- 字体 -->
      <div class="cn-field">
        <label>选择字体</label>
        <div class="cn-fonts">
          <button
            v-for="f in FONT_OPTIONS"
            :key="f.id"
            class="cn-font"
            :class="{ active: form.font === f.id }"
            :style="{ fontFamily: f.family }"
            @click="form.font = f.id"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- 加密 -->
      <div class="cn-field">
        <label class="cn-check-label">
          <input v-model="form.encrypted" type="checkbox" />
          <span>加密日记本</span>
        </label>
        <transition name="fade-slide">
          <input
            v-if="form.encrypted"
            v-model="form.password"
            type="password"
            class="cn-password"
            placeholder="设置访问密码"
          />
        </transition>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit">创建</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.cn-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cn-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cn-field > label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.cn-name-wrap {
  position: relative;
}
.cn-name-wrap input,
.cn-password {
  width: 100%;
  padding: 11px 56px 11px 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.cn-password {
  padding-right: 14px;
}
.cn-name-wrap input:focus,
.cn-password:focus {
  outline: none;
  border-color: var(--accent-pink);
  box-shadow: 0 0 0 3px rgba(255, 154, 183, 0.18);
}
.cn-counter {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-light);
}

.cn-covers-outer {
  /* 136px 封面槽 + 14px 间距 + 滚动条槽，固定总高避免抖动 */
  height: 158px;
  flex-shrink: 0;
  overflow: hidden;
}
.cn-covers {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 8px;
  height: 158px;
  box-sizing: border-box;
  padding-bottom: 22px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--accent-pink) rgba(255, 154, 183, 0.15);
}
.cn-covers::-webkit-scrollbar {
  height: 6px;
}
.cn-covers::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, var(--accent-pink), var(--primary-color));
  border-radius: 999px;
}
.cn-covers::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}
.cn-covers::-webkit-scrollbar-track {
  background: rgba(255, 154, 183, 0.15);
  border-radius: 999px;
}
.cn-cover {
  position: relative;
  flex: 0 0 104px;
  width: 104px;
  height: 136px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
.cn-cover-face {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 128px;
  border: 2px solid transparent;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-color: #fafafa;
  transform-origin: center center;
  transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), border-color 0.2s,
    box-shadow 0.2s;
  will-change: transform;
}
.cn-cover:hover .cn-cover-face {
  transform: scale(1.06);
  box-shadow: 0 6px 16px rgba(255, 154, 183, 0.35);
}
.cn-cover.active .cn-cover-face {
  border-color: var(--accent-pink);
  box-shadow: 0 4px 14px rgba(255, 154, 183, 0.35);
}
.cn-cover-upload .cn-cover-face {
  color: var(--accent-pink);
  font-size: 24px;
}
.cn-cover-upload:disabled {
  cursor: wait;
}
.cn-cover-upload:disabled .cn-cover-face {
  opacity: 0.7;
}
.cn-check {
  position: absolute;
  bottom: 7px;
  right: 7px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-pink);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.cn-fonts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cn-font {
  padding: 7px 16px;
  border: 1px solid rgba(255, 154, 183, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.cn-font:hover {
  border-color: rgba(255, 154, 183, 0.38);
  background: rgba(255, 248, 251, 0.96);
  color: var(--text-primary);
}
.cn-font.active {
  background: rgba(255, 154, 183, 0.12);
  color: var(--primary-color);
  border-color: rgba(230, 126, 154, 0.45);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 154, 183, 0.1);
}

.cn-check-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
}
.cn-check-label input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-pink);
}
</style>
