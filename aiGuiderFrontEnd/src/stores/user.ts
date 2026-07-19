import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, InterestTag } from '@/types/api.types'
import * as authApi from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null)
  const token = ref<string>(localStorage.getItem('token') || '')

  // ==================== 计算属性 ====================
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isSuperAdmin = computed(() => user.value?.role === 'ADMIN')
  const userId = computed(() => user.value?.userId || '')

  // ==================== 登录 ====================
  async function loginAsUser(username: string, password: string) {
    const { data } = await authApi.login({ username, password })
    handleLoginResponse(data)
  }

  async function loginAsAdmin(username: string, password: string) {
    const { data } = await authApi.adminLogin({ username, password })
    handleLoginResponse(data)
  }

  async function registerUser(username: string, password: string) {
    const { data } = await authApi.register({ username, password })
    handleLoginResponse(data)
  }

  function handleLoginResponse(resp: { code: number; message: string; success: boolean; data: { userId: string; username: string; token: string; role: string } }) {
    const loginData = resp.data
    token.value = loginData.token
    localStorage.setItem('token', loginData.token)
    // 构造本地用户信息（后端 /ai/auth/login 不返回完整 UserInfo）
    user.value = {
      userId: loginData.userId,
      username: loginData.username,
      role: loginData.role as 'USER' | 'ADMIN',
      status: 'active',
      createTime: new Date().toISOString(),
    }
  }

  // ==================== 偏好设置 ====================
  function updateInterestsLocally(interests: InterestTag[]) {
    if (user.value) {
      user.value.interests = interests
    }
  }

  // ==================== 退出登录 ====================
  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* 即使后端调用失败也清除本地状态 */
    }
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    userId,
    loginWithPhone: loginAsUser, // 向后兼容别名
    loginAsUser,
    loginAsAdmin,
    register: registerUser,
    updateInterestsLocally,
    logout,
  }
})
