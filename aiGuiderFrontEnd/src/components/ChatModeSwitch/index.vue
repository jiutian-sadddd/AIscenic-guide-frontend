<template>
  <div class="mode-switch">
    <button
      class="mode-btn"
      :class="{ active: modelValue === 'normal' }"
      @click="$emit('update:modelValue', 'normal')"
      title="采用普通RAG模式 保证速度的同时兼顾准确性"
    >
      💬 正常聊天
    </button>
    <button
      class="mode-btn"
      :class="{ active: modelValue === 'deep', deep: modelValue === 'deep' }"
      @click="$emit('update:modelValue', 'deep')"
      title="使用Agentic RAG 模式 更精细化的分析问题"
    >
      🧠 深度思考
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ChatMode } from '@/types/api.types'

defineProps<{
  modelValue: ChatMode
}>()

defineEmits<{
  (e: 'update:modelValue', value: ChatMode): void
}>()
</script>

<style scoped>
.mode-switch {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  background: #f5f3f0;
  border-radius: 12px;
  padding: 4px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: #78716c;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.mode-btn:hover {
  color: #44403c;
}

.mode-btn.active {
  background: #fff;
  color: #92400e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.mode-btn.active.deep {
  color: #4f46e5;
}
</style>
