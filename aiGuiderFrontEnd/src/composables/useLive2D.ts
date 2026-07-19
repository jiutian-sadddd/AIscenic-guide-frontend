// ============================================================
// useLive2D — Vue 3 Composable
//
// 将 Live2DManager 连接至 Vue 响应式系统：
//  - 触摸/鼠标事件 → 视线跟踪
//  - TTS 音频 Element → 口型驱动
//  - 流式文本 → 口型模拟 (无音频时)
//  - 动画控制 (hello / idle)
//  - Canvas resize 适配
// ============================================================

import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import { Live2DManager } from '@/live2d/Live2DManager'
import type { LookTrackingConfig, LipSyncConfig } from '@/live2d/types'

export interface UseLive2DOptions {
  /** 模型文件路径 */
  modelPath: string
  /** 动画文件路径 */
  animationPath?: string
  /** Canvas 引用 */
  canvasRef: Ref<HTMLCanvasElement | null>
  /** 视线跟踪配置 */
  lookTracking?: Partial<LookTrackingConfig>
  /** 口型同步配置 */
  lipSync?: Partial<LipSyncConfig>
  /** 是否自动播放 idle */
  autoIdle?: boolean
}

export function useLive2D(options: UseLive2DOptions) {
  const manager = new Live2DManager()

  // ---- 响应式状态 ----
  const isReady = ref(false)
  const isError = ref(false)
  const errorMessage = ref('')
  const isSpeaking = ref(false)
  const currentAnimation = ref('')

  // ---- 初始化 ----
  async function init(): Promise<void> {
    const canvas = options.canvasRef.value
    if (!canvas) {
      // Canvas 尚未挂载，等待
      return
    }

    if (isReady.value || manager.isInitialized) return

    try {
      // 设置 canvas 尺寸
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 2)
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 2)

      await manager.initialize(canvas, options.modelPath, options.animationPath)

      if (options.lookTracking) {
        manager.setLookTrackingConfig(options.lookTracking)
      }
      if (options.lipSync) {
        manager.setLipSyncConfig(options.lipSync)
      }

      isReady.value = true
      isError.value = false
      errorMessage.value = ''

      // 启动 idle
      if (options.autoIdle !== false) {
        manager.playHello()
      }
    } catch (err) {
      isError.value = true
      errorMessage.value = (err as Error).message
      console.error('[useLive2D] 初始化失败:', err)
    }
  }

  // ---- 动画控制 ----
  function playHello(): void {
    manager.playHello()
    currentAnimation.value = 'hello'
  }

  function playIdle(): void {
    manager.playIdle()
    currentAnimation.value = 'idle'
  }

  function playMotion(name: string, loop = false): void {
    manager.playMotion(name, loop)
    currentAnimation.value = name
  }

  // ---- 视线跟踪 ----
  function setLookTarget(x: number, y: number): void {
    manager.setLookTarget(x, y)
  }

  function setLookEnabled(enabled: boolean): void {
    manager.setLookTrackingEnabled(enabled)
  }

  function setLookConfig(config: Partial<LookTrackingConfig>): void {
    manager.setLookTrackingConfig(config)
  }

  // ---- 口型 ----
  function setMouthOpen(value: number): void {
    manager.setMouthOpen(value)
  }

  function connectAudio(audio: HTMLAudioElement): void {
    manager.connectAudioSource(audio)
    isSpeaking.value = true
    audio.addEventListener(
      'ended',
      () => {
        isSpeaking.value = false
        manager.setMouthOpen(0)
      },
      { once: true },
    )
  }

  function disconnectAudio(): void {
    manager.disconnectAudioSource()
    isSpeaking.value = false
    manager.setMouthOpen(0)
  }

  function setLipSyncConfig(config: Partial<LipSyncConfig>): void {
    manager.setLipSyncConfig(config)
  }

  // ---- 触摸/鼠标事件处理 ----
  /**
   * 绑定 canvas 的触摸/鼠标事件用于视线跟踪。
   * 在组件 onMounted 中调用。
   */
  function bindLookTracking(targetEl?: HTMLElement | null): void {
    const el = targetEl || options.canvasRef.value
    if (!el) return

    const handleMove = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect()
      // 计算相对于 Canvas 中心的归一化坐标
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const nx = ((clientX - cx) / (rect.width / 2)) * 1.2
      const ny = ((clientY - cy) / (rect.height / 2)) * 1.2
      manager.setLookTarget(nx, -ny) // Y 轴翻转
    }

    // 触摸事件
    el.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0]!.clientX, e.touches[0]!.clientY)
      }
    }, { passive: true })

    el.addEventListener('touchend', () => {
      // 松手后缓慢回归中心
      manager.setLookTarget(0, 0)
    })

    // 鼠标事件 (PC 调试)
    el.addEventListener('mousemove', (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    })

    el.addEventListener('mouseleave', () => {
      manager.setLookTarget(0, 0)
    })
  }

  // ---- 流式文本模拟口型 (无音频时) ----
  let streamCharTimer: ReturnType<typeof setInterval> | null = null

  function startStreamLipSync(): void {
    isSpeaking.value = true
    // 模拟自然的口型变化
    let phase = 0
    streamCharTimer = setInterval(() => {
      phase += 0.3
      // 模拟说话时的口型波动
      const mouthVal = 0.15 + Math.abs(Math.sin(phase)) * 0.45 + Math.abs(Math.sin(phase * 3.7)) * 0.2
      manager.setMouthOpen(Math.min(0.85, mouthVal))
    }, 80)
  }

  function stopStreamLipSync(): void {
    if (streamCharTimer) {
      clearInterval(streamCharTimer)
      streamCharTimer = null
    }
    isSpeaking.value = false
    manager.setMouthOpen(0)
  }

  // ---- 销毁 ----
  function destroy(): void {
    stopStreamLipSync()
    manager.destroy()
    isReady.value = false
  }

  onBeforeUnmount(() => {
    destroy()
  })

  // ---- 监听 canvasRef 挂载 ----
  watch(
    () => options.canvasRef.value,
    (canvas) => {
      if (canvas && !isReady.value && !isError.value) {
        init()
      }
    },
    { immediate: true },
  )

  return {
    // state
    isReady,
    isError,
    errorMessage,
    isSpeaking,
    currentAnimation,
    manager,

    // actions
    init,
    playHello,
    playIdle,
    playMotion,
    setLookTarget,
    setLookEnabled,
    setLookConfig,
    setMouthOpen,
    connectAudio,
    disconnectAudio,
    setLipSyncConfig,
    bindLookTracking,
    startStreamLipSync,
    stopStreamLipSync,
    destroy,
  }
}
