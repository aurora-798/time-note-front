/** 解析 JWT payload（仅用于读取 exp 等声明，不做签名校验） */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

/** token 是否已过期（预留 skewSeconds 秒缓冲，避免临界点请求失败） */
export function isTokenExpired(token, skewSeconds = 30) {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now + skewSeconds
}

/** 登录/注册等接口的业务 401 不代表会话失效 */
export function isAuthExemptUrl(url) {
  return /\/api\/auth\//.test(url || '')
}

/** 业务包装体中的未认证错误（HTTP 200 但 code/msg 表示未登录） */
export function isAuthBusinessError(res) {
  if (!res || typeof res !== 'object') return false
  if (res.code === 401 || res.code === 403) return true
  const msg = String(res.msg || '')
  return /未登录|登录过期|登录已过期|token|未授权|请先登录|认证失败|身份验证/i.test(msg)
}

let redirectingToLogin = false

export function isAuthRedirecting() {
  return redirectingToLogin
}

export function beginAuthRedirect() {
  if (redirectingToLogin) return false
  redirectingToLogin = true
  return true
}

export function resetAuthRedirect() {
  redirectingToLogin = false
}
