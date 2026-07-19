// ============================================================
// usePreferences — 增强版用户偏好管理
// 三组偏好：兴趣、可用时间、同行人群
// ============================================================

import { ref } from 'vue'
import * as aiApi from '@/api/ai'
import type { UserPreferences } from '@/types/api.types'

const PREFS_KEY = 'scenic_prefs_shown'

export const PREF_OPTIONS: Record<string, { label: string; opts: string[] }> = {
  interest: { label: '兴趣偏好', opts: ['景点', '美食', '文化', '路线', '综合'] },
  duration: { label: '可用时间', opts: ['半天', '全天', '2小时', '3小时', '4小时', '6小时'] },
  crowd: { label: '同行人群', opts: ['老人', '小孩', '情侣', '独自', '家庭', '朋友'] },
}

const prefsLoaded = ref(false)
const savedPrefs = ref<UserPreferences>({})

export function usePreferences() {
  /** 检查是否应该显示偏好弹窗 */
  function shouldShowPrefModal(): boolean {
    try {
      return localStorage.getItem(PREFS_KEY) !== '1'
    } catch {
      return true
    }
  }

  /** 从后端加载已有偏好 */
  async function loadPreferences(): Promise<UserPreferences> {
    try {
      savedPrefs.value = await aiApi.getUserPreferences()
      prefsLoaded.value = true
      return savedPrefs.value
    } catch {
      prefsLoaded.value = true
      return {}
    }
  }

  /** 保存偏好到后端 */
  async function savePreferences(prefs: UserPreferences): Promise<void> {
    try {
      await aiApi.updateUserPreferences(prefs)
      savedPrefs.value = prefs
    } catch {
      /* 静默失败 */
    }
    try {
      localStorage.setItem(PREFS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  /** 跳过偏好设置 */
  function skipPreferences(): void {
    try {
      localStorage.setItem(PREFS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return {
    prefsLoaded,
    savedPrefs,
    shouldShowPrefModal,
    loadPreferences,
    savePreferences,
    skipPreferences,
  }
}
