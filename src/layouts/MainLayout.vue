<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Notebook,
  EditPen,
  User,
  SwitchButton,
  Fold,
  Expand,
  Sunny,
  Moon,
  ArrowDown,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const themeStore = useThemeStore()

const collapsed = ref(true)

const menus = [
  { path: '/diary', title: '我的日记', icon: Notebook },
  { path: '/diary/new', title: '写日记', icon: EditPen },
]

const activePath = computed(() => {
  if (route.path.startsWith('/diary') && route.path !== '/diary/new') {
    return '/diary'
  }
  return route.path
})

const avatarText = computed(() => userStore.displayName.charAt(0).toUpperCase())

function go(path) {
  if (route.path !== path) router.push(path)
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
    userStore.logout()
    ElMessage.success('已退出登录')
    router.replace('/login')
  } catch {
    // 取消
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {})
  }
})
</script>

<template>
  <div class="layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar" :class="{ collapsed }">
      <!-- 顶部：App 标识 + 下拉菜单 -->
      <div class="sidebar-header">
        <el-dropdown trigger="click" :teleported="false" placement="bottom-start">
          <div class="app-trigger">
            <span class="app-icon">时</span>
            <span v-show="!collapsed" class="app-name">时光笔录</span>
          </div>
        </el-dropdown>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span v-show="!collapsed" class="nav-label">{{ item.title }}</span>
        </router-link>

        <div class="nav-separator" />

        <router-link
          to="/profile"
          class="nav-item"
          :class="{ active: activePath === '/profile' }"
        >
          <el-icon class="nav-icon"><User /></el-icon>
          <span v-show="!collapsed" class="nav-label">个人中心</span>
        </router-link>
      </nav>

      <!-- 底部：用户下拉 + 主题切换 + 折叠按钮 -->
      <div class="sidebar-footer">
        <el-dropdown trigger="click" :teleported="false" placement="right-start">
          <div class="user-trigger">
            <el-avatar
              :size="28"
              :src="userStore.profile?.avatar"
              class="user-avatar"
            >
              {{ avatarText }}
            </el-avatar>
            <span v-show="!collapsed" class="user-name">{{ userStore.displayName }}</span>
            <el-icon v-show="!collapsed" class="user-chevron">
              <ArrowDown />
            </el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <div class="user-dropdown-header">
                <el-avatar :size="32" :src="userStore.profile?.avatar">
                  {{ avatarText }}
                </el-avatar>
                <div class="user-dropdown-meta">
                  <span class="user-dropdown-name">{{ userStore.displayName }}</span>
                  <span class="user-dropdown-role">
                    {{ userStore.profile?.isVip ? 'VIP 会员' : '普通用户' }}
                  </span>
                </div>
              </div>
              <el-dropdown-item divided @click="go('/profile')">
                <el-icon><User /></el-icon> 个人中心
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <div class="bottom-actions">
          <div
            class="action-btn"
            @click="themeStore.toggle()"
            :title="themeStore.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <el-icon><component :is="themeStore.theme === 'dark' ? Sunny : Moon" /></el-icon>
            <span v-show="!collapsed" class="action-text">
              {{ themeStore.theme === 'dark' ? '亮色模式' : '暗色模式' }}
            </span>
          </div>
          <div
            class="action-btn"
            @click="collapsed = !collapsed"
            :title="collapsed ? '展开菜单' : '收起菜单'"
          >
            <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
            <span v-show="!collapsed" class="action-text">收起菜单</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ============================================================
   侧边栏
   ============================================================ */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  background: var(--tn-card);
  border-right: 1px solid var(--tn-border);
  transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 10;
  position: relative;
}

/* 暗色模式：更通透的渐变背景 + 顶部极光光晕 */
html[data-theme='dark'] .sidebar {
  background: linear-gradient(
    175deg,
    rgba(42, 39, 75, 0.96) 0%,
    rgba(33, 30, 63, 0.96) 50%,
    rgba(26, 24, 55, 0.96) 100%
  );
}

html[data-theme='dark'] .sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  pointer-events: none;
  background: radial-gradient(
    80% 50% at 50% 0%,
    rgba(109, 93, 252, 0.12),
    transparent 100%
  );
}

.sidebar.collapsed {
  width: 64px;
}

/* ============================================================
   顶部 App 区域
   ============================================================ */
.sidebar-header {
  display: flex;
  margin-bottom: 28px;
}

.collapsed .sidebar-header {
  justify-content: center;
}

.app-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.collapsed .app-trigger {
  padding: 4px;
}

.app-trigger:hover {
  background: var(--tn-border);
}

html[data-theme='dark'] .app-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
}

.app-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--tn-gradient-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.app-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--tn-text);
  overflow: hidden;
  white-space: nowrap;
}


/* ============================================================
   导航菜单
   ============================================================ */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--tn-text-soft);
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.collapsed .nav-item {
  justify-content: center;
  width: 40px;
  padding: 9px;
  margin: 0 auto;
}

.nav-item:hover {
  background: var(--tn-border);
  color: var(--tn-text);
}

html[data-theme='dark'] .nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  background: linear-gradient(
    100deg,
    rgba(109, 93, 252, 0.12),
    rgba(109, 93, 252, 0.06)
  );
  color: var(--tn-primary);
  font-weight: 600;
}

html[data-theme='dark'] .nav-item.active {
  background: linear-gradient(
    100deg,
    rgba(138, 124, 255, 0.18),
    rgba(138, 124, 255, 0.08)
  );
}

.nav-icon {
  font-size: 19px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
}

.nav-label {
  font-size: 14px;
  overflow: hidden;
  white-space: nowrap;
}

/* ============================================================
   导航分隔线
   ============================================================ */
.nav-separator {
  width: 100%;
  height: 1px;
  background: var(--tn-border);
  margin: 6px 0;
  transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.collapsed .nav-separator {
  width: 32px;
  align-self: center;
}

/* ============================================================
   底部区域
   ============================================================ */
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--tn-border);
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.collapsed .user-trigger {
  justify-content: center;
  width: auto;
  padding: 4px;
}

.user-trigger:hover {
  background: var(--tn-border);
      html[data-theme='dark'] .user-trigger:hover {
        background: rgba(255, 255, 255, 0.08);
      }
}

.user-avatar {
  flex-shrink: 0;
  font-size: 12px;
}

.user-name {
  font-size: 14px;
  color: var(--tn-text);
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
}

.user-chevron {
  font-size: 12px;
  color: var(--tn-text-faint);
  flex-shrink: 0;
  margin-left: auto;
}

/* ============================================================
   用户下拉菜单头部
   ============================================================ */
.user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  min-width: 180px;
}

.user-dropdown-meta {
  display: flex;
  flex-direction: column;
}

.user-dropdown-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--tn-text);
}

.user-dropdown-role {
  font-size: 12px;
  color: var(--tn-text-faint);
}

/* ============================================================
   底部操作按钮
   ============================================================ */
.bottom-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--tn-text-soft);
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  font-size: 14px;
}

.collapsed .action-btn {
  justify-content: center;
  width: 40px;
  padding: 8px;
  margin: 0 auto;
}

.action-btn:hover {
  background: var(--tn-border);
  color: var(--tn-text);
      html[data-theme='dark'] .action-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }
}

.action-btn .el-icon {
  font-size: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
}

.action-text {
  overflow: hidden;
  white-space: nowrap;
}

/* ============================================================
   内容区
   ============================================================ */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  background: var(--tn-bg-solid);
}

@media (max-width: 768px) {
  .content {
    padding: 20px;
  }
}
</style>
