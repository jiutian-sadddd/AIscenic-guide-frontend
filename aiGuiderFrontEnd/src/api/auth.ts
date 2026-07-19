import http from './index'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types/api.types'

/** 用户注册 */
export function register(data: LoginRequest) {
  return http.post<ApiResponse<LoginResponse>>('/auth/register', data)
}

/** 用户登录（普通用户和管理员共用 /ai/auth/login，角色由后端判断） */
export function login(data: LoginRequest) {
  return http.post<ApiResponse<LoginResponse>>('/auth/login', data)
}

/** 管理员登录（与 login 相同，保留别名便于调用方语义清晰） */
export function adminLogin(data: LoginRequest) {
  return login(data)
}

/** 用户注销 */
export function logout() {
  return http.post<ApiResponse<null>>('/auth/logout')
}
