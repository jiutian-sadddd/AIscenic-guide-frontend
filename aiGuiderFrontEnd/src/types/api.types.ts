// ============================================================
// API 通用类型定义 (遵循 backend-api.md 统一响应格式)
// ============================================================

/** 统一响应体 Wrapper */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  success: boolean
  data: T
}

/** 分页数据结构 */
export interface PaginatedData<T> {
  total: number
  page: number
  size: number
  items: T[]
}

/** 分页查询参数 */
export interface PaginationParams {
  page?: number
  size?: number
}

// ==================== 认证模块 ====================

/** 登录/注册请求（后端统一使用 username） */
export interface LoginRequest {
  username: string
  password: string
}

/** 管理员登录请求（与普通用户共用 /ai/auth/login，角色由后端判断） */
export interface AdminLoginRequest {
  username: string
  password: string
}

/** 登录/注册响应 */
export interface LoginResponse {
  userId: string
  username: string
  token: string
  role: 'USER' | 'ADMIN'
}

/** 用户信息（从 /ai/admin/users 获取） */
export interface UserInfo {
  userId: string
  username: string
  role: 'USER' | 'ADMIN'
  status: 'active' | 'disabled'
  createTime: string
  /** 前端扩展：兴趣标签（来自偏好接口） */
  interests?: InterestTag[]
}

/** 兴趣标签 */
export type InterestTag = 'history' | 'nature' | 'food' | 'family'

// ==================== 对话模块 ====================

/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/** 消息实体 */
export interface ChatMessage {
  message_id: string
  role: MessageRole
  content: string
  audio_url: string | null
  emotion: EmotionType | null
  created_at: string
}

/** 情感类型 */
export type EmotionType =
  | 'enthusiastic'
  | 'friendly'
  | 'professional'
  | 'lively'
  | 'curious'
  | 'neutral'
  | 'positive'
  | 'negative'

/** 发送消息请求 */
export interface SendMessageRequest {
  content: string
  session_id?: string
  scenic_spot_id?: string
}

/** 发送消息响应 */
export interface SendMessageResponse {
  message_id: string
  session_id: string
  reply: string
  emotion: EmotionType
  intent: string
  audio_url: string
  duration_ms: number
}

/** 会话摘要 */
export interface SessionSummary {
  session_id: string
  title: string
  message_count: number
  last_message: string
  last_time: string
}

/** 消息历史分页 */
export interface MessageHistory {
  session_id: string
  total: number
  has_more: boolean
  items: ChatMessage[]
}

/** WebSocket 消息协议 —— 客户端→服务端 */
export type WsClientMessage =
  | { type: 'chat'; content: string; session_id?: string }
  | { type: 'ping' }

/** WebSocket 消息协议 —— 服务端→客户端 */
export type WsServerMessage =
  | { type: 'chunk'; content: string; index: number }
  | { type: 'emotion'; label: EmotionType }
  | { type: 'done'; session_id: string }
  | { type: 'error'; message: string; code: number }
  | { type: 'pong' }

// ==================== 知识库模块 ====================

/** 文档分类 */
export type DocCategory = 'history' | 'culture' | 'faq' | 'notice'

/** 知识库文档 */
export interface KnowledgeDoc {
  id: string
  title: string
  category: DocCategory
  content_snippet?: string
  content?: string
  file_url?: string
  status: 'draft' | 'published' | 'archived'
  vector_status: 'pending' | 'syncing' | 'synced' | 'failed'
  tags: string[]
  created_at: string
  updated_at: string
}

/** 创建文档请求 */
export interface CreateDocRequest {
  title: string
  category: DocCategory
  content?: string
  file?: File
  tags?: string[]
}

/** 更新文档请求 */
export interface UpdateDocRequest {
  title?: string
  category?: DocCategory
  content?: string
  tags?: string[]
}

/** 文档分类统计 */
export interface CategoryStat {
  key: DocCategory
  label: string
  count: number
}

// ==================== 数据分析模块 ====================

/** 数据大屏概览（匹配 /ai/analytics/dashboard 响应） */
export interface DashboardOverview {
  serviceCount: {
    total: number
    today: number
    week: number
    trend: string
  }
  activeUsers: {
    current: number
    peakToday: number
  }
  satisfactionTrend: Array<{ date: string; score: number }>
  hotQuestionsTop10: Array<{ rank: number; question: string; count: number }>
  emotionDistribution: {
    positive: number
    neutral: number
    negative: number
  }
}

/** 情感趋势数据点 */
export interface SentimentDataPoint {
  date: string
  score: number
}

/** 分析报告 */
export interface AnalysisReport {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly'
  period_start: string
  period_end: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

// ==================== 位置服务模块 ====================

/** 景点 */
export interface ScenicSpot {
  id: string
  name: string
  category: 'history' | 'nature' | 'facility'
  description: string
  longitude: number
  latitude: number
  audio_url: string
  tags: string[]
  distance?: number
}

// ==================== 数字人配置模块 ====================

/** 数字人外观配置 */
export interface DHAppearance {
  model_id: string
  outfit: string
  hairstyle: string
}

/** 数字人声音配置 */
export interface DHVoice {
  voice_id: string
  speed: number
  pitch: number
  volume: number
}

/** 数字人完整配置 */
export interface DigitalHumanConfig {
  appearance: DHAppearance
  voice: DHVoice
  emotion_style: 'friendly' | 'professional' | 'lively'
  preview_url: string
}

// ==================== 管理后台模块 ====================

/** 管理员用户（匹配 /ai/admin/users 响应） */
export interface AdminUser {
  userId: string
  username: string
  role: 'USER' | 'ADMIN'
  status: 'active' | 'disabled'
  createTime: string
}

/** 操作日志 */
export interface OperationLog {
  admin_id: string
  action: string
  target: string
  detail: string
  ip: string
  created_at: string
}

/** 系统设置 */
export interface SystemSettings {
  scenic_name: string
  business_hours: string
  welcome_message: string
  maintenance_mode: boolean
  language: string
}

// ==================== AI 对话增强模块 (从 aitest.html 迁移) ====================

/** 对话模式 */
export type ChatMode = 'normal' | 'deep'

/** TTS 音色选项 */
export interface TTSVoice {
  id: string
  name: string
  gender: '男' | '女'
  style: string
  isDefault?: boolean
}

/** TTS 合成请求 */
export interface TTSRequest {
  text: string
  voice: string
}

/** 知识库统计 */
export interface KBStats {
  totalChunks: number
  sourceCount: number
}

/** 增强版用户偏好 */
export interface UserPreferences {
  interest?: string // 逗号分隔: "景点,美食,文化"
  duration?: string // "半天","全天" 等
  crowd?: string // "老人,小孩" 等
}

/** ASR 语音识别请求 */
export interface ASRRequest {
  audio: string // base64 data URL
}

/** ASR 语音识别响应 */
export interface ASRResponse {
  success: boolean
  data?: string
  message?: string
}

/** 会话（AI 端格式） */
export interface AISession {
  sessionId: string
  title: string
  messageCount: number
  lastMessage: string
  lastUpdateTime: string
}

/** AI 历史消息 */
export interface AIHistoryMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

/** 情感标签（数字人驱动） */
export type SentimentLabel = 'positive' | 'negative' | 'neutral'
