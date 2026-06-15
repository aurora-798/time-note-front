<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { User, SwitchButton, Notebook } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { useSeasonStore } from '@/store/season'
import SeasonBackground from '@/components/diary/SeasonBackground.vue'
import SeasonDock from '@/components/diary/SeasonDock.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const seasonStore = useSeasonStore()

const avatarText = computed(() => userStore.displayName.charAt(0).toUpperCase())
const showSeasonDock = computed(() => route.name !== 'book-view')

const links = [
  { path: '/diary', label: '我的日记', cls: 'pill-diary' },
  { path: '/profile', label: '个人中心', cls: 'pill-garden' },
]

function isActive(path) {
  if (path === '/diary') return route.path.startsWith('/diary')
  return route.path === path
}

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
    /* 取消 */
  }
}

onMounted(() => {
  seasonStore.init()
  if (userStore.isLoggedIn) userStore.fetchProfile().catch(() => {})
})
</script>

<template>
  <div class="diary-shell">
    <SeasonBackground />
    <!-- 顶部导航 -->
    <nav class="lala-navbar">
      <div class="navbar-inner">
        <a class="logo" @click="go('/diary')">
          <span class="logo-icon">时</span>
          <span class="logo-text">时光笔录</span>
        </a>

        <ul class="nav-links">
          <li v-for="l in links" :key="l.path">
            <a
              class="nav-link"
              :class="[l.cls, { 'is-active': isActive(l.path) }]"
              @click="go(l.path)"
            >
              {{ l.label }}
            </a>
          </li>
        </ul>

        <div class="nav-right">
          <el-dropdown trigger="click" placement="bottom-end">
            <div class="user-info">
              <div class="user-avatar">
                <el-avatar :size="44" :src="userStore.profile?.avatar">
                  {{ avatarText }}
                </el-avatar>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="user-dd-head">
                  <el-avatar :size="36" :src="userStore.profile?.avatar">
                    {{ avatarText }}
                  </el-avatar>
                  <div class="user-dd-meta">
                    <span class="user-dd-name">{{ userStore.displayName }}</span>
                    <span class="user-dd-role">
                      {{ userStore.profile?.isVip ? 'VIP 会员' : '普通用户' }}
                    </span>
                  </div>
                </div>
                <el-dropdown-item divided @click="go('/diary')">
                  <el-icon><Notebook /></el-icon> 我的日记
                </el-dropdown-item>
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
      </div>
    </nav>

    <main class="lala-main" :class="{ 'no-dock': !showSeasonDock }">
      <div class="main-body">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <SeasonDock v-if="showSeasonDock" />
  </div>
</template>

<style scoped>
.diary-shell {
  --nav-h: 76px;
  /* 四季按钮占位：底部预留高度，避免内容与按钮上下重叠 */
  --dock-zone-h: 108px;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ============================================================
   顶部导航（laladiary 糖果胶囊风）
   ============================================================ */
.lala-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 24px rgba(230, 126, 154, 0.08);
}
.navbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 76px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--gradient-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  box-shadow: -10px 12px 14px rgba(138, 98, 132, 0.28),
    inset 1px 1px 0 rgba(255, 255, 255, 0.9);
}
.logo-text {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.82);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
  list-style: none;
  margin: 0 auto 0 12px;
  padding: 0;
}
.nav-link {
  display: inline-block;
  padding: 11px 24px;
  border-radius: 22px;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: transform 0.16s, box-shadow 0.2s, filter 0.2s;
  box-shadow: -12px 14px 14px rgba(138, 98, 132, 0.26),
    inset 1px 1px 0 rgba(255, 255, 255, 0.85);
  transform: translate(-1px, -1px);
}
.pill-diary {
  background: var(--gradient-primary);
}
.pill-garden {
  background: var(--gradient-secondary);
}
.nav-link:hover {
  transform: translate(-2px, -2px);
  filter: brightness(1.05);
  box-shadow: -16px 18px 18px rgba(138, 98, 132, 0.3),
    inset 1px 1px 0 rgba(255, 255, 255, 0.95);
}
.nav-link:active {
  transform: translate(1px, 1px) scale(0.99);
  box-shadow: -4px 6px 8px rgba(143, 107, 140, 0.24),
    inset 1px 1px 1px rgba(255, 255, 255, 0.9);
}
.nav-link.is-active {
  filter: brightness(1.04) saturate(1.05);
  box-shadow: -16px 18px 18px rgba(138, 98, 132, 0.32),
    0 0 0 2px rgba(255, 255, 255, 0.5) inset,
    inset 1px 1px 0 rgba(255, 255, 255, 0.95);
}

.nav-right {
  flex-shrink: 0;
}
.user-info {
  cursor: pointer;
}
.user-avatar {
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, #fff, #f9f0f4);
  border: 2px solid #ffd9e8;
  box-shadow: -14px 16px 16px rgba(141, 103, 139, 0.28),
    inset 1px 1px 0 rgba(255, 255, 255, 0.96);
  transition: transform 0.2s, box-shadow 0.2s;
}
.user-info:hover .user-avatar {
  transform: scale(1.05) translateY(-1px);
  border-color: #ff9ab7;
}

.user-dd-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  min-width: 190px;
}
.user-dd-meta {
  display: flex;
  flex-direction: column;
}
.user-dd-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.user-dd-role {
  font-size: 12px;
  color: var(--text-light);
}

.lala-main {
  flex: 1;
  min-height: 0;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 0 28px var(--dock-zone-h);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lala-main.no-dock {
  --dock-zone-h: 28px;
}
.main-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.main-body > * {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

@media (max-width: 768px) {
  .diary-shell {
    --nav-h: 64px;
  }
  .navbar-inner {
    height: 64px;
    padding: 0 16px;
    gap: 12px;
  }
  .logo-text {
    display: none;
  }
  .nav-link {
    padding: 9px 16px;
    font-size: 13px;
  }
  .lala-main {
    padding: 20px 16px 56px;
  }
}
</style>
