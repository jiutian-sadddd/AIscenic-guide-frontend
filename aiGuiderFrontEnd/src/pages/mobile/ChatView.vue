<template>
  <div class="chat-view mobile-container">
    <!-- ==================== 顶部导航 ==================== -->
    <header class="cv-header">
      <div class="cv-header__left" @click="showSessions = true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </div>
      <span class="cv-header__title">{{ scenicName }}</span>
      <div class="cv-header__right">
        <!-- TTS 开关 -->
        <button
          class="cv-header__icon-btn"
          :style="{ color: tts.autoTtsEnabled.value ? '#6366f1' : '#a8a29e' }"
          :title="tts.autoTtsEnabled.value ? '语音回复: 开' : '语音回复: 关'"
          @click="tts.toggleAutoTts()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <template v-if="tts.autoTtsEnabled.value">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </template>
            <template v-else>
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            </template>
          </svg>
        </button>
        <!-- 语音设置 -->
        <button
          class="cv-header__icon-btn"
          title="语音设置"
          @click="showVoiceSettings = true"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <!-- 偏好设置 -->
        <button
          class="cv-header__icon-btn"
          title="我的偏好"
          @click="showPrefModal = true"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
      </div>
    </header>

    <!-- ==================== 数字人展示区 (Live2D / 模型位于输入框上方) ==================== -->
    <section
      class="cv-digital-human"
      :class="{ 'cv-digital-human--collapsed': isDHCollapsed }"
      ref="digitalHumanSectionRef"
    >
      <DigitalHuman
        ref="digitalHumanRef"
        :audio-url="currentAudioUrl"
        :text="currentSubtitle"
        :emotion="chatStore.currentEmotion"
        :sentiment="chatStore.currentSentiment"
        :is-idle="!chatStore.isStreaming && !chatStore.isLoading"
        :suggestions="currentSuggestions"
        model-path="/live2d/灵仙儿.cmo3"
        animation-path="/live2d/Untitled Animation.can3"
        @speaking-start="onDHSpeakingStart"
        @speaking-end="onDHSpeakingEnd"
        @suggestion-action="onSuggestionAction"
      />
    </section>

    <!-- ==================== 消息列表 ==================== -->
    <section class="cv-messages" ref="messagesRef" @scroll="onScroll">
      <!-- 空状态 / 欢迎页 -->
      <div v-if="!hasMessages && !chatStore.isStreaming" class="cv-empty">
        <div class="cv-empty__hero">
          <div class="cv-empty__hero-icon">🏯</div>
          <h2>您好，我是小导</h2>
          <p>我已经研读了灵山景区所有资料，关于美食、景点、路线，尽管问我</p>
        </div>
        <!-- 快捷提问 -->
        <div class="cv-empty__quick">
          <button
            v-for="q in quickQuestions"
            :key="q.label"
            class="cv-quick-btn"
            @click="sendMessage(q.text)"
          >
            {{ q.icon }} {{ q.label }}
          </button>
        </div>
      </div>

      <!-- 消息气泡 + 流式输出 -->
      <div
        v-for="msg in chatStore.sortedMessages"
        :key="msg.message_id"
        class="cv-msg"
        :class="`cv-msg--${msg.role}`"
      >
        <div v-if="msg.role === 'assistant'" class="cv-msg__avatar cv-msg__avatar--ai">
          🏯
        </div>
        <div class="cv-msg__body">
          <div
            class="message-bubble"
            :class="`message-bubble--${msg.role}`"
          >
            <!-- 使用 marked 渲染 Markdown（经过预处理） -->
            <div v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" />
            <template v-else>{{ msg.content }}</template>
          </div>
          <!-- 语音播放按钮 -->
          <button
            v-if="msg.role === 'assistant'"
            class="cv-msg__audio-btn btn-speaker"
            @click="speakMessage(msg.content, $event)"
            title="朗读"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          </button>
        </div>
        <div v-if="msg.role === 'user'" class="cv-msg__avatar cv-msg__avatar--user">
          <svg viewBox="0 0 40 40" width="36" height="36">
            <circle cx="20" cy="15" r="12" fill="#764ba2" opacity="0.3" />
            <circle cx="20" cy="15" r="8" fill="#764ba2" />
            <ellipse cx="20" cy="36" rx="14" ry="6" fill="#764ba2" opacity="0.2" />
          </svg>
        </div>
      </div>

      <!-- 流式输出气泡 (打字机效果) -->
      <div v-if="chatStore.isStreaming || streamingText" class="cv-msg cv-msg--assistant">
        <div class="cv-msg__avatar cv-msg__avatar--ai">🏯</div>
        <div class="cv-msg__body">
          <div
            class="message-bubble message-bubble--ai typing-cursor"
            v-html="renderMarkdown(chatStore.streamingContent || streamingText)"
          />
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="chatStore.isLoading && !chatStore.isStreaming" class="cv-typing-indicator">
        <span class="cv-typing-dot" />
        <span class="cv-typing-dot" />
        <span class="cv-typing-dot" />
      </div>

      <div ref="messagesEndRef" />
    </section>

    <!-- ==================== 底部输入区 ==================== -->
    <footer class="cv-input-bar">
      <!-- 模式切换 -->
      <ChatModeSwitch v-model="chatStore.chatMode" />

      <div class="cv-input-bar__inner">
        <VoiceRecorder
          @text-recognized="onVoiceRecognized"
          @recording-start="onRecordingStart"
          @recording-end="onVoiceRecorded"
          @error="onVoiceError"
        />

        <div class="cv-input-field">
          <input
            ref="inputRef"
            v-model="inputText"
            class="cv-input"
            type="text"
            :placeholder="modePlaceholder"
            maxlength="500"
            @keydown.enter="sendMessage(inputText)"
          />
          <button
            class="cv-send-btn"
            :disabled="!inputText.trim() || chatStore.isLoading"
            @click="sendMessage(inputText)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </footer>

    <!-- ==================== 会话历史抽屉 ==================== -->
    <van-popup v-model:show="showSessions" position="left" :style="{ width: '80%', height: '100%' }">
      <div class="cv-sessions">
        <h3 class="cv-sessions__title">对话历史</h3>
        <van-button
          size="small"
          type="primary"
          block
          style="margin-bottom: 12px"
          @click="startNewChat"
        >
          + 新建对话
        </van-button>
        <div
          v-for="session in aiSessions"
          :key="session.sessionId"
          class="cv-session-item"
          :class="{ 'cv-session-item--active': session.sessionId === chatStore.currentSessionId }"
          @click="switchAISession(session.sessionId)"
        >
          <div class="cv-session-item__title">{{ session.title }}</div>
          <div class="cv-session-item__meta">
            {{ session.messageCount ?? 0 }} 条消息 · {{ formatRelativeTime(session.lastUpdateTime) }}
          </div>
          <van-icon
            name="delete-o"
            class="cv-session-item__delete"
            @click.stop="onDeleteSession(session.sessionId)"
          />
        </div>
        <van-empty v-if="!aiSessions.length" description="暂无对话记录" />

        <!-- 知识库面板 -->
        <KnowledgeBasePanel />
      </div>
    </van-popup>

    <!-- ==================== 确认弹窗 ==================== -->
    <ConfirmModal />

    <!-- ==================== 语音设置弹窗 ==================== -->
    <VoiceSettingsModal
      :visible="showVoiceSettings"
      :current-voice-id="tts.currentVoice.value"
      @update:current-voice-id="onVoiceChange"
      @save="onVoiceSave"
      @close="showVoiceSettings = false"
    />

    <!-- ==================== 偏好设置弹窗 ==================== -->
    <PreferencesModal
      :visible="showPrefModal"
      :initial-prefs="savedUserPrefs"
      @save="onPrefSave"
      @skip="onPrefSkip"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { showToast } from 'vant'
