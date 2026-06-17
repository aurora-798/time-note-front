import request from '@/utils/request'

// 分页查询多媒体
export function pageMedia(params) {
  return request.get('/api/media/page', { params })
}

// 新增多媒体元数据（保存已上传文件的信息）
export function addMedia(data) {
  return request.post('/api/media', data)
}

// 删除多媒体（元数据）
export function deleteMedia(id) {
  return request.delete(`/api/media/${id}`)
}

// mediaType：1-图片(image)，2-视频(video)，3-头像(avatar)，4-用户封面(user-cover)
export const MEDIA_TYPE = {
  IMAGE: 1,
  VIDEO: 2,
  AVATAR: 3,
  USER_COVER: 4,
}

// 上传文件（multipart）。
// 后端：POST /api/file/upload，只负责上传到对象存储并返回 FileUploadVo，不创建 Media 记录。
export function uploadFile(file, { mediaType, remark } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/api/file/upload', formData, {
    params: { mediaType, remark },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// 删除已上传文件（仅删对象存储）
export function deleteFile(fileUrl) {
  return request.delete('/api/file/delete', { params: { fileUrl } })
}
