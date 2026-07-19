<template>
  <div
    class="digital-human"
    :class="{
      'is-speaking': isSpeaking,
      'dh--happy': sentiment === 'positive',
      'dh--angry': sentiment === 'negative',
      'dh--ready': live2dReady,
    }"
    ref="containerRef"
  >
    <!-- ==========================================
         Live2D 渲染区域
         ========================================== -->
    <div class="dh-stage" ref="stageRef">
      <!-- Live2D Canvas (Cubism 5 渲染目标) -->
      <canvas
        ref="live2dCanvasRef"
        class="dh-live2d-canvas"
        :style="canvasStyle"
      />

      <!-- 降级：静态 SVG (当 SDK 不加载时) -->
      <div v-if="showFallback" class="dh-avatar dh-fallback">
        <div class="dh-fallback__inner">
          <svg
            viewBox="0 0 200 240"
            xmlns="http://www.w3.org/2000/svg"
            class="dh-svg"
          >
            <line x1="170" y1="30" x2="170" y2="130" stroke="#5a4a3a" stroke-width="3" />
            <rect x="155" y="15" width="35" height="25" rx="3" fill="#e74c3c" />
            <text x="172" y="33" font-size="10" fill="white" text-anchor="middle" font-weight="bold">导游</text>
            <ellipse cx="100" cy="38" rx="42" ry="8" fill="#5a4a3a" />
            <rect x="70" y="10" width="60" height="30" rx="8" fill="#5a4a3a" />
            <rect x="65" y="28" width="70" height="10" rx="4" fill="#6b5b4a" />
            <ellipse cx="100" cy="65" rx="35" ry="38" fill="#ffe0bd" />
            <g class="dh-eyes-fallback">
              <ellipse cx="88" cy="60" rx="5" ry="6" fill="#333" />
              <ellipse cx="112" cy="60" rx="5" ry="6" fill="#333" />
              <circle cx="89" cy="57" r="1.5" fill="white" />
              <circle cx="113" cy="57" r="1.5" fill="white" />
            </g>
            <ellipse cx="78" cy="72" rx="7" ry="4" fill="#ffb3b3" opacity="0.5" />
            <ellipse cx="122" cy="72" rx="7" ry="4" fill="#ffb3b3" opacity="0.5" />
            <g class="dh-mouth-fallback" :class="{ 'dh-mouth--speaking': isSpeaking }">
              <ellipse cx="100" cy="78" rx="6" ry="4" fill="#e88b8b" />
            </g>
            <rect x="72" y="100" width="56" height="55" rx="10" fill="#4a90d9" />
            <polygon points="85,100 100,118 115,100" fill="white" />
            <rect x="126" y="100" width="16" height="8" rx="4" fill="#ffe0bd" transform="rotate(20, 134, 104)" />
            <circle cx="148" cy="92" r="5" fill="#ffe0bd" />
            <rect x="80" y="155" width="18" height="40" rx="8" fill="#4a4a5a" />
            <rect x="102" y="155" width="18" height="40" rx="8" fill="#4a4a5a" />
            <rect x="76" y="190" width="26" height="10" rx="5" fill="#333" />
            <rect x="98" y="190" width="26" height="10" rx="5" fill="#333" />
            <rect x="78" y="120" width="44" height="16" rx="3" fill="white" opacity="0.9" />
            <text x="100" y="132" font-size="8" fill="#4a90d9" text-anchor="middle" font-weight="bold">灵仙儿</text>
          </svg>
          <span class="dh-fallback__label">灵仙儿</span>
        </div>
      </div>

      <!-- ==========================================
           建议气泡 (悬浮在 Live2D 左侧)
           ========================================== -->
      <div class="dh-suggestions" v-if="suggestions.length > 0 && live2dReady">
        <SuggestionBubble
          v-for="(s, idx) in suggestions"
          :key="idx"
          :text="s.text"
          :icon="s.icon || '💡'"
          :action="s.action"
          :duration="s.duration || 6000"
          :visible="true"
          :style="{ top: `${idx * 70}px` }"
          @action="onSuggestionAction"
          @dismiss="onSuggestionDismiss(idx)"
        />
      </div>

      <!-- 加载指示 -->
      <div v-if="!live2dReady && !showFallback" class="dh-loading">
        <div class="dh-loading__spinner" />
        <span class="dh-loading__text">灵仙儿加载中...</span>
      </div>
    </div>

    <!-- 音频波形 / 口型指示 -->
    <div class="dh-waveform" v-show="isSpeaking && live2dReady">
      <span
        v-for="i in 5"
        :key="i"
        class="dh-waveform__bar"
        :style="{ animationDelay: `${i * 0.15}s` }"
      />
    </div>

    <!-- 字幕（已禁用） -->
    <!-- <div class="dh-subtitle" v-if="displayText">
      <span class="dh-subtitle__text">{{ displayText }}</span>
    </div> -->

    <!-- 状态指示 -->
    <div class="dh-status">
      <span class="dh-status__dot" :class="statusClass" />
      <span class="dh-status__label">{{ statusLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useLive2D } from '@/composables/useLive2D'
import SuggestionBubble from './SuggestionBubble.vue'

// ============================================================
// Props
// ============================================================
export interface DigitalHumanSuggestion {
  text: string
  icon?: string
  action?: string
  duration?: number
}

interface DigitalHumanProps {
  audioUrl?: string
  text?: string
  emotion?: 'friendly' | 'professional' | 'lively' | 'enthusiastic' | 'neutral' | 'curious' | 'positive' | 'negative'
  videoStreamUrl?: string
  isIdle?: boolean
  sentiment?: 'positive' | 'negative' | 'neutral'
  /** 对话建议列表 */
  suggestions?: DigitalHumanSuggestion[]
  /** 模型目录 URL (包含 .model3.json 的目录) */
  modelDir?: string
  /** model3.json 文件名 */
  modelJsonName?: string
  /** 动画映射 { 名称: motion3.json URL } */
  motions?: Record<string, string>
}

const props = withDefaults(defineProps<DigitalHumanProps>(), {
  audioUrl: '',
  text: '',
  emotion: 'friendly',
  videoStreamUrl: '',
  sentiment: 'neutral',
  isIdle: true,
  suggestions: () => [],
  modelDir: '/live2d/lingxianer/',
  modelJsonName: 'lingxianer.model3.json',
  motions: () => ({
    hello: '/live2d/motions/hello.motion3.json',
    idle: '/live2d/motions/idle.motion3.json',
  }),
})

const emit = defineEmits<{
  (e: 'speaking-start'): void
  (e: 'speaking-end'): void
  (e: 'emotion-change', emotion: string): void
  (e: 'suggestion-action', text: string): void
}>()

// ============================================================
// Refs
// ============================================================
const containerRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<HTMLDivElement | null>(null)
const live2dCanvasRef = ref<HTMLCanvasElement | null>(null)
const showFallback = ref(false)
const live2dReady = ref(false)

// ============================================================
// useLive2D
// ============================================================
const live2d = useLive2D({
  modelSetup: {
    modelDir: props.modelDir,
    modelJsonName: props.modelJsonName,
    motions: props.motions,
    // 缩放: 1.0 = 适配画布, >1.0 = 放大, <1.0 = 缩小
    scale: 1.1,
    // 偏移 (CSS 逻辑像素): 正值 offsetX → 右, 正值 offsetY → 上
    // 可根据人物在模型画布中的实际位置微调这两个值
    offsetX: 220,
    offsetY: 190,
  },
  canvasRef: live2dCanvasRef,
  autoIdle: true,
  lookTracking: {
    enabled: true,
    headSensitivity: 8,
    eyeSensitivity: 12,
    smoothing: 0.12,
    maxHeadAngle: 20,
  },
  lipSync: {
    smoothing: 0.35,
    threshold: 0.02,
    maxMouthValue: 0.85,
  },
})

// ============================================================
// 状态
// ============================================================
const isSpeaking = ref(false)
const displayText = ref('')
let typingTimer: ReturnType<typeof setTimeout> | null = null
let audioCleanup: (() => void) | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null

// ============================================================
// Canvas 样式
// ============================================================
const canvasStyle = computed(() => ({
  opacity: live2dReady.value ? 1 : 0,
  transition: 'opacity 0.5s ease',
}))

// ============================================================
// 初始化
// ============================================================
onMounted(async () => {
  // 等待 canvas 挂载后初始化 Live2D
  await nextTick()

  // 设置降级超时 (2.5 秒后如果 Live2D 还没就绪, 显示 SVG)
  fallbackTimer = setTimeout(() => {
    if (!live2dReady.value) {
      console.warn('[DigitalHuman] Live2D 加载超时，切换到降级 SVG')
      showFallback.value = true
    }
  }, 3000)

  // 重试初始化 (canvas 可能还未渲染)
  let retries = 0
  const maxRetries = 10
  const tryInit = async () => {
    if (live2dReady.value || live2d.isError.value) return

    await live2d.init()

    if (live2d.isReady.value) {
      // 额外检查：canvas 是否有有效尺寸
      const canvas = live2dCanvasRef.value
      if (canvas && (canvas.width <= 0 || canvas.height <= 0)) {
        console.warn('[DigitalHuman] canvas 尺寸为 0，等待布局重试...')
        if (retries < maxRetries) {
          retries++
          setTimeout(tryInit, 500)
        } else {
          showFallback.value = true
        }
        return
      }

      live2dReady.value = true
      showFallback.value = false
      if (fallbackTimer) clearTimeout(fallbackTimer)

      // 绑定视线跟踪到整个容器
      live2d.bindLookTracking(stageRef.value)

      // 播放 hello 动画
      setTimeout(() => live2d.playHello(), 300)
    } else if (live2d.isError.value) {
      console.warn('[DigitalHuman] Live2D 初始化错误，切换到降级 SVG:', live2d.errorMessage.value)
      showFallback.value = true
    } else if (retries < maxRetries) {
      retries++
      setTimeout(tryInit, 500)
    } else {
      console.warn('[DigitalHuman] 达到最大重试次数，切换到降级 SVG')
      showFallback.value = true
    }
  }

  tryInit()
})

onBeforeUnmount(() => {
  if (fallbackTimer) clearTimeout(fallbackTimer)
  if (typingTimer) clearTimeout(typingTimer)
  if (audioCleanup) audioCleanup()
  live2d.destroy()
})

// ============================================================
// 监听 Live2D 就绪
// ============================================================
watch(
  () => live2d.isReady.value,
  (ready) => {
    if (ready) {
      live2dReady.value = true
      showFallback.value = false
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  },
)

// ============================================================
// 监听 audioUrl: 驱动口型
// ============================================================
watch(
  () => props.audioUrl,
  (url) => {
    if (!url) return

    isSpeaking.value = true
    emit('speaking-start')

    if (audioCleanup) audioCleanup()

    if (live2dReady.value) {
      // 创建 Audio 元素并连接分析器
      const audio = new Audio(url)
      live2d.connectAudio(audio)
      audio.play().catch(() => {
        // 降级：模拟口型
        live2d.startStreamLipSync()
      })

      audio.onended = () => {
        isSpeaking.value = false
        live2d.disconnectAudio()
        emit('speaking-end')
      }

      audio.onerror = () => {
        live2d.startStreamLipSync()
        setTimeout(() => {
          isSpeaking.value = false
          live2d.stopStreamLipSync()
          emit('speaking-end')
        }, 3000)
      }

      audioCleanup = () => {
        audio.pause()
        audio.src = ''
        live2d.disconnectAudio()
      }
    } else {
      // Fallback 模式：超时结束
      setTimeout(() => {
        isSpeaking.value = false
        emit('speaking-end')
      }, 3000)
    }
  },
)

// ============================================================
// 监听 text: 打字机字幕 + 口型模拟
// ============================================================
watch(
  () => props.text,
  (newText) => {
    if (!newText) {
      displayText.value = ''
      live2d.stopStreamLipSync()
      return
    }

    // 流式口型 (无音频源时的模拟)
    if (live2dReady.value && !props.audioUrl) {
      live2d.startStreamLipSync()
    }

    // 打字机字幕
    let idx = 0
    displayText.value = ''
    if (typingTimer) clearInterval(typingTimer)
    typingTimer = setInterval(() => {
      if (idx < newText.length) {
        displayText.value += newText[idx]
        idx++
      } else {
        if (typingTimer) clearInterval(typingTimer)
        typingTimer = null
      }
    }, 80)
  },
)

// ============================================================
// 监听 isIdle: AI 输出结束 → 口型停止
// ============================================================
watch(
  () => props.isIdle,
  (idle) => {
    if (idle && live2dReady.value) {
      live2d.stopStreamLipSync()
    }
  },
)

// ============================================================
// 监听 emotion
// ============================================================
watch(
  () => props.emotion,
  (em) => {
    if (em) emit('emotion-change', em)
  },
)

// ============================================================
// 建议气泡事件
// ============================================================
function onSuggestionAction(text: string): void {
  emit('suggestion-action', text)
}

function onSuggestionDismiss(index: number): void {
  // 气泡自行消失，父组件可监听移除
}

// ============================================================
// 计算属性
// ============================================================
const statusClass = computed(() => {
  if (isSpeaking.value) return 'dh-status__dot--speaking'
  if (live2dReady.value && !props.isIdle) return 'dh-status__dot--ready'
  if (live2dReady.value) return 'dh-status__dot--live'
  return 'dh-status__dot--idle'
})

const statusLabel = computed(() => {
  if (isSpeaking.value) return '讲解中…'
  if (!live2dReady.value) return '加载中…'
  if (props.isIdle) return '待机中'
  return '准备就绪'
})

// ============================================================
// 暴露给父组件
// ============================================================
defineExpose({
  setLookTarget: (x: number, y: number) => live2d.setLookTarget(x, y),
  setLookEnabled: (enabled: boolean) => live2d.setLookEnabled(enabled),
  setMouthOpen: (val: number) => live2d.setMouthOpen(val),
  playHello: () => live2d.playHello(),
  playIdle: () => live2d.playIdle(),
  playMotion: (name: string) => live2d.playMotion(name),
  connectAudio: (audio: HTMLAudioElement) => live2d.connectAudio(audio),
  disconnectAudio: () => live2d.disconnectAudio(),
  startStreamLipSync: () => live2d.startStreamLipSync(),
  stopStreamLipSync: () => live2d.stopStreamLipSync(),
  getIsSpeaking: () => isSpeaking.value,
  getLive2DReady: () => live2dReady.value,
})
</script>

<style scoped lang="scss">
// ============================================================
// DigitalHuman — Live2D 数字人容器
// ============================================================

.digital-human {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(240, 244, 255, 0.5) 0%, rgba(232, 240, 254, 0.3) 100%);
  transition: all 0.3s ease;
  position: relative;

  &.is-speaking {
    background: linear-gradient(180deg, rgba(232, 245, 233, 0.5) 0%, rgba(200, 230, 201, 0.3) 100%);
  }

  &.dh--happy {
    background: linear-gradient(180deg, rgba(236, 253, 245, 0.5) 0%, rgba(209, 250, 229, 0.3) 100%);
  }

  &.dh--angry {
    background: linear-gradient(180deg, rgba(254, 242, 242, 0.5) 0%, rgba(254, 226, 226, 0.3) 100%);
  }
}

// ===== Live2D 舞台 =====
.dh-stage {
  position: relative;
  width: 400px;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 440px) {
    width: 340px;
    height: 440px;
  }
}

