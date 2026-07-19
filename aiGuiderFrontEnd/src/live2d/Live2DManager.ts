// ============================================================
// Live2DManager — Live2D 模型管理核心
//
// 职责:
//  1. 模型加载 & WebGL 渲染
//  2. 动画播放 (hello / idle / ...)
//  3. 视线跟踪 (头部 + 眼球跟随触点)
//  4. 口型同步 (TTS 音频驱动 ParamMouthOpenY)
//  5. 呼吸 & 自动眨眼
// ============================================================

import { loadCubismPlatform, createMoc, createMotion, createRenderer, isPlatformReady } from './Live2DPlatform'
import type {
  ICubismModel,
  ICubismMotion,
  ICubismRenderer,
  LipSyncConfig,
  LookTrackingConfig,
  Live2DPlatformState,
} from './types'
import { CUBISM_PARAMS } from './types'
import { CubismMatrix44 } from './math/cubismmatrix44'

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_LIPSYNC: LipSyncConfig = {
  smoothing: 0.35,
  threshold: 0.02,
  maxMouthValue: 0.85,
}

const DEFAULT_LOOK_TRACKING: LookTrackingConfig = {
  enabled: true,
  headSensitivity: 8.0,
  eyeSensitivity: 12.0,
  smoothing: 0.12,
  maxHeadAngle: 25,
}

// ============================================================
// Live2DManager
// ============================================================

export class Live2DManager {
  // ---- DOM ----
  private canvas: HTMLCanvasElement | null = null
  private gl: WebGLRenderingContext | null = null

  // ---- Cubism 对象 ----
  private model: ICubismModel | null = null
  private renderer: ICubismRenderer | null = null
  private motions: Map<string, ICubismMotion> = new Map()
  private currentMotionName: string | null = null
  private currentMotion: ICubismMotion | null = null

  // ---- 渲染循环 ----
  private animFrameId: number | null = null
  private lastTimeMs: number = 0
  private deltaTimeSec: number = 0

  // ---- 视线跟踪 ----
  private lookTargetX = 0
  private lookTargetY = 0
  private currentLookX = 0
  private currentLookY = 0
  private currentEyeX = 0
  private currentEyeY = 0
  private lookConfig: LookTrackingConfig = { ...DEFAULT_LOOK_TRACKING }

  // ---- 口型 ----
  private mouthValue = 0
  private targetMouthValue = 0
  private lipSyncConfig: LipSyncConfig = { ...DEFAULT_LIPSYNC }
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private audioSource: MediaElementAudioSourceNode | null = null
  private lipSyncInterval: ReturnType<typeof setInterval> | null = null

  // ---- 呼吸 ----
  private breathPhase = 0

  // ---- 眨眼 ----
  private blinkTimer: ReturnType<typeof setInterval> | null = null
  private isBlinking = false

  // ---- 状态 ----
  private platformState: Live2DPlatformState = 'unloaded'
  private _isInitialized = false

  // ---- 回调 ----
  private onPlatformReady: (() => void) | null = null
  private onError: ((err: Error) => void) | null = null

  // ============================================================
  // 公开 API
  // ============================================================

  get isInitialized(): boolean {
    return this._isInitialized
  }

  get state(): Live2DPlatformState {
    return this.platformState
  }

