import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, SessionSummary, EmotionType, InterestTag, ChatMode, AISession } from '@/types/api.types'
import * as chatApi from '@/api/chat'
import * as aiApi from '@/api/ai'
import { detectSentiment } from '@/utils/sentiment'

export const useChatStore = defineStore('chat', () => {
  // ==================== 会话状态 ====================
  const sessions = ref<SessionSummary[]>([])
  const currentSessionId = ref<string>('')
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const streamingContent = ref('')
  const currentEmotion = ref<EmotionType>('neutral')

  // ==================== 用户偏好 ====================
  const interests = ref<InterestTag[]>([])
  const hasSetPreferences = ref(false)

  // ==================== 增强状态 (从 aitest.html 迁移) ====================
  const chatMode = ref<ChatMode>('normal')
  const autoTtsEnabled = ref(true)
  const currentVoiceId = ref('106')
  const isTtsSpeaking = ref(false)
  const sessionsCache = ref<AISession[] | null>(null)
  const currentSentiment = ref<'positive' | 'negative' | 'neutral'>('neutral')

  // ==================== 计算属性 ====================
  const currentSession = computed(() =>
    sessions.value.find((s) => s.session_id === currentSessionId.value),
  )

  const sortedMessages = computed(() =>
    [...messages.value].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  )

  // ==================== 会话管理 ====================
  async function fetchSessions() {
    const { data } = await chatApi.getSessions()
    // getSessions 现在直接返回 AISession[]
    const aiSessions = data.data || []
    sessions.value = aiSessions.map((s) => ({
      session_id: s.sessionId,
      title: s.title,
      message_count: s.messageCount,
      last_message: '',
      last_time: s.lastUpdateTime,
    }))
  }

  function setCurrentSession(sessionId: string) {
    currentSessionId.value = sessionId
  }

  async function createNewSession(): Promise<string> {
    // 生成新会话 ID (客户端先生成，等后端返回后更新)
    const newId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
    currentSessionId.value = newId
    messages.value = []
    streamingContent.value = ''
    clearSessionCache()
    return newId
  }

  async function fetchMessages(sessionId: string) {
    const { data } = await chatApi.getSessionMessages(sessionId)
    const aiMessages = data.data || []
    messages.value = aiMessages.map((msg) => ({
      message_id: `${msg.role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: msg.role,
      content: msg.content,
      audio_url: null,
      emotion: null,
      created_at: msg.timestamp || new Date().toISOString(),
    }))
  }

  async function deleteCurrentSession(sessionId: string) {
    await chatApi.deleteSession(sessionId)
    sessions.value = sessions.value.filter((s) => s.session_id !== sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = ''
      messages.value = []
    }
    clearSessionCache()
  }

  // ==================== 增强: AI 端会话管理 (从 aitest.html 迁移) ====================

  /** 生成唯一会话 ID */
  function generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
  }

  /** 清除会话列表缓存 */
  function clearSessionCache(): void {
    sessionsCache.value = null
  }

  /** 加载 AI 端会话列表（带缓存和重试） */
  async function loadAISessions(): Promise<AISession[]> {
    if (sessionsCache.value) return sessionsCache.value

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await aiApi.getSessions()
        sessionsCache.value = data
        return data
      } catch (e) {
        console.warn(`[Sessions] attempt ${attempt} failed:`, e)
        if (attempt >= 2) return []
      }
    }
    return []
  }

  /** 加载 AI 端会话消息历史 */
  async function loadAISessionMessages(sessionId: string): Promise<void> {
    try {
      const aiMessages = await aiApi.getSessionMessages(sessionId)
      messages.value = aiMessages.map((msg) => ({
        message_id: `${msg.role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        role: msg.role,
        content: msg.content,
        audio_url: null,
        emotion: null,
        created_at: msg.timestamp || new Date().toISOString(),
      }))
    } catch (e) {
      console.error('[Sessions] loadMessages failed:', e)
      messages.value = []
    }
  }

  /** 删除 AI 端会话 */
  async function deleteAISession(sessionId: string): Promise<void> {
    await aiApi.deleteSession(sessionId).catch(() => {})
    clearSessionCache()

    // 如果删除的是当前会话，清空消息
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = ''
      messages.value = []
    }
  }

  // ==================== 消息发送 ====================
  /** 发送文本消息（通过 SSE 流式，不再使用已废弃的 /dialog/message） */
  async function sendTextMessage(content: string, _scenicSpotId?: string) {
    // 统一使用 streamChat 进行流式对话
    await streamChat(content)
  }

  /** 语音消息通过 ASR 转文本后走流式对话，不再单独调用后端语音接口 */
  async function sendVoiceMessage(_audioBlob: File) {
    // 语音已由 ASR composable 转为文本后通过 streamChat 发送
    console.warn('[chat] sendVoiceMessage deprecated, use ASR + streamChat instead')
  }

  // ==================== SSE 流式对话 (fetch-based + mode + sentiment) ====================
  let activeAbortController: { abort: () => void } | null = null

  function streamChat(content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      isStreaming.value = true
      streamingContent.value = ''

      // 用户消息
      messages.value.push({
        message_id: `local_${Date.now()}`,
        role: 'user',
        content,
        audio_url: null,
        emotion: null,
        created_at: new Date().toISOString(),
      })

      // 使用 fetch-based SSE（支持自定义 headers、mode 参数）
      try {
        const controller = aiApi.createChatStreamFetch(
          content,
          currentSessionId.value || 'default',
          chatMode.value,
          {
            onToken: (token: string) => {
              streamingContent.value += token
            },
            onSentiment: (sentiment: string) => {
              currentEmotion.value = sentiment as EmotionType
              // 同时用关键词检测用户情感
              const s = detectSentiment(content)
              if (s !== 'neutral') currentSentiment.value = s
            },
            onDone: () => {
              messages.value.push({
                message_id: `ai_${Date.now()}`,
                role: 'assistant',
                content: streamingContent.value,
                audio_url: null,
                emotion: currentEmotion.value,
                created_at: new Date().toISOString(),
              })
              streamingContent.value = ''
              isStreaming.value = false
              activeAbortController = null
              resolve()
            },
            onError: (err: Error) => {
              // SSE 流失败，保留已接收的部分内容
              if (streamingContent.value) {
                messages.value.push({
                  message_id: `ai_${Date.now()}`,
                  role: 'assistant',
                  content: streamingContent.value + '\n\n[连接中断]',
                  audio_url: null,
                  emotion: currentEmotion.value,
                  created_at: new Date().toISOString(),
                })
              }
              streamingContent.value = ''
              isStreaming.value = false
              activeAbortController = null
              reject(err)
            },
          },
        )
        activeAbortController = controller
      } catch (err) {
        isStreaming.value = false
        reject(err as Error)
      }
    })
  }

  function cancelStream() {
    activeAbortController?.abort()
    activeAbortController = null
    isStreaming.value = false
  }

  // ==================== 偏好管理 ====================
  async function saveInterests(tags: InterestTag[]) {
    interests.value = tags
    hasSetPreferences.value = true
    // 将 InterestTag[] 转为偏好字符串
    const interestStr = tags.join(',')
    await chatApi.savePreferences({ interest: interestStr })
  }

  async function loadPreferences() {
    try {
      const { data } = await chatApi.getPreferences()
      if (data.data?.interest) {
        interests.value = data.data.interest.split(',').filter(Boolean) as InterestTag[]
        hasSetPreferences.value = true
      }
    } catch {
      // 未登录或无偏好，忽略
    }
  }

  // ==================== 增强: 对话模式 / TTS ====================
  function setChatMode(mode: ChatMode): void {
    chatMode.value = mode
  }

  function toggleAutoTts(): void {
    autoTtsEnabled.value = !autoTtsEnabled.value
  }

  function setVoiceId(id: string): void {
    currentVoiceId.value = id
  }

  function resetSentiment(): void {
    currentSentiment.value = 'neutral'
  }

  // ==================== 清理 ====================
  function reset() {
    sessions.value = []
    currentSessionId.value = ''
    messages.value = []
    streamingContent.value = ''
    isStreaming.value = false
    isLoading.value = false
    currentEmotion.value = 'neutral'
    currentSentiment.value = 'neutral'
    activeAbortController?.abort()
    activeAbortController = null
    sessionsCache.value = null
  }

  return {
    // state
    sessions,
    currentSessionId,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    currentEmotion,
    interests,
    hasSetPreferences,
    // enhanced state
    chatMode,
    autoTtsEnabled,
    currentVoiceId,
    isTtsSpeaking,
    sessionsCache,
    currentSentiment,
    // computed
    currentSession,
    sortedMessages,
    // actions
    fetchSessions,
    setCurrentSession,
    createNewSession,
    fetchMessages,
    deleteCurrentSession,
    sendTextMessage,
    sendVoiceMessage,
    streamChat,
    cancelStream,
    saveInterests,
    loadPreferences,
    // enhanced actions
    generateSessionId,
    clearSessionCache,
    loadAISessions,
    loadAISessionMessages,
    deleteAISession,
    setChatMode,
    toggleAutoTts,
    setVoiceId,
    resetSentiment,
    reset,
  }
})