// ===== Live2D Canvas =====
.dh-live2d-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  touch-action: none; // 防止移动端默认行为
}

// ===== 降级 SVG =====
.dh-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2; // 确保在 canvas 上方可见

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: #667eea;
    letter-spacing: 0.5px;
  }

  .dh-svg {
    width: 160px;
    height: 192px;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.06) 0%, transparent 70%);
    border-radius: 16px;
  }
}

// ===== 建议气泡容器 =====
.dh-suggestions {
  position: fixed;
  left: 16px;
  bottom: 90px; // 刚好在底部输入栏上方
  z-index: 50;
  pointer-events: auto;

  @media (max-width: 420px) {
    left: 50%;
    bottom: 80px;
    transform: translateX(-50%);
  }

  @media (max-width: 360px) {
    left: 50%;
    bottom: 75px;
    transform: translateX(-50%);
  }
}

// ===== 降级动画 =====
.dh-eyes-fallback {
  transform-origin: center center;
  animation: blink 4s ease-in-out infinite;
}

@keyframes blink {
  0%, 94%, 98%, 100% { transform: scaleY(1); }
  96% { transform: scaleY(0.1); }
}

.dh-mouth--speaking {
  animation: mouthTalk 0.3s ease-in-out infinite alternate;
}

@keyframes mouthTalk {
  0% { transform: scaleY(0.6) translateY(2px); }
  100% { transform: scaleY(1.4) translateY(-1px); }
}

