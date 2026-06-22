import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi } from '@/api/auth'
import { getUserById, updateUser } from '@/api/user'
import { clearBooksCache } from '@/services/notebooks'
import { clearBookAccess } from '@/services/notebookAccess'
import { resetAuthRedirect } from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userId = ref(localStorage.getItem('userId') || null)
  const profile = ref(JSON.parse(localStorage.getItem('profile') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const displayName = computed(
    () => profile.value?.nickname || profile.value?.username || '用户',
  )

  function persist() {
    localStorage.setItem('token', token.value)
    if (userId.value != null) localStorage.setItem('userId', String(userId.value))
    localStorage.setItem('profile', JSON.stringify(profile.value))
  }

  async function login(credentials) {
    const data = await loginApi(credentials)
    clearBooksCache()
    clearBookAccess()
    token.value = data.token
    userId.value = data.userId
    profile.value = {
      userId: data.userId,
      username: data.username,
      nickname: data.nickname,
      role: data.role,
      avatar: data.avatar || '',
    }
    persist()
    resetAuthRedirect()
    return data
  }

  // 拉取完整用户资料（个人中心展示用）
  async function fetchProfile() {
    if (userId.value == null) return null
    const data = await getUserById(userId.value)
    profile.value = { ...profile.value, ...data }
    persist()
    return data
  }

  async function saveProfile(payload) {
    const data = { ...profile.value, ...payload, id: userId.value }
    await updateUser(data)
    profile.value = { ...profile.value, ...payload }
    persist()
  }

  function logout() {
    clearBooksCache()
    clearBookAccess()
    token.value = ''
    userId.value = null
    profile.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('profile')
  }

  return {
    token,
    userId,
    profile,
    isLoggedIn,
    isAdmin,
    displayName,
    login,
    fetchProfile,
    saveProfile,
    logout,
  }
})
