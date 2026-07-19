<template>
  <div class="kb-panel">
    <div class="kb-panel-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
      <span>知识库管理</span>
    </div>

    <div class="kb-panel-body">
      <!-- 上传 -->
      <button class="kb-btn kb-btn-upload" :disabled="isUploading" @click="triggerUpload">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        上传文档
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".docx,.xlsx,.pdf,.md,.txt"
        style="display: none"
        @change="onFileSelected"
      />

      <!-- 统计 -->
      <button class="kb-btn kb-btn-stats" @click="kb.refreshKbStats()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        统计
      </button>

      <!-- 清空 -->
      <button class="kb-btn kb-btn-delete" @click="onDeleteAll">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        清空知识库
      </button>

      <!-- 刷新缓存 -->
      <button class="kb-btn kb-btn-cache" @click="kb.clearRerankCache()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        刷新缓存
      </button>

      <!-- 统计 -->
      <div v-if="kb.kbStats.value" class="kb-stats">
        <div class="kb-stats-line">碎片数：<b>{{ kb.kbStats.value.totalChunks }}</b></div>
        <div class="kb-stats-line">文档数：<b>{{ kb.kbStats.value.sourceCount }}</b></div>
      </div>

      <!-- 状态 -->
      <div
        v-if="kb.kbStatus.value"
        class="kb-status"
        :class="kb.kbStatus.value.type"
      >
        {{ kb.kbStatus.value.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useKnowledgeBase } from '@/composables/useKnowledgeBase'
import { useConfirmModal } from '@/composables/useConfirmModal'

const kb = useKnowledgeBase()
const { showConfirmModal } = useConfirmModal()

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = kb.isUploading

function triggerUpload(): void {
  fileInput.value?.click()
}

function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  void kb.uploadKbFile(file)
  input.value = ''
}

function onDeleteAll(): void {
  showConfirmModal('确定清空知识库？此操作不可恢复！', () => {
    void kb.deleteAllKb()
  })
}
</script>

<style scoped>
.kb-panel {
  border-top: 1px solid #f0efed;
  padding: 12px 16px;
  background: #fafaf9;
}

.kb-panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #78716c;
  margin-bottom: 8px;
}

.kb-panel-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kb-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  background: #fff;
  color: #44403c;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.kb-btn:hover {
  background: #f5f3f0;
  border-color: #d6d3d1;
}

.kb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kb-btn-upload { color: #6366f1; border-color: #c7d2fe; }
.kb-btn-upload:hover { background: #eef2ff; }
.kb-btn-stats { color: #059669; border-color: #a7f3d0; }
.kb-btn-stats:hover { background: #ecfdf5; }
.kb-btn-delete { color: #dc2626; border-color: #fecaca; }
.kb-btn-delete:hover { background: #fef2f2; }
.kb-btn-cache { color: #d97706; border-color: #fde68a; background: #fffbeb; }
.kb-btn-cache:hover { background: #fef3c7; border-color: #fbbf24; }
.kb-btn-cache:disabled { opacity: 0.5; cursor: not-allowed; }

.kb-stats {
  width: 100%;
  margin-top: 6px;
  padding: 6px 8px;
  background: #f5f3f0;
  border-radius: 4px;
  font-size: 11px;
  color: #57534e;
}

.kb-stats-line { padding: 2px 0; }

.kb-status {
  width: 100%;
  margin-top: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
}

.kb-status.success { background: #ecfdf5; color: #059669; }
.kb-status.error { background: #fef2f2; color: #dc2626; }
.kb-status.loading { background: #eff6ff; color: #2563eb; }
</style>