// ===== 加载指示 =====
.dh-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #a8a29e;

  &__spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid #e7e5e4;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__text {
    font-size: 13px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ===== 音频波形 =====
.dh-waveform {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  margin-top: 4px;

  &__bar {
    width: 3px;
    height: 6px;
    border-radius: 2px;
    background: #4caf50;
    animation: waveformBounce 0.8s ease-in-out infinite alternate;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
    &:nth-child(4) { animation-delay: 0.45s; }
    &:nth-child(5) { animation-delay: 0.6s; }
  }
}

@keyframes waveformBounce {
  0% { height: 4px; opacity: 0.4; }
  50% { height: 20px; opacity: 1; }
  100% { height: 8px; opacity: 0.6; }
}

// ===== 字幕 =====
.dh-subtitle {
  margin-top: 6px;
  max-width: 260px;
  text-align: center;

  &__text {
    font-size: 12.5px;
    color: #44403c;
    line-height: 1.5;
    word-break: break-word;
  }
}

// ===== 状态指示 =====
.dh-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #999;

    &--speaking {
      background: #4caf50;
      animation: pulse 1s ease-in-out infinite;
    }

    &--idle { background: #ffc107; }
    &--ready { background: #2196f3; }
    &--live {
      background: linear-gradient(135deg, #667eea, #764ba2);
      box-shadow: 0 0 6px rgba(102, 126, 234, 0.5);
    }
  }

  &__label {
    font-size: 11px;
    color: #78716c;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.2); }
}
</style>
