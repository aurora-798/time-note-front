import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/AuthView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/diary',
    children: [
      {
        path: 'diary',
        name: 'diary-list',
        component: () => import('@/views/diary/DiaryList.vue'),
        meta: { title: '我的日记', icon: 'Notebook' },
      },
      {
        path: 'diary/new',
        name: 'diary-new',
        component: () => import('@/views/diary/DiaryEdit.vue'),
        meta: { title: '写日记', icon: 'EditPen' },
      },
      {
        path: 'diary/:id',
        name: 'diary-detail',
        component: () => import('@/views/diary/DiaryDetail.vue'),
        meta: { title: '日记详情', hidden: true },
      },
      {
        path: 'diary/:id/edit',
        name: 'diary-edit',
        component: () => import('@/views/diary/DiaryEdit.vue'),
        meta: { title: '编辑日记', hidden: true },
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