import { marked } from 'marked'
import DigitalHuman from '@/components/DigitalHuman/index.vue'
import VoiceRecorder from '@/components/VoiceRecorder/index.vue'
import ChatModeSwitch from '@/components/ChatModeSwitch/index.vue'
import ConfirmModal from '@/components/ConfirmModal/index.vue'
import VoiceSettingsModal from '@/components/VoiceSettingsModal/index.vue'
import PreferencesModal from '@/components/PreferencesModal/index.vue'
import KnowledgeBasePanel from '@/components/KnowledgeBasePanel/index.vue'
import { useChatStore } from '@/stores/chat'
import { useTTS } from '@/composables/useTTS'
import { usePreferences } from '@/composables/usePreferences'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { preprocessMarkdown, escapeHtml } from '@/utils/markdown'
import { formatRelativeTime } from '@/utils/time'
import { detectSentiment } from '@/utils/sentiment'
import type { UserPreferences, AISession } from '@/types/api.types'

const chatStore = useChatStore()
const tts = useTTS()
const prefs = usePreferences()
const { showConfirmModal } = useConfirmModal()

/** 模式切换 placeholder */
const modePlaceholder = computed(() =>
  chatStore.chatMode === 'deep'
    ? '使用Agentic RAG 模式，更精细化分析问题...'
    : '采用普通RAG模式，快速准确回答...',
)

