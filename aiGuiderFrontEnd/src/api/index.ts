import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/api.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ggysummer.zeabur.app/ai'

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==================== 请求拦截器 ====================
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ==================== 响应拦截器 ====================
http.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data, status } = response

    // 文件流直接返回
    if (response.config.responseType === 'blob') return response

    // 统一响应体
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 200) {
        return response
      }
      // 业务错误
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }

    // 非标准响应（如 SSE 通过其他渠道处理）
    return response
  },
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    const msg = error.response?.data?.message

    switch (status) {
      case 401:
        localStorage.removeItem('token')
        // 跳转登录
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login'
        }
        break
      case 403:
        ElMessage.error('无权限执行此操作')
        break
      case 404:
        ElMessage.error(msg || '请求的资源不存在')
        break
      case 500:
        ElMessage.error('服务器内部错误，请稍后重试')
        break
      default:
        ElMessage.error(msg || `请求异常 (${status})`)
    }

    return Promise.reject(error)
  },
)

// ==================== 401 处理 ====================
// 后端未提供 token 刷新接口，401 时直接清除本地 token 并跳转登录页
const refreshTokenAndRetry = undefined // 保留占位，未来后端提供刷新接口时可启用

export default http
