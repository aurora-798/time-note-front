<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  ArrowUp,
  Paperclip,
  Square,
  X,
  StopCircle,
  Mic,
  Globe,
  BrainCog,
  FolderCode,
} from 'lucide-vue-next'
import VoiceRecorder from './VoiceRecorder.vue'
import ImageViewDialog from './ImageViewDialog.vue'

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: '输入你的问题，或聊聊今天的心情…' },
})

const emit = defineEmits(['send', 'stop'])

const input = ref('')
const files = ref([])
const filePreviews = ref({})
const selectedImage = ref(null)
const isRecording = ref(false)
const showSearch = ref(false)
const showThink = ref(false)
const showCanvas = ref(false)
const uploadInputRef = ref(null)
const textareaRef = ref(null)
const maxHeight = 240

const hasContent = computed(() => input.value.trim() !== '' || files.value.length > 0)

const activePlaceholder = computed(() => {
  if (showSearch.value) return '搜索网络信息…'
  if (showThink.value) return '深入思考你的问题…'
  if (showCanvas.value) return '在画布上创作…'
  return props.placeholder
})

function isImageFile(file) {
  return file.type.startsWith('image/')
}

function processFile(file) {
  if (!isImageFile(file)) return
  if (file.size > 10 * 1024 * 1024) return
  files.value = [file]
  const reader = new FileReader()
  reader.onload = (e) => {
    filePreviews.value = { [file.name]: e.target?.result || '' }
  }
  reader.readAsDataURL(file)
}

function handleRemoveFile(index) {
  const fileToRemove = files.value[index]
  if (fileToRemove && filePreviews.value[fileToRemove.name]) {
    filePreviews.value = {}
  }
  files.value = []
}

function handleToggleChange(mode) {
  if (mode === 'search') {
    showSearch.value = !showSearch.value
    showThink.value = false
    showCanvas.value = false
  } else if (mode === 'think') {
    showThink.value = !showThink.value
    showSearch.value = false
    showCanvas.value = false
  }
}

function handleCanvasToggle() {
  showCanvas.value = !showCanvas.value
  if (showCanvas.value) {
    showSearch.value = false
    showThink.value = false
  }
}

function handleDragOver(e) {
  e.preventDefault()
  e.stopPropagation()
}

function handleDragLeave(e) {
  e.preventDefault()
  e.stopPropagation()
}

function handleDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  const dropped = Array.from(e.dataTransfer.files).filter(isImageFile)
  if (dropped.length > 0) processFile(dropped[0])
}

function handlePaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        e.preventDefault()
        processFile(file)
        break
      }
    }
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
}

watch(input, () => nextTick(autoResize))

function handleSubmit() {
  if (!input.value.trim() && files.value.length === 0) return

  let messagePrefix = ''
  if (showSearch.value) messagePrefix = '[Search: '
  else if (showThink.value) messagePrefix = '[Think: '
  else if (showCanvas.value) messagePrefix = '[Canvas: '

  const formattedInput = messagePrefix ? `${messagePrefix}${input.value}]` : input.value
  emit('send', formattedInput, [...files.value])
  input.value = ''
  files.value = []
  filePreviews.value = {}
  nextTick(autoResize)
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (props.isLoading || isRecording.value) return
    handleSubmit()
  }
}

function handleMainAction() {
  if (props.isLoading) {
    emit('stop')
    return
  }
  if (isRecording.value) {
    isRecording.value = false
    return
  }
  if (hasContent.value) {
    handleSubmit()
  } else {
    isRecording.value = true
  }
}

function onVoiceStop(duration) {
  isRecording.value = false
  emit('send', `[Voice message - ${duration} seconds]`, [])
}

