import http from './index'
import type {
  ApiResponse,
  PaginatedData,
  PaginationParams,
  AdminUser,
} from '@/types/api.types'

// ==================== 用户管理（/ai/admin/users） ====================

/** 获取用户列表（分页） */
export function getAdminUsers(params?: PaginationParams) {
  return http.get<ApiResponse<AdminUser[]>>('/admin/users', { params })
}

/** 获取指定用户详情 */
export function getAdminUserDetail(userId: string) {
  return http.get<ApiResponse<AdminUser>>(`/admin/users/${encodeURIComponent(userId)}`)
}

/** 修改用户角色或状态 */
export function updateAdminUser(userId: string, data: { role?: 'USER' | 'ADMIN'; status?: 'active' | 'disabled' }) {
  return http.put<ApiResponse<null>>(`/admin/users/${encodeURIComponent(userId)}/role`, data)
}

/** 禁用指定用户（软删除） */
export function disableAdminUser(userId: string) {
  return http.delete<ApiResponse<null>>(`/admin/users/${encodeURIComponent(userId)}`)
}

// ==================== 以下端点暂未在后端实现，保留占位 ====================

/** @deprecated 后端尚未实现数字人配置接口 */
export function getDigitalHumanConfig() {
  return http.get<ApiResponse<Record<string, never>>>('/admin/digital-human')
}

/** @deprecated 后端尚未实现数字人配置接口 */
export function updateDigitalHumanConfig(_data: Record<string, unknown>) {
  return http.put<ApiResponse<Record<string, never>>>('/admin/digital-human', _data)
}

/** @deprecated 后端尚未实现音色列表接口 */
export function getVoices() {
  return http.get<ApiResponse<unknown[]>>('/admin/digital-human/voices')
}

/** @deprecated 后端尚未实现操作日志接口 */
export function getOperationLogs(_params?: PaginationParams & {
  start_date?: string
  end_date?: string
  action_type?: string
}) {
  return http.get<ApiResponse<PaginatedData<unknown>>>('/admin/logs', { params: _params })
}

/** @deprecated 后端尚未实现系统设置接口 */
export function getSystemSettings() {
  return http.get<ApiResponse<Record<string, never>>>('/admin/settings')
}

/** @deprecated 后端尚未实现系统设置接口 */
export function updateSystemSettings(_data: Record<string, unknown>) {
  return http.put<ApiResponse<Record<string, never>>>('/admin/settings', _data)
}
