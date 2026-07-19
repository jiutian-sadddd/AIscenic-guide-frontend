// ============================================================
// AI 服务 API 模块 — /ai/* 端点
// 语音合成 (TTS)、语音识别 (ASR)、知识库、偏好、会话历史、SSE 流式对话
// ============================================================

import type { KBStats, UserPreferences, AISession, AIHistoryMessage, ChatMode } from '@/types/api.types'

/** AI 服务 base URL */
const AI_BASE =
  window.location.protocol === 'file:' || window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : import.meta.env.VITE_AI_BASE_URL || 'https://ggysummer.zeabur.app'

/** 获取 JWT token */
function getToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

// ==================== SSE 流式对话 (fetch-based) ====================

export interface ChatStreamCallbacks {
  onToken: (token: string) => void
  onSentiment: (sentiment: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

/**
 * 创建 fetch-based SSE 流式对话连接（比 EventSource 更可靠）
 * 返回 abort 函数用于取消
 */
export function createChatStreamFetch(
  message: string,
  sessionId: string,
  mode: ChatMode,
  callbacks: ChatStreamCallbacks,
): { abort: () => void } {
  const controller = new AbortController()
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  void (async () => {
    try {
      const response = await fetch(
        `${AI_BASE}/ai/chat/stream?message=${encodeURIComponent(message)}&sessionId=${encodeURIComponent(sessionId)}&mode=${mode}`,
        { signal: controller.signal, headers },
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          // SSE event channel
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim()
            continue
          }
          if (line.startsWith('data:')) {
            let content = line.substring(5).replace(/^ /, '')

            // 情感事件
            if (currentEvent === 'sentiment') {
              callbacks.onSentiment(content.trim())
              currentEvent = ''
              continue
            }
            currentEvent = ''

            // 检查是否结束
            if (content === '[DONE]') {
              callbacks.onDone()
              return
            }

            // 解析可能的 JSON 字符串
            try {
              if (content.trim().startsWith('"')) content = JSON.parse(content.trim()) as string
            } catch {
              content = content.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
            }
            callbacks.onToken(String(content))
          }
        }
      }

      // 流结束
      callbacks.onDone()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError(err as Error)
      }
    }
  })()

  return {
    abort: () => controller.abort(),
  }
}

// ==================== TTS 语音合成（GET /ai/tts） ====================

/**
 * 调用后端 TTS 合成语音
 * @param text 要合成的文本
 * @param voice 音色编号（int: 0-4，默认 3=度小美）
 * @param speed 语速 0-15，默认 5
 * @param pitch 音调 0-15，默认 5
 * @param volume 音量 0-15，默认 5
 * @returns 音频 Blob（MP3）
 */
export async function synthesizeSpeech(
  text: string,
  voice: number = 3,
  speed: number = 5,
  pitch: number = 5,
  volume: number = 5,
): Promise<Blob> {
  const params = new URLSearchParams({
    text: text.length > 500 ? text.substring(0, 500) : text,
    voice: String(voice),
    speed: String(speed),
    pitch: String(pitch),
    volume: String(volume),
  })
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/tts?${params.toString()}`, { headers })
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}`)
  return res.blob()
}

// ==================== ASR 语音识别（POST /ai/asr multipart） ====================

/**
 * 将 WAV Blob 发送到后端进行语音识别
 * @param wavBlob WAV 格式音频 Blob（16kHz, 16bit, 单声道）
 * @param devPid 语言模型：1537=普通话 / 1737=英语 / 1637=粤语 / 1837=四川话，默认 1537
 * @returns 识别出的文本
 */
export async function transcribeAudio(wavBlob: Blob, devPid: number = 1537): Promise<string> {
  const form = new FormData()
  form.append('file', wavBlob, 'recording.wav')
  form.append('dev_pid', String(devPid))

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/asr`, {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) throw new Error(`ASR HTTP ${res.status}`)
  const json = (await res.json()) as { code: number; success: boolean; data?: string; message?: string }
  if (json.code !== 200) throw new Error(json.message || '识别失败')
  return (json.data || '').trim()
}

// ==================== 用户偏好 ====================

/** 获取用户偏好 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/preferences`, { headers })
  const data = (await res.json()) as { code: number; success: boolean; data?: UserPreferences }
  return (data.code === 200 && data.data) ? data.data : {}
}

/** 保存用户偏好 */
export async function updateUserPreferences(prefs: UserPreferences): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  await fetch(`${AI_BASE}/ai/preferences`, {
    method: 'POST',
    headers,
    body: JSON.stringify(prefs),
  })
}

/** 清空用户偏好 */
export async function clearUserPreferences(): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  await fetch(`${AI_BASE}/ai/preferences`, { method: 'DELETE', headers })
}

// ==================== 知识库管理 ====================

/** 上传文档到知识库 */
export async function importKbDocument(file: File): Promise<{ code: number; message: string; data?: string }> {
  const form = new FormData()
  form.append('file', file)

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/import`, { method: 'POST', headers, body: form })
  return (await res.json()) as { code: number; message: string; data?: string }
}

/** 获取知识库统计 */
export async function getKbStats(): Promise<KBStats> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/rag/stats`, { headers })
  const data = (await res.json()) as { code: number; data?: KBStats }
  return data.data || { totalChunks: 0, sourceCount: 0 }
}

/** 清空全部知识库文档 */
export async function deleteAllKbDocuments(): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  await fetch(`${AI_BASE}/ai/rag/document/all`, { method: 'DELETE', headers })
}

/** 查询 Rerank 缓存统计 */
export async function getCacheStats(): Promise<{
  l1Size: number; l1Hits: number; l2Size: number; l2Hits: number
  l3Size: number; l3Hits: number; apiCalls: number; hitRate: string
}> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/cache/stats`, { headers })
  const data = (await res.json()) as { code: number; data: Record<string, unknown> }
  return data.data as { l1Size: number; l1Hits: number; l2Size: number; l2Hits: number; l3Size: number; l3Hits: number; apiCalls: number; hitRate: string }
}

/** 清空 Rerank 缓存 */
export async function clearRerankCache(): Promise<{ code: number; message: string }> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/cache/clear`, { method: 'POST', headers })
  return (await res.json()) as { code: number; message: string }
}

// ==================== 会话历史 ====================

/** 获取会话列表 */
export async function getSessions(): Promise<AISession[]> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/history`, { headers })
  const data = (await res.json()) as { code: number; success: boolean; data?: AISession[] }
  return (data.code === 200 && data.data) ? data.data : []
}

/** 获取会话消息历史 */
export async function getSessionMessages(sessionId: string): Promise<AIHistoryMessage[]> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${AI_BASE}/ai/history/${encodeURIComponent(sessionId)}`, { headers })
  const data = (await res.json()) as { code: number; success: boolean; data?: AIHistoryMessage[] }
  return (data.code === 200 && data.data) ? data.data : []
}

/** 删除会话 */
export async function deleteSession(sessionId: string): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  await fetch(`${AI_BASE}/ai/history/${encodeURIComponent(sessionId)}`, { method: 'DELETE', headers })
}
