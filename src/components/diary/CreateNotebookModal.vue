<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Check } from '@element-plus/icons-vue'
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

function onUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片不超过 2MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.customCover = reader.result
    form.coverType = 'custom'
  }
  reader.readAsDataURL(file)
}

function submit() {
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
    width="540px"
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
        <div class="cn-covers">
          <button
            v-for="c in COVER_PRESETS"
            :key="c.id"
            class="cn-cover"
            :class="{ active: form.coverType === 'preset' && form.cover === c.id }"
            :style="{ backgroundImage: c.gradient }"
            @click="pickPreset(c.id)"
          >
            <span class="cn-cover-emoji">{{ c.emoji }}</span>
            <span v-if="form.coverType === 'preset' && form.cover === c.id" class="cn-check">
              <el-icon><Check /></el-icon>
            </span>
          </button>

          <!-- 自定义上传 -->
          <button
            class="cn-cover cn-cover-upload"
            :class="{ active: form.coverType === 'custom' }"
            :style="
              form.customCover ? { backgroundImage: `url(${form.customCover})` } : {}
            "
            @click="fileInput.click()"
          >
            <el-icon v-if="!form.customCover"><Plus /></el-icon>
            <span v-if="form.coverType === 'custom'" class="cn-check">
              <el-icon><Check /></el-icon>
            </span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            hidden
            @change="onUpload"
          />
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

.cn-covers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}
.cn-cover {
  position: relative;
  aspect-ratio: 3 / 4;
  border: 2px solid transparent;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.cn-cover:hover {
  transform: translateY(-2px);
}
.cn-cover.active {
  border-color: var(--accent-pink);
  box-shadow: 0 4px 14px rgba(255, 154, 183, 0.35);
}
.cn-cover-emoji {
  font-size: 22px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.15));
}
.cn-cover-upload {
  background-color: #fafafa;
  color: var(--accent-pink);
  font-size: 20px;
}
.cn-check {
  position: absolute;
  bottom: 3px;
  right: 3px;
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
  gap: 10px;
}
.cn-font {
  padding: 8px 18px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: 0.2s;
}
.cn-font:hover {
  border-color: var(--accent-pink);
}
.cn-font.active {
  background: var(--gradient-primary);
  color: #fff;
  border-color: transparent;
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
