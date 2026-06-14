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
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const themeStore = useThemeStore()

const collapsed = ref(false)

// 侧边栏功能菜单
const menus = [
  { path: '/diary', title: '我的日记', icon: Notebook },
  { path: '/diary/new', title: '写日记', icon: EditPen },
  { path: '/profile', title: '个人中心', icon: User },
]

const activePath = computed(() => {
  // 详情/编辑页高亮「我的日记」
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
  // 拉取完整资料用于头像、个人中心展示；失败不阻塞页面
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {})
  }
})
</script>

<template>
  <div class="layout aurora-bg">
    <!-- 左侧导航栏 -->
    <aside class="sidebar" :class="{ collapsed }">
      <!-- 顶部头像 + 悬停菜单 -->
      <div class="user-area">
        <el-dropdown trigger="hover" placement="right-start" :hide-on-click="true">
          <div class="avatar-trigger">
            <el-avatar
              :size="collapsed ? 38 : 56"
              :src="userStore.profile?.avatar"
              class="avatar"
            >
              {{ avatarText }}
            </el-avatar>
            <transition name="fade-slide">
              <div v-if="!collapsed" class="user-meta">
                <div class="user-name">{{ userStore.displayName }}</div>
                <div class="user-role">
                  {{ userStore.profile?.isVip ? 'VIP 会员' : '普通用户' }}
                </div>
              </div>
            </transition>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="go('/profile')">
                <el-icon><User /></el-icon> 个人中心
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 功能菜单 -->
      <nav class="menu">
        <div
          v-for="item in menus"
          :key="item.path"
          class="menu-item"
          :class="{ active: activePath === item.path }"
          @click="go(item.path)"
        >
          <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
          <transition name="fade-slide">
            <span v-if="!collapsed" class="menu-text">{{ item.title }}</span>
          </transition>
          <span v-if="activePath === item.path" class="active-bar"></span>
        </div>
      </nav>

      <!-- 底部：主题切换 + 折叠 -->
      <div class="bottom-actions">
        <div class="action-btn" @click="themeStore.toggle()">
          <el-icon><component :is="themeStore.theme === 'dark' ? 'Sunny' : 'Moon'" /></el-icon>
          <transition name="fade-slide">
            <span v-if="!collapsed" class="action-text">
              {{ themeStore.theme === 'dark' ? '亮色模式' : '暗色模式' }}
            </span>
          </transition>
        </div>
        <div class="action-btn" @click="collapsed = !collapsed">
          <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
          <transition name="fade-slide">
            <span v-if="!collapsed" class="action-text">收起菜单</span>
          </transition>
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

/* 侧边栏：深色玻璃 + 极光描边 */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  color: #fff;
  position: relative;
  background: linear-gradient(
    170deg,
    rgba(124, 92, 255, 0.92) 0%,
    rgba(90, 75, 214, 0.92) 55%,
    rgba(58, 110, 214, 0.9) 100%
  );
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 8px 0 40px rgba(60, 50, 130, 0.25);
  transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 2;
}
/* 顶部极光流光描边 */
.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    120% 60% at 50% -10%,
    rgba(58, 214, 255, 0.35),
    transparent 60%
  );
}
html[data-theme='dark'] .sidebar {
  background: linear-gradient(
    170deg,
    rgba(40, 32, 78, 0.85) 0%,
    rgba(26, 23, 51, 0.9) 100%
  );
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.sidebar.collapsed {
  width: 84px;
}
.sidebar > * {
  position: relative;
  z-index: 1;
}

.user-area {
  margin-bottom: 32px;
}
.avatar-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.25s;
}
.avatar-trigger:hover {
  background: rgba(255, 255, 255, 0.14);
}
.avatar {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.15));
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25), 0 8px 20px rgba(58, 214, 255, 0.3);
}
.user-meta {
  overflow: hidden;
  white-space: nowrap;
}
.user-name {
  font-size: 15px;
  font-weight: 600;
}
.user-role {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
}

/* 菜单 */
.menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.82);
  overflow: hidden;
  transition: background 0.25s, color 0.25s, transform 0.2s, box-shadow 0.25s;
}
/* hover 光晕滑入 */
.menu-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent,
    rgba(255, 255, 255, 0.18),
    transparent
  );
  transform: translateX(-120%);
  transition: transform 0.5s ease;
}
.menu-item:hover::before {
  transform: translateX(120%);
}
.menu-item:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(3px);
}
.menu-item.active {
  background: linear-gradient(
    100deg,
    rgba(255, 255, 255, 0.28),
    rgba(255, 255, 255, 0.12)
  );
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(58, 214, 255, 0.25);
}
.menu-icon {
  font-size: 19px;
  flex-shrink: 0;
}
.menu-text {
  font-size: 15px;
  white-space: nowrap;
}
.active-bar {
  position: absolute;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tn-aurora-2);
  box-shadow: 0 0 10px var(--tn-aurora-2);
}

/* 底部操作区 */
.bottom-actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: background 0.25s, transform 0.2s;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateX(3px);
}
.action-btn .el-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.action-text {
  font-size: 14px;
  white-space: nowrap;
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}

@media (max-width: 768px) {
  .content {
    padding: 20px;
  }
}
</style>