onMounted(() => {
  document.addEventListener('paste', handlePaste)
  nextTick(autoResize)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div
    class="prompt-box"
    :class="{ 'is-loading': isLoading, 'is-recording': isRecording }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div v-if="files.length > 0 && !isRecording" class="file-previews">
      <div v-for="(file, index) in files" :key="index" class="file-preview">
        <div
          v-if="file.type.startsWith('image/') && filePreviews[file.name]"
          class="preview-thumb"
          @click="selectedImage = filePreviews[file.name]"
        >
          <img :src="filePreviews[file.name]" :alt="file.name" />
          <button class="remove-btn" @click.stop="handleRemoveFile(index)">
            <X :size="12" />
          </button>
        </div>
      </div>
    </div>

    <div class="textarea-wrap" :class="{ hidden: isRecording }">
      <textarea
        ref="textareaRef"
        v-model="input"
        class="prompt-textarea"
        :placeholder="activePlaceholder"
        :disabled="isLoading || isRecording"
        rows="1"
        @keydown="handleKeyDown"
      />
    </div>

    <VoiceRecorder :is-recording="isRecording" @stop="onVoiceStop" />

    <div class="prompt-actions">
      <div class="actions-left" :class="{ hidden: isRecording }">
        <el-tooltip content="上传图片" placement="top">
          <button
            class="icon-btn"
            :disabled="isRecording"
            @click="uploadInputRef?.click()"
          >
            <Paperclip :size="18" />
            <input
              ref="uploadInputRef"
              type="file"
              class="hidden-input"
              accept="image/*"
              @change="
                (e) => {
                  if (e.target.files?.[0]) processFile(e.target.files[0])
                  e.target.value = ''
                }
              "
            />
          </button>
        </el-tooltip>

        <div class="mode-toggles">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: showSearch, 'mode-search': showSearch }"
            @click="handleToggleChange('search')"
          >
            <Globe :size="16" class="mode-icon" :class="{ spin: showSearch }" />
            <transition name="label-expand">
              <span v-if="showSearch" class="mode-label">Search</span>
            </transition>
          </button>

          <span class="mode-divider" />

          <button
            type="button"
            class="mode-btn"
            :class="{ active: showThink, 'mode-think': showThink }"
            @click="handleToggleChange('think')"
          >
            <BrainCog :size="16" class="mode-icon" :class="{ spin: showThink }" />
            <transition name="label-expand">
              <span v-if="showThink" class="mode-label">Think</span>
            </transition>
          </button>

          <span class="mode-divider" />

          <button
            type="button"
            class="mode-btn"
            :class="{ active: showCanvas, 'mode-canvas': showCanvas }"
            @click="handleCanvasToggle"
          >
            <FolderCode :size="16" class="mode-icon" :class="{ spin: showCanvas }" />
            <transition name="label-expand">
              <span v-if="showCanvas" class="mode-label">Canvas</span>
            </transition>
          </button>
        </div>
      </div>

      <el-tooltip
        :content="
          isLoading
            ? '停止生成'
            : isRecording
              ? '停止录音'
              : hasContent
                ? '发送消息'
                : '语音消息'
        "
        placement="top"
      >
        <button
          class="send-btn"
          :class="{
            recording: isRecording,
            ready: hasContent && !isLoading,
            loading: isLoading,
          }"
          :disabled="isLoading && !hasContent"
          @click="handleMainAction"
        >
          <Square v-if="isLoading" :size="14" class="fill-icon" />
          <StopCircle v-else-if="isRecording" :size="18" class="stop-icon" />
          <ArrowUp v-else-if="hasContent" :size="16" />
          <Mic v-else :size="18" />
        </button>
      </el-tooltip>
    </div>
  </div>

  <ImageViewDialog :image-url="selectedImage" @close="selectedImage = null" />
</template>

<style scoped>
.prompt-box {
  width: 100%;
  border-radius: 24px;
  border: 1px solid var(--border-color);
  background: var(--surface-strong);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 10px 12px;
  box-shadow: var(--shadow-light);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.prompt-box.is-loading {
  border-color: rgba(230, 126, 154, 0.45);
}
.prompt-box.is-recording {
  border-color: rgba(255, 107, 107, 0.5);
}

.file-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
}
.preview-thumb {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.preview-thumb:hover {
  transform: scale(1.03);
}
.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  padding: 0;
}

.textarea-wrap {
  transition: opacity 0.3s ease, height 0.3s ease;
}
.textarea-wrap.hidden {
  height: 0;
  overflow: hidden;
  opacity: 0;
}
.prompt-textarea {
  display: block;
  width: 100%;
  min-height: 44px;
  max-height: 240px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  resize: none;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
}
.prompt-textarea::placeholder {
  color: var(--text-light);
}
.prompt-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.prompt-textarea::-webkit-scrollbar {
  width: 6px;
}
.prompt-textarea::-webkit-scrollbar-thumb {
  background: rgba(230, 126, 154, 0.35);
  border-radius: 3px;
}

.prompt-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
}
.actions-left {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.3s ease;
}
.actions-left.hidden {
  opacity: 0;
  visibility: hidden;
  height: 0;
  overflow: hidden;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.icon-btn:hover:not(:disabled) {
  background: rgba(230, 126, 154, 0.12);
  color: var(--text-secondary);
}
.hidden-input {
  display: none;
}

.mode-toggles {
  display: flex;
  align-items: center;
  gap: 2px;
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mode-btn:hover {
  color: var(--text-secondary);
}
.mode-btn.mode-search {
  background: rgba(147, 213, 255, 0.18);
  border-color: var(--accent-blue);
  color: #4a9fd4;
}
.mode-btn.mode-think {
  background: rgba(192, 165, 255, 0.18);
  border-color: var(--accent-purple);
  color: #8b6fd4;
}
.mode-btn.mode-canvas {
  background: rgba(255, 207, 138, 0.22);
  border-color: var(--accent-yellow);
  color: #c98a2e;
}
.mode-icon {
  flex-shrink: 0;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mode-icon.spin {
  transform: rotate(360deg) scale(1.08);
}
.mode-label {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
}
.mode-divider {
  width: 1.5px;
  height: 20px;
  margin: 0 2px;
  background: linear-gradient(
    to top,
    transparent,
    rgba(192, 165, 255, 0.55),
    transparent
  );
  border-radius: 1px;
}

.label-expand-enter-active,
.label-expand-leave-active {
  transition: opacity 0.2s ease, max-width 0.2s ease;
  max-width: 80px;
}
.label-expand-enter-from,
.label-expand-leave-to {
  opacity: 0;
  max-width: 0;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled) {
  background: rgba(230, 126, 154, 0.12);
  color: var(--text-secondary);
}
.send-btn.ready {
  background: var(--gradient-primary);
  color: #fff;
  box-shadow: var(--shadow-pink);
}
.send-btn.ready:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}
.send-btn.recording {
  color: #ff6b6b;
}
.send-btn.recording:hover {
  background: rgba(255, 107, 107, 0.12);
}
.send-btn.loading {
  background: var(--gradient-primary);
  color: #fff;
}
.fill-icon {
  fill: currentColor;
}
.stop-icon {
  color: #ff6b6b;
}

@media (prefers-reduced-motion: reduce) {
  .mode-icon.spin {
    transform: none;
  }
}
</style>
