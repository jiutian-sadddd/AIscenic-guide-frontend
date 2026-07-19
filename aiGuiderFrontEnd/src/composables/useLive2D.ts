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
import type { Live2DModelSetup } from '@/live2d/Live2DManager'
import type { LookTrackingConfig, LipSyncConfig } from '@/live2d/types'

export interface UseLive2DOptions {
  /** 模型配置 (目录、文件名、动画映射) */
  modelSetup: Live2DModelSetup
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

  // ---- 并发锁 (防止重复初始化) ----
  let initPromise: Promise<void> | null = null

  // ---- 初始化 ----
  async function init(): Promise<void> {
    // 如果已有初始化在进行中，返回同一个 Promise
    if (initPromise) return initPromise

    const canvas = options.canvasRef.value
    if (!canvas) {
      // Canvas 尚未挂载，等待
      return
    }

    if (manager.isInitialized) {
      // 已经初始化完成，跳过（destroy() 会重置状态）
      return
    }

    // 获取 canvas 的 CSS 布局尺寸
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight

    // 如果 CSS 尺寸为 0，说明元素尚未完成布局，稍后重试
    if (displayWidth <= 0 || displayHeight <= 0) {
      console.warn('[useLive2D] canvas CSS 尺寸为 0，等待布局完成...')
      return
    }

    initPromise = (async () => {
      try {
        const dpr = window.devicePixelRatio || 2
        // 设置 canvas 物理像素尺寸
        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr

        await manager.initialize(canvas, options.modelSetup)

        if (options.lookTracking) {
          manager.setLookTrackingConfig(options.lookTracking)
        }
        if (options.lipSync) {
          manager.setLipSyncConfig(options.lipSync)
        }

        isReady.value = true
        isError.value = false
        errorMessage.value = ''

        // 启动 hello
        if (options.autoIdle !== false) {
          manager.playHello()
        }
      } catch (err) {
        isError.value = true
        errorMessage.value = (err as Error).message
        console.error('[useLive2D] 初始化失败:', err)
      } finally {
        initPromise = null
      }
    })()

    return initPromise
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
   * 押下中のみ視線を向け、離した瞬間に idle へ戻る。
   */
  function bindLookTracking(targetEl?: HTMLElement | null): void {
    const el = targetEl || options.canvasRef.value
    if (!el) return

    const handleInteraction = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const nx = ((clientX - cx) / (rect.width / 2)) * 1.2
      const ny = ((clientY - cy) / (rect.height / 2)) * 1.2
      manager.setLookTarget(Math.max(-1, Math.min(1, nx)), -Math.max(-1, Math.min(1, ny)))
    }

    const returnToIdle = () => {
      manager.setLookTarget(0, 0)
      manager.playIdle()
    }

    // 鼠标按下 → 看向点击位置；松开 → 回归 idle
    el.addEventListener('mousedown', (e: MouseEvent) => {
      handleInteraction(e.clientX, e.clientY)
    })
    el.addEventListener('mouseup', returnToIdle)
    // 鼠标移出区域也回归
    el.addEventListener('mouseleave', returnToIdle)

    // 触摸开始 → 看向触点；触摸结束 → 回归 idle
    el.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleInteraction(e.touches[0]!.clientX, e.touches[0]!.clientY)
      }
    }, { passive: true })
    el.addEventListener('touchend', returnToIdle)
    el.addEventListener('touchcancel', returnToIdle)
  }

  // ---- 流式文本模拟口型 (无音频时) ----
  let streamCharTimer: ReturnType<typeof setInterval> | null = null

  /**
   * AI 文本流式生成時の口型アニメーション。
   * 複数周波数の合成 + ランダムな「単語間ポーズ」で自然な口の動きをシミュレート。
   */
  function startStreamLipSync(): void {
    if (streamCharTimer) return // すでに実行中
    isSpeaking.value = true

    let phase = Math.random() * Math.PI * 2
    // 口を閉じる「ポーズ」用
    let pauseUntil = 0
    let pauseCounter = 0

    streamCharTimer = setInterval(() => {
      phase += 0.25

      // 一定間隔で短いポーズ（口を閉じる）を入れて単語の切れ目を表現
      pauseCounter++
      if (pauseCounter > 12 && Math.random() < 0.3) {
        pauseUntil = phase + 0.4 + Math.random() * 0.6
        pauseCounter = 0
      }

      let mouthVal: number
      if (phase < pauseUntil) {
        // ポーズ中：口をほぼ閉じる
        mouthVal = 0.02 + Math.random() * 0.04
      } else {
        // 複数周波数を合成して自然な口の開閉を表現
        const w1 = Math.abs(Math.sin(phase * 1.0)) * 0.40
        const w2 = Math.abs(Math.sin(phase * 2.7)) * 0.20
        const w3 = Math.abs(Math.sin(phase * 5.1)) * 0.10
        const noise = (Math.random() - 0.5) * 0.08
        mouthVal = 0.08 + w1 + w2 + w3 + noise
      }

      manager.setMouthOpen(Math.max(0, Math.min(0.85, mouthVal)))
    }, 66) // ~15fps で十分
  }

  function stopStreamLipSync(): void {
    if (streamCharTimer) {
      clearInterval(streamCharTimer)
      streamCharTimer = null
    }
    isSpeaking.value = false
    // なめらかに口を閉じる
    manager.setMouthOpen(0)
  }

  // ---- 销毁 ----
  let destroyed = false

  function destroy(): void {
    if (destroyed) return
    destroyed = true

    // 取消进行中的初始化
    initPromise = null

    stopStreamLipSync()
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    manager.destroy()
    isReady.value = false
    isError.value = false
    errorMessage.value = ''
  }

  onBeforeUnmount(() => {
    destroy()
  })

  // ---- Canvas 尺寸监听 (响应窗口/布局变化) ----
  let resizeObserver: ResizeObserver | null = null

  watch(
    () => options.canvasRef.value,
    (canvas, oldCanvas) => {
      // Canvas 元素被替换了（v-if 重建等场景）
      if (oldCanvas && oldCanvas !== canvas) {
        console.log('[useLive2D] Canvas 引用变更，清理旧资源')
        destroy()
        // 重置 destroyed 标志以允许重新初始化
        destroyed = false
      }

      if (canvas && !isReady.value && !isError.value) {
        init()
      }

      // 设置 ResizeObserver 监听 canvas 父容器尺寸变化
      if (canvas && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (!isReady.value || !canvas) return
          const displayW = canvas.clientWidth
          const displayH = canvas.clientHeight
          if (displayW <= 0 || displayH <= 0) return
          const dpr = window.devicePixelRatio || 2
          const newW = displayW * dpr
          const newH = displayH * dpr
          if (canvas.width !== newW || canvas.height !== newH) {
            canvas.width = newW
            canvas.height = newH
          }
        })
        resizeObserver.observe(canvas)
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
