<script setup>
import { computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { SwitchButton, User } from '@element-plus/icons-vue'
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
const isBookshelfPage = computed(() => route.name === 'bookshelf')

function syncBookshelfScrollClass(name) {
  const on = name === 'bookshelf'
  document.documentElement.classList.toggle('page-bookshelf', on)
  document.body.classList.toggle('page-bookshelf', on)
  document.getElementById('app')?.classList.toggle('page-bookshelf', on)
}

watch(() => route.name, syncBookshelfScrollClass, { immediate: true })
onUnmounted(() => syncBookshelfScrollClass(''))

const links = [{ path: '/diary', label: '我的日记架', cls: 'pill-diary' }]

function isActive(path) {
  return route.path.startsWith(path)
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
})
</script>

<template>
  <div class="diary-shell" :class="{ 'page-bookshelf': isBookshelfPage }">
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
                <el-avatar :size="36" :src="userStore.profile?.avatar">
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

    <main
      class="lala-main"
      :class="{ 'no-dock': !showSeasonDock, 'is-shelf-scroll': isBookshelfPage }"
    >
      <div class="main-body" :class="{ 'is-shelf-scroll': isBookshelfPage }">
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
  --nav-h: 60px;
  /* 四季按钮占位：底部预留高度，避免内容与按钮上下重叠 */
  --dock-zone-h: 108px;
  /* 书架行高计算专用，不随路由切换 no-dock 变化，避免进入日记本时卡片高度跳动 */
  --shelf-layout-dock-h: 108px;
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
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
.logo-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--gradient-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  box-shadow: -6px 8px 10px rgba(138, 98, 132, 0.2),
    inset 1px 1px 0 rgba(255, 255, 255, 0.9);
}
.logo-text {
  font-size: 19px;
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
  padding: 7px 16px;
  border-radius: 18px;
  font-weight: 600;
  font-size: 14px;
  color: var(--primary-color);
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: transform 0.16s, box-shadow 0.2s, background 0.2s, border-color 0.2s;
  box-shadow: none;
  transform: none;
}
.pill-diary {
  background: rgba(255, 154, 183, 0.16);
  border: 1px solid rgba(255, 154, 183, 0.28);
  color: var(--primary-color);
}
.nav-link:hover {
  transform: translateY(-1px);
  filter: none;
  box-shadow: 0 4px 12px rgba(255, 154, 183, 0.14);
}
.pill-diary:hover {
  background: rgba(255, 154, 183, 0.24);
  border-color: rgba(255, 154, 183, 0.4);
}
.nav-link:active {
  transform: translateY(0) scale(0.99);
  box-shadow: none;
}
.nav-link.is-active {
  filter: none;
  box-shadow: 0 2px 10px rgba(255, 154, 183, 0.16);
}
.pill-diary.is-active {
  background: rgba(255, 154, 183, 0.28);
  border-color: rgba(230, 126, 154, 0.45);
  font-weight: 700;
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

.diary-shell.page-bookshelf {
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: visible;
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
.lala-main.is-shelf-scroll {
  flex: none;
  overflow: visible;
  padding-bottom: calc(var(--dock-zone-h) + 50px);
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
.main-body.is-shelf-scroll {
  flex: none;
  min-height: auto;
}
.main-body > * {
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.main-body.is-shelf-scroll > * {
  flex: none;
  min-height: auto;
}

@media (max-width: 768px) {
  .lala-main.is-shelf-scroll {
    padding-bottom: calc(56px + 32px);
  }
}

@media (max-width: 768px) {
  .diary-shell {
    --nav-h: 52px;
  }
  .navbar-inner {
    height: 52px;
    padding: 0 16px;
    gap: 12px;
  }
  .logo-text {
    display: none;
  }
  .nav-link {
    padding: 6px 14px;
    font-size: 13px;
  }
  .lala-main {
    padding: 16px 16px 56px;
  }
}
</style>
