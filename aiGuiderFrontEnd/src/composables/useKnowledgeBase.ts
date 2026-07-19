// ============================================================
// useKnowledgeBase — 知识库管理（上传/统计/清空/缓存刷新）
// ============================================================

import { ref } from 'vue'
import * as aiApi from '@/api/ai'
import type { KBStats } from '@/types/api.types'

const kbStats = ref<KBStats | null>(null)
const kbStatus = ref<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null)
const isUploading = ref(false)

export function useKnowledgeBase() {
  /** 上传文档到知识库 */
  async function uploadKbFile(file: File): Promise<void> {
    isUploading.value = true
    kbStatus.value = { type: 'loading', message: '上传中...' }

    try {
      const data = await aiApi.importKbDocument(file)
      if (data.code === 200) {
        kbStatus.value = { type: 'success', message: '✅ ' + (data.data || '上传成功') }
        await refreshKbStats()
      } else {
        kbStatus.value = { type: 'error', message: '❌ ' + (data.message || '上传失败') }
      }
    } catch (err) {
      kbStatus.value = { type: 'error', message: '❌ 网络错误: ' + (err as Error).message }
    } finally {
      isUploading.value = false
    }
  }

  /** 刷新知识库统计 */
  async function refreshKbStats(): Promise<void> {
    try {
      kbStats.value = await aiApi.getKbStats()
      kbStatus.value = { type: 'success', message: '✅ 已更新' }
    } catch (err) {
      kbStatus.value = { type: 'error', message: '❌ ' + (err as Error).message }
    }
  }

  /** 清空知识库（危险操作） */
  async function deleteAllKb(): Promise<void> {
    kbStatus.value = { type: 'loading', message: '清空中...' }
    try {
      await aiApi.deleteAllKbDocuments()
      kbStatus.value = { type: 'success', message: '✅ 知识库已清空' }
      kbStats.value = { totalChunks: 0, sourceCount: 0 }
    } catch (err) {
      kbStatus.value = { type: 'error', message: '❌ ' + (err as Error).message }
    }
  }

  /** 清空 Rerank 缓存 */
  async function clearRerankCache(): Promise<void> {
    kbStatus.value = { type: 'loading', message: '清空中...' }
    try {
      const data = await aiApi.clearRerankCache()
      if (data.code === 200) {
        kbStatus.value = { type: 'success', message: '✅ ' + (data.message || '缓存已清空') }
      } else {
        kbStatus.value = { type: 'error', message: '❌ ' + (data.message || '清空失败') }
      }
    } catch (err) {
      kbStatus.value = { type: 'error', message: '❌ ' + (err as Error).message }
    }
  }

  return {
    kbStats,
    kbStatus,
    isUploading,
    uploadKbFile,
    refreshKbStats,
    deleteAllKb,
    clearRerankCache,
  }
}
