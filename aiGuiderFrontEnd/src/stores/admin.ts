import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  DashboardOverview,
  DigitalHumanConfig,
  AdminUser,
  SystemSettings,
} from '@/types/api.types'
import * as analyticsApi from '@/api/analytics'
import * as adminApi from '@/api/admin'

export const useAdminStore = defineStore('admin', () => {
  // ==================== 数据大屏 ====================
  const dashboard = ref<DashboardOverview | null>(null)
  const sentimentTrend = ref<Array<{ date: string; score: number }>>([])
  const hotQuestions = ref<Array<{ rank: number; question: string; count: number }>>([])
  const dashboardLoading = ref(false)

  async function fetchDashboard() {
    dashboardLoading.value = true
    try {
      const [dashRes, sentimentRes, hotRes] = await Promise.all([
        analyticsApi.getDashboardOverview(),
        analyticsApi.getSentimentTrend(7),
        analyticsApi.getHotQuestions(10),
      ])
      dashboard.value = dashRes.data.data
      sentimentTrend.value = sentimentRes.data.data || []
      hotQuestions.value = hotRes.data.data || []
    } finally {
      dashboardLoading.value = false
    }
  }

  // ==================== 数字人配置（后端暂未实现） ====================
  const digitalHumanConfig = ref<DigitalHumanConfig | null>(null)
  const availableVoices = ref<Array<{ voice_id: string; name: string; gender: string; preview_url: string }>>([])

  async function fetchDigitalHumanConfig() {
    try {
      const { data } = await adminApi.getDigitalHumanConfig()
      digitalHumanConfig.value = data.data as unknown as DigitalHumanConfig
    } catch {
      /* 接口暂未实现 */
    }
  }

  async function updateDigitalHumanConfig(config: Partial<DigitalHumanConfig>) {
    try {
      const { data } = await adminApi.updateDigitalHumanConfig(config)
      digitalHumanConfig.value = data.data as unknown as DigitalHumanConfig
    } catch {
      /* 接口暂未实现 */
    }
  }

  async function fetchVoices() {
    try {
      const { data } = await adminApi.getVoices()
      availableVoices.value = data.data as unknown as Array<{ voice_id: string; name: string; gender: string; preview_url: string }>
    } catch {
      /* 接口暂未实现 */
    }
  }

  // ==================== 管理员管理 ====================
  const adminUsers = ref<AdminUser[]>([])
  const adminUsersTotal = ref(0)

  async function fetchAdminUsers(_page = 1, _size = 20) {
    try {
      const { data } = await adminApi.getAdminUsers({ page: _page, size: _size })
      adminUsers.value = data.data || []
      adminUsersTotal.value = adminUsers.value.length
    } catch {
      adminUsers.value = []
      adminUsersTotal.value = 0
    }
  }

  // ==================== 系统设置（后端暂未实现） ====================
  const systemSettings = ref<SystemSettings | null>(null)

  async function fetchSystemSettings() {
    try {
      const { data } = await adminApi.getSystemSettings()
      systemSettings.value = data.data as unknown as SystemSettings
    } catch {
      /* 接口暂未实现 */
    }
  }

  async function updateSystemSettings(settings: Partial<SystemSettings>) {
    try {
      const { data } = await adminApi.updateSystemSettings(settings)
      systemSettings.value = data.data as unknown as SystemSettings
    } catch {
      /* 接口暂未实现 */
    }
  }

  return {
    // dashboard
    dashboard,
    sentimentTrend,
    hotQuestions,
    dashboardLoading,
    fetchDashboard,
    // digital human
    digitalHumanConfig,
    availableVoices,
    fetchDigitalHumanConfig,
    updateDigitalHumanConfig,
    fetchVoices,
    // admin users
    adminUsers,
    adminUsersTotal,
    fetchAdminUsers,
    // settings
    systemSettings,
    fetchSystemSettings,
    updateSystemSettings,
  }
})
