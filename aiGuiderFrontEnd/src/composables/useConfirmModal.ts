// ============================================================
// useConfirmModal — 自定义确认弹窗状态管理
// ============================================================

import { ref } from 'vue'

const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmCallback: (() => void) | null = null

export function useConfirmModal() {
  function showConfirmModal(message: string, onConfirm: () => void): void {
    confirmMessage.value = message
    confirmCallback = onConfirm
    confirmVisible.value = true
  }

  function hideConfirmModal(): void {
    confirmVisible.value = false
    confirmCallback = null
  }

  function handleConfirm(): void {
    if (confirmCallback) {
      confirmCallback()
    }
    hideConfirmModal()
  }

  return {
    confirmVisible,
    confirmMessage,
    showConfirmModal,
    hideConfirmModal,
    handleConfirm,
  }
}
