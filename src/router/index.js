import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { isTokenExpired } from '@/utils/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/AuthView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/DiaryLayout.vue'),
    redirect: '/diary',
    children: [
      {
        path: 'diary',
        name: 'bookshelf',
        component: () => import('@/views/diary/Bookshelf.vue'),
        meta: { title: '我的日记', icon: 'Notebook' },
      },
      {
        path: 'diary/book/:bookId',
        name: 'book-view',
        component: () => import('@/views/diary/BookView.vue'),
        meta: { title: '日记本', hidden: true },
      },
      {
        path: 'diary/book/:bookId/write',
        name: 'entry-new',
        component: () => import('@/views/diary/EntryEditor.vue'),
        meta: { title: '写日记', hidden: true },
      },
      {
        path: 'diary/book/:bookId/entry/:entryId/edit',
        name: 'entry-edit',
        component: () => import('@/views/diary/EntryEditor.vue'),
        meta: { title: '编辑日记', hidden: true },
      },
      {
        path: 'assistant',
        name: 'assistant',
        component: () => import('@/views/assistant/AssistantView.vue'),
        meta: { title: 'AI 助手' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: { title: '个人中心', icon: 'User' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/diary',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')

  if (token && isTokenExpired(token)) {
    const userStore = useUserStore()
    userStore.logout()
    ElMessage.error('登录已过期，请重新登录')
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (!to.meta.public && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && token) {
    return { path: '/' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 时光笔录` : '时光笔录'
})

export default router
