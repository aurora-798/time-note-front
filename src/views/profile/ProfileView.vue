<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { EditPen, User, Phone, Message, Plus, Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { uploadFile } from '@/api/media'
import { resolveMediaUrl } from '@/utils/url'

const userStore = useUserStore()

const editing = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const formRef = ref()

const form = reactive({
  nickname: '',
  gender: 0,
  age: null,
  diaryStyle: 'warm',
  phone: '',
  email: '',
  avatar: '',
})

const styleOptions = [
  { value: 'warm', label: '温暖治愈' },
  { value: 'literary', label: '文艺清新' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'simple', label: '简洁朴实' },
]

const genderMap = { 0: '保密', 1: '男', 2: '女' }

const rules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

const avatarText = computed(
  () => (form.nickname || userStore.profile?.username || 'U').charAt(0).toUpperCase(),
)
const avatarUrl = computed(() => resolveMediaUrl(form.avatar))
const styleLabel = computed(
  () => styleOptions.find((s) => s.value === form.diaryStyle)?.label || '未设置',
)

function syncFromStore() {
  const p = userStore.profile || {}
  form.nickname = p.nickname || ''
  form.gender = p.gender ?? 0
  form.age = p.age ?? null
  form.diaryStyle = p.diaryStyle || 'warm'
  form.phone = p.phone || ''
  form.email = p.email || ''
  form.avatar = p.avatar || ''
}

function startEdit() {
  editing.value = true
}

function cancelEdit() {
  syncFromStore()
  editing.value = false
}

// el-upload 上传前校验：仅图片、限制 5MB
function beforeAvatarUpload(file) {
  const isImage = file.type.startsWith('image/')
  const within5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('头像只能是图片格式')
    return false
  }
  if (!within5M) {
    ElMessage.error('头像大小不能超过 5MB')
    return false
  }
  return true
}

// 自定义上传：走封装的 axios（携带 token、统一错误处理）
async function handleAvatarUpload({ file }) {
  uploadingAvatar.value = true
  try {
    const media = await uploadFile(file, { mediaType: 3 })
    form.avatar = media.fileUrl
    ElMessage.success('头像已上传，保存后生效')
  } catch {
    // 拦截器已提示
  } finally {
    uploadingAvatar.value = false
  }
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    await userStore.saveProfile({ ...form })
    ElMessage.success('资料已保存')
    editing.value = false
  } catch {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await userStore.fetchProfile()
  } catch {
    // 忽略，使用已有缓存
  }
  syncFromStore()
})
</script>

