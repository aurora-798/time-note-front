<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Avatar, Sunny, Moon } from '@element-plus/icons-vue'
import { register as registerApi } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const themeStore = useThemeStore()

const mode = ref('login') // 'login' | 'register'
const loading = ref(false)
const loginFormRef = ref()
const registerFormRef = ref()

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
  mode.value === 'login' ? '继续记录属于你的时光' : '让 AI 帮你留住每一天',
)

function switchMode(target) {
  mode.value = target
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
    <!-- 主题切换 -->
    <div class="theme-toggle" @click="themeStore.toggle()">
      <el-icon><component :is="themeStore.theme === 'dark' ? 'Sunny' : 'Moon'" /></el-icon>
    </div>

    <!-- 背景由全局点阵波浪（App.vue）提供 -->

    <div class="auth-card">
      <!-- 左侧品牌区 -->
      <div class="brand-side">
        <div class="brand-content">
          <div class="brand-logo">时光笔录</div>
          <h2 class="brand-tagline">不必动笔，<br />也能留住每一天</h2>
          <p class="brand-desc">
            用语音或文字告诉 AI 今天发生的事，<br />它会自动为你生成一篇日记。
          </p>
          <ul class="brand-points">
            <li><span class="dot"></span>AI 自动总结，生成专属日记</li>
            <li><span class="dot"></span>多种风格随心切换</li>
            <li><span class="dot"></span>图文影像，记录有温度的时光</li>
          </ul>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-side">
        <transition name="form-fade" mode="out-in">
          <div :key="mode" class="form-wrap">
            <h1 class="form-title">{{ title }}</h1>
            <p class="form-subtitle">{{ subtitle }}</p>

            <!-- 登录 -->
            <el-form
              v-if="mode === 'login'"
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
                />
              </el-form-item>
              <el-form-item prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="密码"
                  :prefix-icon="Lock"
                  show-password
                />
              </el-form-item>
              <el-button
                type="primary"
                class="submit-btn"
                :loading="loading"
                @click="handleLogin"
              >
                登 录
              </el-button>
              <p class="switch-tip">
                还没有账号？<a @click="switchMode('register')">立即注册</a>
              </p>
            </el-form>

            <!-- 注册 -->
            <el-form
              v-else
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
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="密码（至少6位）"
                  :prefix-icon="Lock"
                  show-password
                />
              </el-form-item>
              <el-form-item prop="confirmPassword">
                <el-input
                  v-model="registerForm.confirmPassword"
                  type="password"
                  placeholder="确认密码"
                  :prefix-icon="Lock"
                  show-password
                />
              </el-form-item>
              <el-button
                type="primary"
                class="submit-btn"
                :loading="loading"
                @click="handleRegister"
              >
                注 册
              </el-button>
              <p class="switch-tip">
                已有账号？<a @click="switchMode('login')">去登录</a>
              </p>
            </el-form>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: transparent;
}

/* 主题切换按钮 */
.theme-toggle {
  position: absolute;
  top: 24px;
  right: 28px;
  z-index: 3;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  cursor: pointer;
  font-size: 20px;
  color: var(--tn-text);
  background: var(--tn-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--tn-glass-border);
  box-shadow: var(--tn-shadow);
  transition: transform 0.25s, box-shadow 0.25s;
}
.theme-toggle:hover {
  transform: translateY(-2px) rotate(12deg);
  box-shadow: var(--tn-glow);
}

.auth-card {
  position: relative;
  z-index: 1;
  width: 880px;
  max-width: 94vw;
  min-height: 540px;
  display: flex;
  background: var(--tn-glass);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid var(--tn-glass-border);
  border-radius: 24px;
  box-shadow: var(--tn-shadow-lift);
  overflow: hidden;
  animation: card-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 左侧品牌区 */
.brand-side {
  width: 44%;
  padding: 48px 40px;
  color: #fff;
  background: var(--tn-gradient-primary);
  background-size: 180% 180%;
  animation: brand-flow 12s ease infinite;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}
@keyframes brand-flow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
.brand-side::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
      circle at 80% 20%,
      rgba(255, 255, 255, 0.3),
      transparent 45%
    ),
    radial-gradient(circle at 15% 90%, rgba(58, 214, 255, 0.4), transparent 45%);
}
.brand-content {
  position: relative;
  z-index: 1;
}
.brand-logo {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 40px;
}
.brand-tagline {
  font-size: 30px;
  line-height: 1.4;
  font-weight: 700;
  margin: 0 0 18px;
}
.brand-desc {
  font-size: 14px;
  line-height: 1.7;
  opacity: 0.9;
  margin-bottom: 28px;
}
.brand-points {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 14px;
  line-height: 2.2;
}
.brand-points .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  margin-right: 10px;
  vertical-align: middle;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
}

/* 右侧表单区 */
.form-side {
  flex: 1;
  padding: 56px 48px;
  display: flex;
  align-items: center;
}
.form-wrap {
  width: 100%;
}
.form-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--tn-text);
}
.form-subtitle {
  font-size: 14px;
  color: var(--tn-text-soft);
  margin-bottom: 28px;
}
.submit-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  letter-spacing: 4px;
  border-radius: 12px;
  margin-top: 6px;
  color: #fff;
  background: var(--tn-gradient-primary);
  background-size: 200% 100%;
  border: none;
  transition: transform 0.25s, box-shadow 0.25s, background-position 0.5s;
}
.submit-btn:hover {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: var(--tn-glow-strong);
}
.switch-tip {
  text-align: center;
  margin-top: 20px;
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
  transition: all 0.35s ease;
}
.form-fade-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.form-fade-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

@media (max-width: 768px) {
  .brand-side {
    display: none;
  }
  .form-side {
    padding: 40px 28px;
  }
}
</style>
