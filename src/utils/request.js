import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useUserStore } from '@/store/user'
import { API_BASE } from '@/utils/url'

// 后端地址：直接请求全地址（需后端开启 CORS）
const service = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

// 请求拦截：携带 token
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截：统一处理 { code, msg, data }
service.interceptors.response.use(
  (response) => {
    const res = response.data
    // 非标准包装（如文件流）直接返回
    if (typeof res !== 'object' || res === null || !('code' in res)) {
      return res
    }
    if (res.code === 200) {
      return res.data
    }
    // 业务错误
    ElMessage.error(res.msg || '请求失败')
    if (res.code === 401) {
      handleUnauthorized()
    }
    return Promise.reject(new Error(res.msg || 'Error'))
  },
  (error) => {
    const status = error.response?.status
    // Spring Security 在无状态模式下，未携带/无效 token 访问受保护接口默认返回 403，
    // token 过期返回 401。两者都视为未认证，跳转登录。
    if (status === 401 || status === 403) {
      const hasToken = !!localStorage.getItem('token')
      ElMessage.error(hasToken ? '登录已过期，请重新登录' : '请先登录')
      handleUnauthorized()
    } else {
      ElMessage.error(error.response?.data?.msg || error.message || '网络异常')
    }
    return Promise.reject(error)
  },
)

function handleUnauthorized() {
  const userStore = useUserStore()
  userStore.logout()
  router.replace('/login')
}

export default service