<template>
  <div class="profile">
    <!-- 个人名片 Banner -->
    <section class="banner">
      <div class="banner-glow"></div>
      <div class="banner-main">
        <el-avatar :size="88" :src="avatarUrl" class="big-avatar">
          {{ avatarText }}
        </el-avatar>
        <div class="banner-info">
          <div class="name-row">
            <span class="name">{{ form.nickname || userStore.profile?.username }}</span>
            <span class="vip-badge" :class="{ plain: !userStore.profile?.isVip }">
              {{ userStore.profile?.isVip ? 'VIP 会员' : '普通用户' }}
            </span>
          </div>
          <div class="username">@{{ userStore.profile?.username }}</div>
        </div>
      </div>
      <el-button
        v-if="!editing"
        :icon="EditPen"
        class="edit-btn"
        round
        @click="startEdit"
      >
        编辑资料
      </el-button>
    </section>

    <!-- 展示态 -->
    <div v-if="!editing" class="info-grid">
      <section class="info-card">
        <div class="info-card-title">
          <el-icon><User /></el-icon> 基本资料
        </div>
        <div class="info-row">
          <span class="info-label">性别</span>
          <span class="info-value">{{ genderMap[form.gender] }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">年龄</span>
          <span class="info-value" :class="{ empty: !form.age }">
            {{ form.age ? form.age + ' 岁' : '未填写' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">日记风格偏好</span>
          <span class="info-value">{{ styleLabel }}</span>
        </div>
      </section>

      <section class="info-card">
        <div class="info-card-title">
          <el-icon><Message /></el-icon> 联系方式
        </div>
        <div class="info-row">
          <span class="info-label"><el-icon><Phone /></el-icon> 手机号</span>
          <span class="info-value" :class="{ empty: !form.phone }">
            {{ form.phone || '未填写' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label"><el-icon><Message /></el-icon> 邮箱</span>
          <span class="info-value" :class="{ empty: !form.email }">
            {{ form.email || '未填写' }}
          </span>
        </div>
      </section>
    </div>

    <!-- 编辑态 -->
    <section v-else class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-group-title">基本资料</div>
        <div class="form-row">
          <el-form-item label="昵称" prop="nickname" class="col">
            <el-input v-model="form.nickname" placeholder="你的昵称" />
          </el-form-item>
          <el-form-item label="性别" class="col">
            <el-radio-group v-model="form.gender">
              <el-radio :value="0">保密</el-radio>
              <el-radio :value="1">男</el-radio>
              <el-radio :value="2">女</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="年龄" class="col">
            <el-input-number v-model="form.age" :min="1" :max="120" :step="1" />
          </el-form-item>
          <el-form-item label="日记风格偏好" class="col">
            <el-select v-model="form.diaryStyle" placeholder="选择风格">
              <el-option
                v-for="s in styleOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-group-title">联系方式</div>
        <div class="form-row">
          <el-form-item label="手机号" class="col">
            <el-input v-model="form.phone" placeholder="手机号" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email" class="col">
            <el-input v-model="form.email" placeholder="邮箱" />
          </el-form-item>
        </div>

        <div class="form-group-title">头像</div>
        <el-form-item>
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :http-request="handleAvatarUpload"
            :before-upload="beforeAvatarUpload"
            :disabled="uploadingAvatar"
            accept="image/*"
            drag
          >
            <div class="avatar-upload-inner">
              <el-avatar :size="72" :src="avatarUrl" class="upload-preview">
                {{ avatarText }}
              </el-avatar>
              <div class="avatar-upload-hint">
                <el-icon class="upload-icon" :class="{ 'is-loading': uploadingAvatar }">
                  <Loading v-if="uploadingAvatar" />
                  <Plus v-else />
                </el-icon>
                <span>{{ uploadingAvatar ? '上传中…' : '点击或拖拽图片上传' }}</span>
                <small>支持 JPG/PNG，不超过 5MB</small>
              </div>
            </div>
          </el-upload>
        </el-form-item>

        <div class="form-actions">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" class="save-btn" :loading="saving" @click="handleSave">
            保存修改
          </el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>

<style scoped>
.profile {
  padding: 24px 0 32px;
  overflow-y: auto;
  min-height: 0;
}

/* 名片 Banner */
.banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 32px;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 24px;
}
.banner,
.info-card,
.form-card {
  background: var(--card-gradient);
  border: 1px solid rgba(255, 154, 183, 0.28);
  box-shadow: var(--shadow-pink);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
.banner-glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(60% 120% at 0% 0%, rgba(255, 154, 183, 0.22), transparent 55%),
    radial-gradient(50% 120% at 100% 100%, rgba(192, 165, 255, 0.18), transparent 55%);
  opacity: 0.85;
  filter: blur(30px);
}
.banner-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 20px;
}
.big-avatar {
  background: var(--gradient-primary);
  color: #fff;
  font-size: 34px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(255, 154, 183, 0.2), var(--shadow-pink);
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.vip-badge {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  padding: 3px 12px;
  border-radius: 20px;
  background: var(--gradient-primary);
  box-shadow: var(--shadow-pink);
}
.vip-badge.plain {
  background: var(--surface-glass-strong);
  color: var(--text-secondary);
  box-shadow: none;
  border: 1px solid rgba(255, 154, 183, 0.24);
}
.username {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.edit-btn {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  background: var(--btn-surface) !important;
  border-color: rgba(255, 154, 183, 0.32) !important;
  color: var(--primary-color) !important;
}
.edit-btn:hover {
  background: var(--btn-surface-hover) !important;
  border-color: var(--accent-pink) !important;
}

/* 展示态信息卡 */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.info-card {
  border-radius: 18px;
  padding: 24px 26px;
}
.info-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 18px;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border-color);
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}
.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.info-value.empty {
  color: var(--text-light);
  font-weight: 400;
}

/* 编辑态 */
.form-card {
  border-radius: 18px;
  padding: 28px;
}
.form-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
  margin: 8px 0 14px;
}
.form-row {
  display: flex;
  gap: 20px;
}
.col {
  flex: 1;
}
.form-card :deep(.el-input__wrapper),
.form-card :deep(.el-select__wrapper),
.form-card :deep(.el-input-number) {
  background: var(--surface-solid);
  box-shadow: 0 0 0 1px rgba(255, 154, 183, 0.18) inset;
}
.form-card :deep(.el-input__wrapper:hover),
.form-card :deep(.el-select__wrapper:hover),
.form-card :deep(.el-input-number:hover) {
  box-shadow: 0 0 0 1px rgba(255, 154, 183, 0.32) inset;
}
.form-card :deep(.el-input__wrapper.is-focus),
.form-card :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--primary-color) inset;
}
.avatar-uploader {
  width: 100%;
}
.avatar-uploader :deep(.el-upload),
.avatar-uploader :deep(.el-upload-dragger) {
  width: 100%;
}
.avatar-uploader :deep(.el-upload-dragger) {
  padding: 0;
  border-radius: 14px;
  border: 1px dashed rgba(255, 154, 183, 0.35);
  background: var(--btn-surface);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.avatar-uploader :deep(.el-upload-dragger:hover) {
  border-color: var(--accent-pink);
  box-shadow: var(--shadow-pink);
}
.avatar-upload-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 20px;
}
.upload-preview {
  background: var(--gradient-primary);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  flex-shrink: 0;
}
.avatar-upload-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  color: var(--text-secondary);
  font-size: 14px;
}
.avatar-upload-hint .upload-icon {
  font-size: 18px;
  color: var(--primary-color);
}
.avatar-uploader :deep(.is-loading),
.upload-icon.is-loading {
  animation: avatar-spin 0.9s linear infinite;
}
@keyframes avatar-spin {
  to {
    transform: rotate(360deg);
  }
}
.avatar-upload-hint small {
  font-size: 12px;
  color: var(--text-light);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
.form-actions :deep(.el-button:not(.save-btn)) {
  background: var(--btn-surface);
  border-color: rgba(255, 154, 183, 0.28);
  color: var(--text-secondary);
}
.save-btn {
  color: #fff;
  background: var(--gradient-primary);
  background-size: 200% 100%;
  border: none;
  transition: transform 0.25s, box-shadow 0.25s, background-position 0.5s;
}
.save-btn:hover {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: var(--shadow-pink-strong);
}

@media (max-width: 768px) {
  .profile {
    padding: 16px 0 24px;
  }
  .banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .info-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
