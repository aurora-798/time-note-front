import axios from 'axios'
import JSONbig from 'json-bigint'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useUserStore } from '@/store/user'
import { API_BASE } from '@/utils/url'
import {
  beginAuthRedirect,
  isAuthBusinessError,
  isAuthExemptUrl,
  isAuthRedirecting,
  isTokenExpired,
} from '@/utils/auth'

// 后端雪花 ID 超出 JS Number 安全整数范围，解析为字符串保留精度
const parseJson = JSONbig({ storeAsString: true })

// 后端地址：直接请求全地址（需后端开启 CORS）
const service = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  transformResponse: [
    (data) => {
      if (typeof data !== 'string' || !data) return data
      try {
        return parseJson.parse(data)
      } catch {
        return data
      }
    },
  ],
})

function redirectToLogin() {
  if (router.currentRoute.value.path === '/login') return
  const redirect = router.currentRoute.value.fullPath
  router.replace({
    path: '/login',
    query: redirect && redirect !== '/login' ? { redirect } : undefined,
  })
}

function handleUnauthorized({ message, hadToken = false } = {}) {
  if (!beginAuthRedirect()) return

  const userStore = useUserStore()
  userStore.logout()
  redirectToLogin()

  if (message) {
    ElMessage.error(message)
  } else if (hadToken) {
    ElMessage.error('登录已过期，请重新登录')
  } else {
    ElMessage.error('请先登录')
  }
}

function rejectUnauthorized(config, message, hadToken) {
  handleUnauthorized({ message, hadToken })
  return Promise.reject(new Error(message || 'Unauthorized'))
}

// 请求拦截：过期 token 不再发出业务请求
service.interceptors.request.use(
  (config) => {
    if (isAuthRedirecting()) {
      return Promise.reject(new Error('登录已过期'))
    }

    const url = config.url || ''
    const token = localStorage.getItem('token')

    if (token) {
      if (isTokenExpired(token)) {
        return rejectUnauthorized(config, '登录已过期，请重新登录', true)
      }
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
    const url = response.config?.url || ''

    // 非标准包装（如文件流）直接返回
    if (typeof res !== 'object' || res === null || !('code' in res)) {
      return res
    }
    if (res.code === 200) {
      return res.data
    }

    // 登录/注册接口的 401 是账号密码错误，不应触发登出
    if (!isAuthExemptUrl(url) && isAuthBusinessError(res)) {
      return rejectUnauthorized(
        response.config,
        res.msg || '登录已过期，请重新登录',
        !!localStorage.getItem('token'),
      )
    }

    if (!response.config?.skipErrorHandler) {
      ElMessage.error(res.msg || '请求失败')
    }
    return Promise.reject(new Error(res.msg || 'Error'))
  },
  (error) => {
    if (isAuthRedirecting()) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const url = error.config?.url || ''
    const hadToken = !!localStorage.getItem('token')

    // Spring Security：无效/过期 token 常返回 403，过期有时返回 401
    if (!isAuthExemptUrl(url) && (status === 401 || status === 403)) {
      return rejectUnauthorized(
        error.config,
        hadToken ? '登录已过期，请重新登录' : '请先登录',
        hadToken,
      )
    }

    if (!error.config?.skipErrorHandler) {
      ElMessage.error(error.response?.data?.msg || error.message || '网络异常')
    }
    return Promise.reject(error)
  },
)

export default service
