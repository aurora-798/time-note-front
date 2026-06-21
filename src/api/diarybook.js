import request from '@/utils/request'

// 创建日记本
export function createDiaryBook(data) {
  return request.post('/api/diarybook/create', data)
}

// 删除日记本
export function deleteDiaryBook(data) {
  return request.post('/api/diarybook/delete', data)
}

// 编辑日记本
export function editDiaryBook(data) {
  return request.post('/api/diarybook/edit', data)
}

// 获取用户日记本列表
export function listDiaryBooks() {
  return request.post('/api/diarybook/list')
}

// 根据 bookId 获取单个日记本
export function getDiaryBook(bookId) {
  return request.post(`/api/diarybook/${bookId}`)
}

// 验证日记本密码（失败由调用方提示，避免与全局拦截器重复弹窗）
export function verifyDiaryBookPassword(data) {
  return request.post('/api/diarybook/verify', data, { skipErrorHandler: true })
}
