import http from './index'
import type {
  ApiResponse,
  PaginatedData,
  PaginationParams,
  KnowledgeDoc,
  CreateDocRequest,
  UpdateDocRequest,
  CategoryStat,
  DocCategory,
} from '@/types/api.types'

// ==================== 知识库对应后端：/ai/import + /ai/rag/* + /ai/cache/* ====================

/** 上传知识库文件（Excel/Word） */
export function importFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.post<ApiResponse<string>>('/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 获取知识库统计信息 */
export function getRagStats() {
  return http.get<ApiResponse<{ totalChunks: number; sourceCount: number; cacheStats?: Record<string, unknown> }>>('/rag/stats')
}

/** 清空整个知识库 ⚠️ 不可逆 */
export function clearAllDocuments() {
  return http.delete<ApiResponse<string>>('/rag/document/all')
}

/** 查询 Rerank 缓存统计 */
export function getCacheStats() {
  return http.get<ApiResponse<Record<string, unknown>>>('/cache/stats')
}

/** 清空 Rerank 缓存 */
export function clearCache() {
  return http.post<ApiResponse<null>>('/cache/clear')
}

// ==================== 以下为管理后台占位接口（后端尚未实现文档 CRUD） ====================

/** @deprecated 后端暂无文档列表接口 */
export function getDocList(params?: PaginationParams & { category?: DocCategory; keyword?: string }) {
  return http.get<ApiResponse<PaginatedData<KnowledgeDoc>>>('/knowledge', { params })
}

/** @deprecated 后端暂无文档详情接口 */
export function getDocDetail(doc_id: string) {
  return http.get<ApiResponse<KnowledgeDoc>>(`/knowledge/${doc_id}`)
}

/** @deprecated 后端暂无文档创建接口，请使用 importFile */
export function createDoc(data: CreateDocRequest) {
  const form = new FormData()
  form.append('title', data.title)
  form.append('category', data.category)
  if (data.content) form.append('content', data.content)
  if (data.file) form.append('file', data.file)
  if (data.tags) form.append('tags', JSON.stringify(data.tags))
  return http.post<ApiResponse<KnowledgeDoc>>('/knowledge', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** @deprecated 后端暂无文档编辑接口 */
export function updateDoc(doc_id: string, data: UpdateDocRequest) {
  return http.put<ApiResponse<KnowledgeDoc>>(`/knowledge/${doc_id}`, data)
}

/** @deprecated 后端暂无单文档删除接口，请使用 clearAllDocuments */
export function deleteDoc(doc_id: string) {
  return http.delete<ApiResponse<null>>(`/knowledge/${doc_id}`)
}

/** @deprecated 后端暂无分类统计接口 */
export function getCategories() {
  return http.get<ApiResponse<CategoryStat[]>>('/knowledge/categories')
}

/** @deprecated 后端暂无向量同步接口 */
export function syncDocVector(doc_id: string) {
  return http.post<ApiResponse<{ doc_id: string; vector_status: string; chunk_count: number }>>(
    `/knowledge/${doc_id}/sync`,
  )
}
