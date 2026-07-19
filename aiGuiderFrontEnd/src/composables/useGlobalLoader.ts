// ============================================================
// useGlobalLoader — 全局加载条状态管理
// ============================================================

import { ref, computed } from 'vue'

const loaderCount = ref(0)
const isLoading = computed(() => loaderCount.value > 0)

export function useGlobalLoader() {
  function showLoader(): void {
    loaderCount.value++
  }

  function hideLoader(): void {
    loaderCount.value = Math.max(0, loaderCount.value - 1)
  }

  async function withLoader<T>(fn: () => Promise<T>): Promise<T> {
    showLoader()
    try {
      return await fn()
    } finally {
      hideLoader()
    }
  }

  return {
    isLoading,
    showLoader,
    hideLoader,
    withLoader,
  }
}
