import request from '@/utils/request'

// 根据 ID 查询用户
export function getUserById(id) {
  return request.get(`/api/user/${id}`)
}

// 更新用户（个人中心保存）
export function updateUser(data) {
  return request.put('/api/user', data)
}

// 分页查询用户（管理端）
export function pageUsers(params) {
  return request.get('/api/user/page', { params })
}

// 新增用户（管理端）
export function addUser(data) {
  return request.post('/api/user', data)
}

// 删除用户（管理端）
export function deleteUser(id) {
  return request.delete(`/api/user/${id}`)
}

// TODO: 后端暂无「获取当前登录用户」接口。
// 目前用登录返回的 userId 调用 getUserById 代替。
// 后端补充 GET /api/user/me 后改用下面的实现：
// export function getCurrentUser() {
//   return request.get('/api/user/me')
// }
