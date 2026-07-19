// ============================================================
// useChatMode — 对话模式管理 (Normal RAG / Deep Agentic RAG)
// ============================================================

import { ref, computed } from 'vue'
import type { ChatMode } from '@/types/api.types'

const currentMode = ref<ChatMode>('normal')

export function useChatMode() {
  const modePlaceholder = computed(() =>
    currentMode.value === 'deep'
      ? '使用Agentic RAG 模式，更精细化分析问题...'
      : '采用普通RAG模式，快速准确回答...',
  )

  function setMode(mode: ChatMode): void {
    currentMode.value = mode
  }

  return {
    currentMode,
    modePlaceholder,
    setMode,
  }
}