// ==================== 消息 ====================
const inputText = ref('')
const messagesRef = ref<HTMLDivElement | null>(null)
const messagesEndRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const streamingText = ref('')
const currentAudioUrl = ref('')
const currentSubtitle = ref('')
const isDHCollapsed = ref(false)

// ==================== 数字人 ====================
const digitalHumanRef = ref<InstanceType<typeof DigitalHuman> | null>(null)
const digitalHumanSectionRef = ref<HTMLElement | null>(null)

// ==================== 对话建议气泡 ====================
interface ChatSuggestion {
  text: string
  icon?: string
  action?: string
  duration?: number
}
const currentSuggestions = ref<ChatSuggestion[]>([])

/** 根据对话状态生成建议 */
function generateSuggestions(): void {
  const suggestions: ChatSuggestion[] = []

  if (!hasMessages.value) {
    // 欢迎态：推荐常用问题
    suggestions.push(
      { text: '灵山有什么必去的景点？', icon: '🏔', action: '灵山有什么必去的景点？', duration: 8000 },
      { text: '帮我推荐游览路线吧', icon: '🗺', action: '帮我推荐游览路线吧', duration: 8000 },
      { text: '附近有什么好吃的？', icon: '🍜', action: '附近有什么好吃的？', duration: 7000 },
    )
  } else if (chatStore.isStreaming) {
    // 流式中：不显示建议
    currentSuggestions.value = []
    return
  } else {
    // 对话中：快捷追问
    const lastMsg = chatStore.sortedMessages.value[chatStore.sortedMessages.value.length - 1]
    if (lastMsg && lastMsg.role === 'assistant') {
      suggestions.push(
        { text: '能详细说说吗？', icon: '🔍', action: '能详细说说吗？', duration: 5000 },
        { text: '还有其他的吗？', icon: '✨', action: '还有其他的吗？', duration: 5000 },
      )
    }
  }

  currentSuggestions.value = suggestions
}

/** 建议气泡点击 → 填充输入框并发送 */
function onSuggestionAction(text: string): void {
  sendMessage(text)
}

// ==================== 弹窗 ====================
const showSessions = ref(false)
const showVoiceSettings = ref(false)
const showPrefModal = ref(false)

// ==================== AI 会话列表 ====================
const aiSessions = ref<AISession[]>([])
const savedUserPrefs = ref<UserPreferences>({})

// 快捷提问
const quickQuestions = [
  { icon: '🏔', label: '必去景点', text: '灵山有什么必去的景点？' },
  { icon: '🍜', label: '美食推荐', text: '灵山有什么好吃的推荐？' },
  { icon: '🗺', label: '游览路线', text: '帮我规划一条游览路线' },
]

const scenicName = ref('灵山胜境 · AI 智慧导览')

// ==================== 计算属性 ====================
const hasMessages = computed(
  () => chatStore.sortedMessages.length > 0 || !!chatStore.streamingContent,
)

// marked 配置
marked.setOptions({ gfm: true, breaks: true })

