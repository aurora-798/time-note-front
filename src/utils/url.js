// 后端地址：前端直接请求全地址（需后端开启 CORS）
export const API_BASE = 'http://localhost:8081'

// 把后端返回的 fileUrl 解析为可访问地址。
// 后端可能返回绝对地址（http/https）、协议无关地址（//）或相对路径（/files/xxx）。
export function resolveMediaUrl(url) {
  if (!url) return ''
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}
