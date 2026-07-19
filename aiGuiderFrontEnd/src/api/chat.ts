import http from './index'
import type {
  ApiResponse,
  InterestTag,
  AISession,
  AIHistoryMessage,
} from '@/types/api.types'
import type { EmotionType } from '@/types/api.types'

// ==================== 会话历史（/ai/history） ====================

/** 获取当前用户的所有会话列表 */
export function getSessions() {
  return http.get<ApiResponse<AISession[]>>('/history')
}

/** 获取指定会话的消息历史 */
export function getSessionMessages(sessionId: string) {
  return http.get<ApiResponse<AIHistoryMessage[]>>(`/history/${encodeURIComponent(sessionId)}`)
}

/** 删除指定会话 */
export function deleteSession(sessionId: string) {
  return http.delete<ApiResponse<null>>(`/history/${encodeURIComponent(sessionId)}`)
}

// ==================== 用户偏好（/ai/preferences） ====================

/** 保存用户偏好 */
export function savePreferences(prefs: { interest?: string; duration?: string; crowd?: string }) {
  return http.post<ApiResponse<null>>('/preferences', prefs)
}

/** 读取用户偏好 */
export function getPreferences() {
  return http.get<ApiResponse<{ interest?: string; duration?: string; crowd?: string }>>('/preferences')
}

/** 清空用户偏好 */
export function clearPreferences() {
  return http.delete<ApiResponse<null>>('/preferences')
}