  /**
   * 初始化：绑定 Canvas + 加载 SDK + 加载模型
   */
  async initialize(
    canvas: HTMLCanvasElement,
    modelPath: string,
    animationPath?: string,
  ): Promise<void> {
    if (this._isInitialized) return

    this.canvas = canvas
    this.platformState = 'loading'

    // 1. 初始化 WebGL
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    })
    if (!gl) throw new Error('[Live2D] WebGL 不可用')
    this.gl = gl

    // 2. 加载 Cubism 5 平台
    const platformOk = await loadCubismPlatform()
    if (!platformOk) {
      this.platformState = 'error'
      throw new Error('[Live2D] Cubism 5 SDK 加载失败')
    }

    // 3. 加载模型
    await this.loadModel(modelPath)

    // 4. 加载动画
    if (animationPath) {
      await this.loadAnimation('default', animationPath)
    }

    // 5. 启动渲染循环
    this.startRenderLoop()
    this.startBlinkTimer()
    this.startBreath()

    this._isInitialized = true
    this.platformState = 'ready'
    this.onPlatformReady?.()

    console.log('[Live2D] ✓ 初始化完成')
  }

  /**
   * 播放动画
   * @param name 动画名称 (0-based index as string, or motion group name)
   * @param loop 是否循环
   */
  playMotion(name: string, loop = false): void {
    if (!this.model) return

    // 尝试按名称查找，否则按索引
    let motion = this.motions.get(name)
    if (!motion) {
      // 兼容索引号
      const keys = Array.from(this.motions.keys())
      const idx = parseInt(name, 10)
      if (!isNaN(idx) && idx < keys.length) {
        motion = this.motions.get(keys[idx]!)
      }
    }

    if (!motion) {
      console.warn(`[Live2D] 动画 "${name}" 未找到，可用:`, Array.from(this.motions.keys()))
      return
    }

    this.currentMotion = motion
    this.currentMotionName = name
    motion.setLoop(loop)
    this.isBlinking = false // 播放动画时暂停自动眨眼
  }

  /**
   * 播放 hello 动画 (入口专用)
   */
  playHello(): void {
    // 尝试索引 0 或名为 "hello" 的动画
    this.playMotion('hello', false)
    // hello 播完后切 idle
    if (this.currentMotion) {
      this.currentMotion.setFinishedMotionHandler(() => {
        this.playIdle()
      })
    }
  }

  /**
   * 播放 idle 动画 (常态)
   */
  playIdle(): void {
    this.playMotion('idle', true)
    if (!this.currentMotion || this.currentMotion.isFinished()) {
      // idle 未找到，尝试索引 1
      this.playMotion('1', true)
    }
  }

  /**
   * 设置视线目标 (归一化坐标 -1..1)
   */
  setLookTarget(x: number, y: number): void {
    this.lookTargetX = Math.max(-1, Math.min(1, x))
    this.lookTargetY = Math.max(-1, Math.min(1, y))
  }

  /**
   * 启用/禁用视线跟踪
   */
  setLookTrackingEnabled(enabled: boolean): void {
    this.lookConfig.enabled = enabled
    if (!enabled) {
      this.lookTargetX = 0
      this.lookTargetY = 0
    }
  }

  /**
   * 设置视线跟踪参数
   */
  setLookTrackingConfig(config: Partial<LookTrackingConfig>): void {
    Object.assign(this.lookConfig, config)
  }

  /**
   * 直接设置嘴巴张开程度 (0..1)
   */
  setMouthOpen(value: number): void {
    this.targetMouthValue = Math.max(0, Math.min(1, value))
  }

  /**
   * 连接 HTML Audio 元素进行实时口型分析
   */
  connectAudioSource(audio: HTMLAudioElement): void {
    this.disconnectAudioSource()

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.5

      this.audioSource = this.audioContext.createMediaElementSource(audio)
      this.audioSource.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)

      // 每 50ms 采样分析
      this.lipSyncInterval = setInterval(() => this.analyzeAudio(), 50)

      console.log('[Live2D] ✓ 音频分析已连接')
    } catch (err) {
      console.warn('[Live2D] 音频分析连接失败:', err)
    }
  }

  /**
   * 断开音频分析
   */
  disconnectAudioSource(): void {
    if (this.lipSyncInterval) {
      clearInterval(this.lipSyncInterval)
      this.lipSyncInterval = null
    }
    this.audioSource?.disconnect()
    this.analyser?.disconnect()
    this.audioContext?.close().catch(() => {})
    this.audioSource = null
    this.analyser = null
    this.audioContext = null
  }

  /**
   * 设置口型同步配置
   */
  setLipSyncConfig(config: Partial<LipSyncConfig>): void {
    Object.assign(this.lipSyncConfig, config)
  }

  /**
   * 销毁 & 释放所有资源
   */
  destroy(): void {
    this.stopRenderLoop()
    this.stopBlinkTimer()
    this.disconnectAudioSource()

    this.renderer = null
    this.model = null
    this.motions.clear()
    this.currentMotion = null
    this._isInitialized = false
    this.platformState = 'unloaded'
  }

  /**
   * 手动 tick 一帧 (外部控制渲染时使用)
   */
  tick(deltaMs: number): void {
    this.update(deltaMs / 1000)
    this.draw()
  }

  setOnPlatformReady(cb: () => void): void {
    this.onPlatformReady = cb
    if (this.platformState === 'ready') cb()
  }

  setOnError(cb: (err: Error) => void): void {
    this.onError = cb
  }

  // ============================================================
  // 内部：模型加载
  // ============================================================

  private async loadModel(modelPath: string): Promise<void> {
    const resp = await fetch(modelPath)
    if (!resp.ok) throw new Error(`[Live2D] 模型加载失败 HTTP ${resp.status}: ${modelPath}`)
    const arrayBuffer = await resp.arrayBuffer()

    // 通过 CubismMoc 创建模型
    const moc = createMoc(arrayBuffer)
    this.model = moc.createModel()

    // 创建 WebGL 渲染器
    const renderer = createRenderer()
    renderer.initialize(this.model)

    // 注入 WebGL 上下文 (SDK 要求)
    renderer.startUp(this.gl!)

    // 设置预乘 Alpha，匹配 blend 模式
    renderer.setIsPremultipliedAlpha(true)

    // ---- 构建 MVP 矩阵 ----
    // 将模型坐标映射到 Canvas 像素空间
    this.setupProjection()

    this.renderer = renderer

    console.log(`[Live2D] ✓ 模型加载完成: ${modelPath}`)
  }

  /**
   * 设置正交投影矩阵，将模型的像素坐标空间映射到 Canvas。
   * 模型居中显示，等比缩放适配 Canvas 尺寸。
   *
   * CubismMatrix44 的方法采用 LEFT 乘法：
   *   M_new = Operator * M_current
   * 因此顶点变换从右向左读（最后调用的最先作用于顶点）。
   */
  private setupProjection(): void {
    if (!this.canvas || !this.renderer || !this.model) return

    const canvasW = this.canvas.width
    const canvasH = this.canvas.height
    const modelW = this.model.getCanvasWidth()
    const modelH = this.model.getCanvasHeight()

    if (modelW <= 0 || modelH <= 0) return

    // 等比缩放，取较小的缩放比
    const fitScale = Math.min(canvasW / modelW, canvasH / modelH)
    const offsetX = (canvasW - modelW * fitScale) * 0.5
    const offsetY = (canvasH - modelH * fitScale) * 0.5

    const projection = new CubismMatrix44()
    projection.loadIdentity()

    // 构建顶点变换链（从右向左读）：
    // 4. NDC 映射:  pixel → [-1, 1], 即 pixel * 2/canvasSize - 1
    projection.translateRelative(-1.0, -1.0)
    projection.scaleRelative(2.0 / canvasW, 2.0 / canvasH)

    // 3. 居中偏移 (像素)
    projection.translateRelative(offsetX, offsetY)

    // 2. 缩放适配
    projection.scaleRelative(fitScale, fitScale)

    this.renderer.setMvpMatrix(projection.getArray())
  }

  private async loadAnimation(name: string, path: string): Promise<void> {
    try {
      const resp = await fetch(path)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const arrayBuffer = await resp.arrayBuffer()
      const motion = createMotion(arrayBuffer)
      this.motions.set(name, motion)
      console.log(`[Live2D] ✓ 动画加载: ${name} (${path})`)
    } catch (err) {
      console.warn(`[Live2D] 动画加载失败 "${name}":`, err)
    }
  }

  // ============================================================
  // 内部：渲染循环
  // ============================================================

  private startRenderLoop(): void {
    if (this.animFrameId) return
    this.lastTimeMs = performance.now()

    const loop = (nowMs: number) => {
      const delta = nowMs - this.lastTimeMs
      this.lastTimeMs = nowMs

      // 限制最大 delta 避免跳帧
      const clampedDelta = Math.min(delta, 66) // ~15fps floor
      this.deltaTimeSec = clampedDelta / 1000

      this.update(this.deltaTimeSec)
      this.draw()

      this.animFrameId = requestAnimationFrame(loop)
    }

    this.animFrameId = requestAnimationFrame(loop)
  }

  private stopRenderLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  // ============================================================
  // 内部：每帧更新
  // ============================================================

  private update(dt: number): void {
    if (!this.model) return

    // ---- 1. 视线跟踪 ----
    this.updateLookTarget(dt)

    // ---- 2. 口型平滑 ----
    this.updateMouth(dt)

    // ---- 3. 呼吸 ----
    this.updateBreath(dt)

    // ---- 4. 动画更新 ----
    this.updateMotion(dt)

    // ---- 5. 提交参数到模型 ----
    this.applyParameters()

    // ---- 6. 模型内部更新 ----
    this.model.update()
  }

  private updateLookTarget(_dt: number): void {
    if (!this.lookConfig.enabled) return

    const s = this.lookConfig.smoothing

    // 头部角度：大范围跟随
    this.currentLookX += (this.lookTargetX * this.lookConfig.headSensitivity - this.currentLookX) * s
    this.currentLookY += (this.lookTargetY * this.lookConfig.headSensitivity - this.currentLookY) * s

    // 眼球角度：更灵敏的小范围跟随
    this.currentEyeX += (this.lookTargetX * this.lookConfig.eyeSensitivity - this.currentEyeX) * s * 1.5
    this.currentEyeY += (this.lookTargetY * this.lookConfig.eyeSensitivity - this.currentEyeY) * s * 1.5

    // 限制头部角度范围
    const maxA = this.lookConfig.maxHeadAngle
    this.currentLookX = Math.max(-maxA, Math.min(maxA, this.currentLookX))
    this.currentLookY = Math.max(-maxA, Math.min(maxA, this.currentLookY))
  }

  private updateMouth(_dt: number): void {
    const cfg = this.lipSyncConfig
    // 平滑过渡
    this.mouthValue += (this.targetMouthValue - this.mouthValue) * cfg.smoothing
    if (this.mouthValue < cfg.threshold) this.mouthValue = 0
  }

  private updateBreath(dt: number): void {
    this.breathPhase += dt * 0.8 // 呼吸周期约 7-8 秒
  }

  private updateMotion(dt: number): void {
    if (!this.currentMotion || !this.model) return
    this.currentMotion.updateMotion(this.model, dt)
  }

  private applyParameters(): void {
    if (!this.model) return

    const m = this.model
    const setP = (id: string, value: number) => {
      try { m.setParameterValueById(id, value) } catch { /* 参数不存在时静默 */ }
    }

    // 头部旋转
    setP(CUBISM_PARAMS.ANGLE_X, this.currentLookX)
    setP(CUBISM_PARAMS.ANGLE_Y, this.currentLookY)

    // 眼球方向
    setP(CUBISM_PARAMS.EYE_BALL_X, this.currentEyeX)
    setP(CUBISM_PARAMS.EYE_BALL_Y, this.currentEyeY)

    // 口型
    setP(CUBISM_PARAMS.MOUTH_OPEN_Y, this.mouthValue)

    // 呼吸 (身体微动)
    const breathVal = Math.sin(this.breathPhase) * 1.5
    setP(CUBISM_PARAMS.BREATH, breathVal)
  }

  // ============================================================
  // 内部：绘制
  // ============================================================

  private draw(): void {
    const gl = this.gl
    if (!gl || !this.renderer || !this.model) return

    // 清屏
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // 设置视口
    if (this.canvas) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // 使用模型自带的 MVP 矩阵绘制
    this.renderer.drawModel()
  }

  // ============================================================
  // 内部：音频分析 (口型驱动)
  // ============================================================

  private analyzeAudio(): void {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(dataArray)

    // 计算 RMS 音量
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i]! - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)

    // 映射到口型 (0..1)，非线性增强
    const mouthOpen = Math.min(1, rms * 3.5)
    this.setMouthOpen(mouthOpen * this.lipSyncConfig.maxMouthValue)
  }

  // ============================================================
  // 内部：自动眨眼
  // ============================================================

  private startBlinkTimer(): void {
    this.scheduleNextBlink()
  }

  private stopBlinkTimer(): void {
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer)
      this.blinkTimer = null
    }
  }

  private scheduleNextBlink(): void {
    if (this.blinkTimer) clearTimeout(this.blinkTimer)
    // 随机间隔 2-6 秒
    const delay = 2000 + Math.random() * 4000
    this.blinkTimer = setTimeout(() => {
      this.doBlink()
    }, delay)
  }

  private doBlink(): void {
    if (!this.model || this.isBlinking) {
      this.scheduleNextBlink()
      return
    }

    this.isBlinking = true
    const model = this.model
    const setP = (id: string, v: number) => { try { model.setParameterValueById(id, v) } catch { /* */ } }

    const blinkDuration = 150
    const blinkClose = 80
    const startTime = performance.now()

    const animateBlink = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / blinkDuration)

      // 闭眼曲线
      let eyeValue: number
      if (progress < blinkClose / blinkDuration) {
        // 闭合阶段
        eyeValue = (progress / (blinkClose / blinkDuration))
      } else {
        // 睁开阶段
        eyeValue = 1 - ((progress - blinkClose / blinkDuration) / (1 - blinkClose / blinkDuration))
      }
      eyeValue = Math.max(0, Math.min(1, eyeValue))

      setP(CUBISM_PARAMS.EYE_OPEN_L, 1 - eyeValue * 0.95)
      setP(CUBISM_PARAMS.EYE_OPEN_R, 1 - eyeValue * 0.95)

      if (progress < 1) {
        requestAnimationFrame(animateBlink)
      } else {
        // 恢复
        setP(CUBISM_PARAMS.EYE_OPEN_L, 0)
        setP(CUBISM_PARAMS.EYE_OPEN_R, 0)
        this.isBlinking = false
        this.scheduleNextBlink()
      }
    }

    requestAnimationFrame(animateBlink)
  }

  private startBreath(): void {
    this.breathPhase = Math.random() * Math.PI * 2
  }
}