// ==================== 生命周期 ====================
onMounted(async () => {
  // 加载 AI 端会话列表
  await loadAISessionsList()

  // 加载偏好
  const existingPrefs = await prefs.loadPreferences()
  savedUserPrefs.value = existingPrefs

  // 首次访问弹偏好
  if (prefs.shouldShowPrefModal()) {
    setTimeout(() => {
      showPrefModal.value = true
    }, 800)
  }

  // 如果没有会话，显示欢迎页（生成临时 ID）
  if (!aiSessions.value.length && !chatStore.currentSessionId) {
    chatStore.createNewSession()
  }

  // 聚焦输入框
  setTimeout(() => inputRef.value?.focus(), 300)

  // 初始建议
  generateSuggestions()
})

async function loadAISessionsList(): Promise<void> {
  try {
    aiSessions.value = await chatStore.loadAISessions()
  } catch {
    aiSessions.value = []
  }
}

// ==================== 消息发送 ====================
async function sendMessage(text: string) {
  const trimmed = text.trim()
  if (!trimmed || chatStore.isLoading) return

  inputText.value = ''
  currentSubtitle.value = ''

  // 自动生成会话 ID
  if (!chatStore.currentSessionId) {
    chatStore.createNewSession()
  }

  try {
    await chatStore.streamChat(trimmed)
    currentAudioUrl.value = ''

    // 自动 TTS
    if (tts.autoTtsEnabled.value && chatStore.streamingContent.value) {
      tts.playTts(chatStore.sortedMessages.value[chatStore.sortedMessages.value.length - 1]?.content || '', true)
    }

    // 检测情感驱动数字人
    const lastMsg = chatStore.sortedMessages.value[chatStore.sortedMessages.value.length - 1]
    if (lastMsg && lastMsg.role === 'assistant') {
      const sentiment = detectSentiment(lastMsg.content)
      if (sentiment !== 'neutral') {
        chatStore.currentSentiment = sentiment
        // 3秒后重置
        setTimeout(() => chatStore.resetSentiment(), 3000)
      }
    }

    scrollToBottom()

    // 刷新会话列表
    await loadAISessionsList()
  } catch {
    showToast('发送失败，请重试')
  }
}

// ==================== 语音识别回调 ====================
function onVoiceRecognized(text: string) {
  if (text) {
    inputText.value = text
    sendMessage(text)
  }
}

function onRecordingStart(): void {
  // 录音开始
}

async function onVoiceRecorded(_blob: Blob): Promise<void> {
  // 语音已由 ASR composable 处理
}

function onVoiceError(err: Error): void {
  showToast(err.message)
}

// ==================== 数字人回调 ====================
function onDHSpeakingStart(): void {
  isDHCollapsed.value = false
}

function onDHSpeakingEnd(): void {
  // 说话结束后可自动折叠
}

// ==================== Markdown 渲染 ====================
function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    const processed = preprocessMarkdown(text)
    const html = marked.parse(processed, { breaks: true }) as string
    return html
  } catch {
    return escapeHtml(text).replace(/\n/g, '<br>')
  }
}

// ==================== TTS 朗读 ====================
function speakMessage(content: string, event: Event): void {
  const btn = (event.currentTarget as HTMLElement)
  if (btn.classList.contains('speaking')) {
    tts.stopAllTts()
    return
  }
  tts.stopAllTts()
  btn.classList.add('speaking')
  tts.playTts(content, false).finally(() => {
    btn.classList.remove('speaking')
  })
}

