<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Avatar, View } from '@element-plus/icons-vue'
import { register as registerApi } from '@/api/auth'
import { useUserStore } from '@/store/user'
import CartoonCharacters from '@/components/auth/CartoonCharacters.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const mode = ref('login')
const loading = ref(false)
const loginFormRef = ref()
const registerFormRef = ref()
const showPassword = ref(false)
const isTyping = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度 3-20 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, cb) =>
        value === registerForm.password ? cb() : cb(new Error('两次密码不一致')),
      trigger: 'blur',
    },
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
}

const title = computed(() => (mode.value === 'login' ? '欢迎回来' : '加入时光笔录'))
const subtitle = computed(() =>
  mode.value === 'login' ? '请填写你的登录信息' : '让 AI 帮你留住每一天',
)

function switchMode(target) {
  mode.value = target
  showPassword.value = false
}

async function handleLogin() {
  await loginFormRef.value.validate()
  loading.value = true
  try {
    await userStore.login({ ...loginForm })
    ElMessage.success('登录成功')
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    // 错误已在拦截器中提示
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  await registerFormRef.value.validate()
  loading.value = true
  try {
    await registerApi({
      username: registerForm.username,
      password: registerForm.password,
      nickname: registerForm.nickname,
    })
    ElMessage.success('注册成功，请登录')
    loginForm.username = registerForm.username
    switchMode('login')
  } catch (e) {
    // 错误已在拦截器中提示
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-split">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-header">
          <div class="brand-logo">时光笔录</div>
        </div>

        <!-- 卡通角色 -->
        <div class="characters-area">
          <CartoonCharacters
            :is-typing="isTyping"
            :password="mode === 'login' ? loginForm.password : registerForm.password"
            :show-password="showPassword"
          />
        </div>

        <!-- 装饰光斑 -->
        <div class="brand-glow brand-glow--top" />
        <div class="brand-glow brand-glow--bottom" />
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <div class="form-inner">
          <!-- 头部 -->
          <div class="form-header">
            <h1 class="form-title">{{ title }}</h1>
            <p class="form-subtitle">{{ subtitle }}</p>
          </div>

          <transition name="form-fade" mode="out-in">
            <!-- 登录表单 -->
            <div v-if="mode === 'login'" key="login" class="form-body">
              <el-form
                ref="loginFormRef"
                :model="loginForm"
                :rules="loginRules"
                size="large"
                @keyup.enter="handleLogin"
              >
                <el-form-item prop="username">
                  <el-input
                    v-model="loginForm.username"
                    placeholder="用户名"
                    :prefix-icon="User"
                    clearable
                    @focus="isTyping = true"
                    @blur="isTyping = false"
                  />
                </el-form-item>
                <el-form-item prop="password">
                  <div class="password-wrap">
                    <el-input
                      v-model="loginForm.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="密码"
                      :prefix-icon="Lock"
                    />
                    <button
                      type="button"
                      class="password-eye"
                      :class="{ 'password-eye--active': showPassword }"
                      @click="showPassword = !showPassword"
                    >
                      <el-icon :size="18"><View /></el-icon>
                    </button>
                  </div>
                </el-form-item>

                <el-button
                  type="primary"
                  class="submit-btn"
                  :loading="loading"
                  @click="handleLogin"
                >
                  登 录
                </el-button>
              </el-form>

              <p class="switch-tip">
                还没有账号？<a @click="switchMode('register')">立即注册</a>
              </p>
            </div>

            <!-- 注册表单 -->
            <div v-else key="register" class="form-body">
              <el-form
                ref="registerFormRef"
                :model="registerForm"
                :rules="registerRules"
                size="large"
              >
                <el-form-item prop="username">
                  <el-input
                    v-model="registerForm.username"
                    placeholder="用户名（3-20位）"
                    :prefix-icon="User"
                    clearable
                    @focus="isTyping = true"
                    @blur="isTyping = false"
                  />
                </el-form-item>
                <el-form-item prop="nickname">
                  <el-input
                    v-model="registerForm.nickname"
                    placeholder="昵称"
                    :prefix-icon="Avatar"
                    clearable
                  />
                </el-form-item>
                <el-form-item prop="password">
                  <div class="password-wrap">
                    <el-input
                      v-model="registerForm.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="密码（至少6位）"
                      :prefix-icon="Lock"
                    />
                    <button
                      type="button"
                      class="password-eye"
                      :class="{ 'password-eye--active': showPassword }"
                      @click="showPassword = !showPassword"
                    >
                      <el-icon :size="18"><View /></el-icon>
                    </button>
                  </div>
                </el-form-item>
                <el-form-item prop="confirmPassword">
                  <div class="password-wrap">
                    <el-input
                      v-model="registerForm.confirmPassword"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="确认密码"
                      :prefix-icon="Lock"
                    />
                    <button
                      type="button"
                      class="password-eye"
                      :class="{ 'password-eye--active': showPassword }"
                      @click="showPassword = !showPassword"
                    >
                      <el-icon :size="18"><View /></el-icon>
                    </button>
                  </div>
                </el-form-item>

                <el-button
                  type="primary"
                  class="submit-btn"
                  :loading="loading"
                  @click="handleRegister"
                >
                  注 册
                </el-button>
              </el-form>

              <p class="switch-tip">
                已有账号？<a @click="switchMode('login')">去登录</a>
              </p>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tn-bg-solid);
  isolation: isolate;
  overflow: hidden;
}
.auth-page::before {
  content: '';
  position: absolute;
  inset: -20% -10%;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(40% 40% at 18% 22%, var(--tn-aurora-1) 0%, transparent 60%),
    radial-gradient(36% 36% at 82% 18%, var(--tn-aurora-2) 0%, transparent 60%),
    radial-gradient(44% 44% at 70% 82%, var(--tn-aurora-3) 0%, transparent 62%),
    radial-gradient(34% 34% at 28% 84%, var(--tn-aurora-2) 0%, transparent 60%);
  opacity: var(--tn-aurora-alpha);
  filter: blur(60px) saturate(120%);
  animation: aurora-shift 22s ease-in-out infinite;
}

.brand-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* 分屏布局 */
.auth-split {
  position: relative;
  display: flex;
  width: 80vw;
  height: 80vh;
  border-radius: 24px;
  overflow: hidden;
  background: var(--tn-glass);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid var(--tn-glass-border);
  box-shadow: var(--tn-shadow-lift);
  animation: card-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(30px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ===== 左侧品牌面板 ===== */
.brand-panel {
  position: relative;
  width: 50%;
  background: linear-gradient(to bottom right, oklch(55.6% 0 0 / 0.9), oklch(55.6% 0 0), oklch(55.6% 0 0 / 0.8));
  background-size: 180% 180%;
  animation: brand-flow 12s ease infinite;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 32px 32px 32px;
  overflow: hidden;
  isolation: isolate;
}
@keyframes brand-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.brand-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.3), transparent 45%),
    radial-gradient(circle at 15% 90%, rgba(58, 214, 255, 0.4), transparent 45%);
}
.brand-logo {
  position: relative;
  z-index: 2;
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 2px;
}
.characters-area {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}
.brand-footer {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 24px;
}
.brand-footer a {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.2s;
}
.brand-footer a:hover {
  color: rgba(255, 255, 255, 0.85);
}

/* 装饰光斑 */
.brand-glow {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}
.brand-glow--top {
  top: -20%;
  right: -20%;
  width: 280px;
  height: 280px;
  background: rgba(255, 255, 255, 0.15);
}
.brand-glow--bottom {
  bottom: -10%;
  left: -15%;
  width: 340px;
  height: 340px;
  background: rgba(58, 214, 255, 0.2);
}

/* ===== 右侧表单面板 ===== */
.form-panel {
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 48px;
  background: var(--tn-bg);
  border-left: 1px solid var(--tn-glass-border);
}

.form-inner {
  width: 100%;
  max-width: 380px;
}
.form-header {
  text-align: center;
  margin-bottom: 32px;
}
.form-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--tn-text);
}
.form-subtitle {
  font-size: 14px;
  color: var(--tn-text-soft);
  margin: 0;
}
.form-body {
  width: 100%;
}

/* 密码框 */
.password-wrap {
  position: relative;
  width: 100%;
}
.password-eye {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--tn-text-faint);
  display: flex;
  align-items: center;
  transition: color 0.2s;
}
.password-eye:hover {
  color: var(--tn-text-soft);
}
.password-eye--active {
  color: var(--tn-primary);
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  letter-spacing: 4px;
  border-radius: 10px;
  margin-top: 4px;
  color: #fff;
  background: linear-gradient(135deg, #6C3FF5 0%, #8B5CF6 100%);
  border: none;
  transition: transform 0.25s, box-shadow 0.25s, background-position 0.5s;
  background-size: 200% 100%;
}
.submit-btn:hover {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: 0 12px 32px rgba(108, 63, 245, 0.35);
}

/* 切换提示 */
.switch-tip {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--tn-text-soft);
}
.switch-tip a {
  color: var(--tn-primary);
  font-weight: 600;
  cursor: pointer;
}
.switch-tip a:hover {
  text-decoration: underline;
}

/* 表单切换过渡 */
.form-fade-enter-active,
.form-fade-leave-active {
  transition: all 0.3s ease;
}
.form-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.form-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* ===== 响应式 ===== */
@media (max-width: 860px) {
  .auth-split {
    flex-direction: column;
    max-width: 94vw;
    min-height: auto;
    border-radius: 20px;
  }
  .brand-panel {
    width: 100%;
    padding: 28px 24px;
    min-height: 300px;
  }
  .characters-area {
    transform: scale(0.65);
  }
  .form-panel {
    width: 100%;
    padding: 36px 28px;
    border-left: none;
    border-top: 1px solid var(--tn-glass-border);
  }
}
</style>