// ==================== 滚动控制 ====================
function scrollToBottom(): void {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

function onScroll(): void {
  // 可扩展：上拉加载更多历史消息
}

watch(
  () => chatStore.streamingContent,
  () => {
    scrollToBottom()
  },
)

// 监听流式状态 & 消息变化，刷新建议气泡
watch(
  () => [chatStore.isStreaming, chatStore.sortedMessages.length],
  () => {
    generateSuggestions()
  },
  { immediate: false },
)

// ==================== 语音设置 ====================
function onVoiceChange(voiceId: string): void {
  chatStore.setVoiceId(voiceId)
}

function onVoiceSave(): void {
  showToast('音色已保存')
}

// ==================== 偏好设置 ====================
async function onPrefSave(prefsData: UserPreferences): Promise<void> {
  await prefs.savePreferences(prefsData)
  savedUserPrefs.value = prefsData
  showPrefModal.value = false
  showToast('偏好已保存！开始你的智能导览吧')
}

function onPrefSkip(): void {
  prefs.skipPreferences()
  showPrefModal.value = false
}

// ==================== 会话管理 ====================
async function startNewChat(): Promise<void> {
  stopAllSpeaking()
  await chatStore.createNewSession()
  showSessions.value = false
  chatStore.messages = []
  inputRef.value?.focus()
}

async function switchAISession(sessionId: string): Promise<void> {
  stopAllSpeaking()
  chatStore.setCurrentSession(sessionId)
  await chatStore.loadAISessionMessages(sessionId)
  showSessions.value = false
  scrollToBottom()
}

function onDeleteSession(sessionId: string): void {
  showConfirmModal('确定要删除这个对话吗？删除后不可恢复。', async () => {
    await chatStore.deleteAISession(sessionId)
    await loadAISessionsList()
    // 如果删除后没有会话了，新建一个
    if (!aiSessions.value.length) {
      await chatStore.createNewSession()
    }
  })
}

function stopAllSpeaking(): void {
  tts.stopAllTts()
}

// ===== 工具 ======
// formatRelativeTime 从 @/utils/time 导入
</script>

<style scoped lang="scss">
// ============================================
// ChatView — 移动端主对话页（增强版）
// ============================================

$header-height: 48px;
$input-bar-height: 64px;
$primary: #667eea;
$accent: #f59e0b;

.chat-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #fafaf9;
  background-image: radial-gradient(ellipse at 20% 80%, #fef3c7 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 20%, #ede9fe 0%, transparent 50%);
  overflow: hidden;
}

// ===== 顶部导航 =====
.cv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e7e5e4;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;

  &__left {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 50%;
    transition: background 0.2s;
    color: #78716c;

    &:active { background: rgba(0, 0, 0, 0.05); }
  }

  &__title {
    font-size: 17px;
    font-weight: 600;
    color: #292524;
    letter-spacing: 0.5px;
  }

  &__right {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  &__icon-btn {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: #78716c;
    transition: all 0.15s;

    &:hover { background: #f0efed; color: $accent; }
  }
}

// ===== 数字人区域 (Live2D 模型位于输入框上方) =====
.cv-digital-human {
  display: flex;
  justify-content: center;
  padding: 8px 16px 4px;
  flex-shrink: 0;
  transition: all 0.3s ease;
  // 模型区域始终可见，位于消息列表上方、输入框下方流中
  position: relative;
  z-index: 2;

  &--collapsed {
    padding: 2px 16px;
    transform: scale(0.75);
    opacity: 0.6;
    max-height: 120px;
  }
}

// ===== 消息列表 =====
.cv-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

// ===== 欢迎页 =====
.cv-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
  text-align: center;

  &__hero-icon {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    background: linear-gradient(135deg, $accent, #d97706);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    color: #fff;
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25);
    margin-bottom: 8px;
  }

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #292524;
  }

  p {
    font-size: 14px;
    color: #a8a29e;
    max-width: 360px;
    line-height: 1.7;
  }

  &__quick {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }
}

.cv-quick-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e7e5e4;
  border-radius: 20px;
  font-size: 13px;
  color: #78716c;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover { border-color: $accent; color: #d97706; background: #fffbeb; }
}

// ===== 消息气泡 =====
.cv-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;

  &--user { justify-content: flex-end; }
  &--user .cv-msg__avatar { display: none; }

  &__avatar {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;

    &--ai {
      background: linear-gradient(135deg, $accent, #d97706);
      color: #fff;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }

    &--user {
      background: linear-gradient(135deg, #764ba2, #667eea);
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 82%;
  }

  &__audio-btn {
    align-self: flex-start;
    background: none;
    border: none;
    color: #a8a29e;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;

    &:hover { color: $accent; background: #fffbeb; }
    &.speaking { color: $accent; animation: speakerPulse 0.6s infinite; }
  }
}

.message-bubble {
  &--user {
    background: linear-gradient(135deg, $primary, #764ba2);
    color: #fff;
    padding: 14px 20px;
    border-radius: 18px 6px 18px 18px;
    font-size: 14.5px;
    line-height: 1.65;
  }

  &--ai {
    background: #fff;
    border: 1px solid #e7e5e4;
    border-radius: 6px 18px 18px 18px;
    padding: 18px 22px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    line-height: 1.85;
    color: #44403c;
    font-size: 15px;
    word-break: break-word;
  }
}

// 流式光标
.typing-cursor::after {
  content: '|';
  animation: cursorBlink 0.8s infinite;
  color: $primary;
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes speakerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

// ===== 打字指示器 =====
.cv-typing-indicator {
  display: flex;
  gap: 5px;
  padding: 10px 14px;
  background: #fff;
  border-radius: 12px;
  align-self: flex-start;
  width: fit-content;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.cv-typing-dot {
  width: 8px;
  height: 8px;
  background: #d6d3d1;
  border-radius: 50%;
  animation: typingBounce 1.2s ease-in-out infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

// ===== 底部输入栏 =====
.cv-input-bar {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-top: 1px solid #e7e5e4;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));

  &__inner {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.cv-input-field {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f3f0;
  border-radius: 16px;
  padding: 0 6px 0 16px;
  border: 1.5px solid transparent;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: $accent;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
}

.cv-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14.5px;
  line-height: 44px;
  color: #292524;

  &::placeholder { color: #c4beb9; }
}

.cv-send-btn {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, $accent, #d97706);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);

  &:disabled {
    background: #ccc;
    box-shadow: none;
    cursor: not-allowed;
  }

  &:not(:disabled):active { transform: scale(0.95); }
}

// ===== 会话历史侧边栏 =====
.cv-sessions {
  padding: 20px 16px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  &__title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }
}

.cv-session-item {
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;

  &:hover { background: #f5f6f8; }

  &--active {
    background: #fffbeb;
    border-left: 3px solid $accent;

    .cv-session-item__title { color: #92400e; }
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    color: #44403c;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 30px;
  }

  &__meta {
    font-size: 12px;
    color: #a8a29e;
  }

  &__delete {
    position: absolute;
    top: 12px;
    right: 12px;
    color: #ccc;
    cursor: pointer;

    &:hover { color: #e74c3c; }
  }
}

// ===== Markdown 内容 (全局样式，因为 v-html 不受 scoped 限制) =====
</style>

<style lang="scss">
// 注意：v-html 渲染的内容不受 scoped 限制，因此需要在全局样式中定义
// 在 .chat-view 范围内使用后代选择器限定

.cv-messages {
  // Markdown 内容样式
  .markdown-body p { margin-bottom: 0.8rem; }
  .markdown-body p:last-child { margin-bottom: 0; }

  .markdown-body h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: #92400e;
    background: linear-gradient(135deg, #fffbeb, #fef3c7);
    padding: 12px 18px;
    margin: 1.8rem 0 0 0;
    border-left: 4px solid #f59e0b;
    border-radius: 8px 8px 0 0;
    letter-spacing: 0.3px;
  }
  .markdown-body h3:first-child { margin-top: 0; }

  .markdown-body ul {
    list-style: none;
    padding: 14px 18px;
    margin: 0 0 1.6rem 0;
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    border-top: none;
    border-radius: 0 0 10px 10px;
  }

  .markdown-body li {
    padding: 6px 0;
    border-bottom: 1px solid #f0efed;
    font-size: 14px;
    line-height: 1.7;
  }
  .markdown-body li:last-child { border-bottom: none; padding-bottom: 0; }

  .markdown-body strong {
    color: #d97706;
    font-weight: 700;
  }

  .markdown-body ol {
    padding-left: 1.2em;
    margin: 0.6rem 0 0 0;
    color: #78716c;
    font-size: 13.5px;
  }
  .markdown-body ol li { padding: 4px 0; border: none; }
}
</style>
