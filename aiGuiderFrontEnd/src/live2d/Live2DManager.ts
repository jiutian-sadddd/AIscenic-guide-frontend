// ============================================================
// Live2DManager — Live2D 模型管理核心
//
// 职责:
//  1. 模型加载 & WebGL 渲染 (通过 Live2DPlatform)
//  2. 动画播放 (hello / idle / ...)
//  3. 视线跟踪 (头部 + 眼球跟随触点)
//  4. 口型同步 (TTS 音频驱动上/下唇参数)
//  5. 呼吸 & 自动眨眼
//  6. 物理更新 (头发飘动)
// ============================================================

import {
  loadCubismPlatform,
  loadLive2DModel,
  loadMotionFromJson,
} from './Live2DPlatform'
import type {
  ICubismModel,
  ICubismMotion,
  ICubismRenderer,
  LipSyncConfig,
  LookTrackingConfig,
  Live2DPlatformState,
} from './types'
import { CUBISM_PARAMS } from './types'
import { CubismMatrix44 } from './cubsim5/math/cubismmatrix44'
import { CubismShaderManager_WebGL } from './cubsim5/rendering/cubismshader_webgl'

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
  maxHeadAngle: 20,
}

// ============================================================
// 模型配置
// ============================================================

export interface Live2DModelSetup {
  /** 模型目录 URL，如 '/live2d/lingxianer/' */
  modelDir: string
  /** model3.json 文件名，如 'lingxianer.model3.json' */
  modelJsonName: string
  /** 动画映射 { 名称: motion3.json 文件 URL } */
  motions?: Record<string, string>
  /**
   * 模型缩放比例 (默认 1.0)
   * - 1.0 = 等比缩放适配画布 (fit-inside)
   * - >1.0 = 放大 (如 1.2 = 放大 20%)
   */
  scale?: number
  /**
   * 模型在画布中的偏移量 (CSS 逻辑像素)
   * - 正の offsetX → 右へ移動
   * - 负の offsetY → 下へ移動（Y 轴向下）
   */
  offsetX?: number
  offsetY?: number
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
  private textures: WebGLTexture[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private moc: any = null // CubismMoc 实例，用于 release

  // ---- 偏移量 ----
  private scale: number = 1.0
  private offsetX: number = 0
  private offsetY: number = 0

  // ---- 动画 ----
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
  private blinkTimer: ReturnType<typeof setTimeout> | null = null
  private isBlinking = false

  // ---- 头发摆动 ----
  private hairWavePhase = 0

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
   * 初始化：绑定 Canvas + 加载 SDK + 加载完整模型 + 启动渲染
   *
   * @param canvas  WebGL 渲染目标 Canvas
   * @param setup   模型配置 (目录、文件名、动画映射)
   */
  async initialize(
    canvas: HTMLCanvasElement,
    setup: Live2DModelSetup,
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

    // 2. 加载 Cubism 5 SDK 框架
    const platformOk = await loadCubismPlatform()
    if (!platformOk) {
      this.platformState = 'error'
      throw new Error('[Live2D] Cubism 5 SDK 加载失败')
    }

    // 3. 加载完整模型 (model3.json → moc3 → 纹理 → 渲染器)
    const loaded = await loadLive2DModel(
      setup.modelDir,
      setup.modelJsonName,
      this.gl,
    )
    this.model = loaded.model
    this.renderer = loaded.renderer
    this.textures = loaded.textures

    // 保存缩放和偏移量配置
    this.scale = setup.scale ?? 1.0
    this.offsetX = setup.offsetX ?? 0
    this.offsetY = setup.offsetY ?? 0

    // 4. 设置投影矩阵
    this.setupProjection()

    // 5. 加载动画
    if (setup.motions) {
      for (const [name, url] of Object.entries(setup.motions)) {
        await this.loadAnimation(name, url)
      }
    }

    // 6. 启动渲染循环 & 自动行为
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
   */
  playMotion(name: string, loop = false): void {
    if (!this.model) return

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
    this.isBlinking = false
  }

  /**
   * 播放 hello 动画 (入口专用)
   */
  playHello(): void {
    this.playMotion('hello', false)
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

  setLookTrackingEnabled(enabled: boolean): void {
    this.lookConfig.enabled = enabled
    if (!enabled) {
      this.lookTargetX = 0
      this.lookTargetY = 0
    }
  }

  setLookTrackingConfig(config: Partial<LookTrackingConfig>): void {
    Object.assign(this.lookConfig, config)
  }

  /**
   * 直接设置嘴巴张开程度 (0..1)
   * 会同时驱动上唇(upmouthOC)和下唇(downmouthOC)
   */
  setMouthOpen(value: number): void {
    this.targetMouthValue = Math.max(0, Math.min(1, value))
  }

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

      this.lipSyncInterval = setInterval(() => this.analyzeAudio(), 50)

      console.log('[Live2D] ✓ 音频分析已连接')
    } catch (err) {
      console.warn('[Live2D] 音频分析连接失败:', err)
    }
  }

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

  setLipSyncConfig(config: Partial<LipSyncConfig>): void {
    Object.assign(this.lipSyncConfig, config)
  }

  destroy(): void {
    this.stopRenderLoop()
    this.stopBlinkTimer()
    this.disconnectAudioSource()

    // ---- 1. 释放渲染器 (包含 WebGL Buffer、RenderTarget 等) ----
    if (this.renderer && this.gl) {
      try {
        // CubismRenderer_WebGL.release() 会删除:
        //   - vertex/uv/index buffers
        //   - model render targets (framebuffers)
        //   - drawable masks
        //   - offscreen resources
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const realRenderer = (this.renderer as unknown as { _real?: { release?: () => void } })._real
        if (realRenderer?.release) {
          realRenderer.release()
        }
      } catch (err) {
        console.warn('[Live2D] 渲染器释放异常:', err)
      }
    }

    // ---- 2. 删除 WebGL 纹理 ----
    if (this.gl) {
      for (const tex of this.textures) {
        try { this.gl.deleteTexture(tex) } catch { /* context may be lost */ }
      }
    }
    this.textures = []

    // ---- 3. シングルトンからこの GL Context の Shader を削除 ----
    if (this.gl) {
      try {
        CubismShaderManager_WebGL.getInstance().releaseShaderForContext(this.gl)
      } catch { /* */ }
    }

    // ---- 4. 释放 WebGL Context (丢失上下文扩展) ----
    if (this.gl) {
      const loseContextExt = this.gl.getExtension('WEBGL_lose_context')
      if (loseContextExt) {
        try { loseContextExt.loseContext() } catch { /* */ }
      }
    }

    // ---- 5. 清空所有引用 ----
    this.renderer = null
    this.model = null
    this.gl = null
    this.canvas = null
    this.moc = null
    this.motions.clear()
    this.currentMotion = null
    this._isInitialized = false
    this.platformState = 'unloaded'

    console.log('[Live2D] ✓ 资源已释放')
  }

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

  private async loadAnimation(name: string, url: string): Promise<void> {
    const motion = await loadMotionFromJson(url, name)
    if (motion) {
      this.motions.set(name, motion)
    }
  }

  // ============================================================
  // 内部：投影矩阵设置
  // ============================================================

  private setupProjection(): void {
    if (!this.canvas || !this.renderer || !this.model) return

    const canvasW = this.canvas.width
    const canvasH = this.canvas.height
    const modelW = this.model.getCanvasWidth()
    const modelH = this.model.getCanvasHeight()

    if (modelW <= 0 || modelH <= 0) return

    const dpr = window.devicePixelRatio || 2

    // 基础缩放：等比适配画布
    const fitScale = Math.min(canvasW / modelW, canvasH / modelH)
    // 应用用户缩放倍数
    const finalScale = fitScale * this.scale

    // 居中偏移：
    //   model 座標系原点 = (0,0) 在左上角
    //   モデルの中心 (modelW/2, modelH/2) が Canvas の中心に来るように計算
    const centerOffsetX = (canvasW - modelW * finalScale) * 0.5
    const centerOffsetY = (canvasH - modelH * finalScale) * 0.5

    // 加上用户自定义偏移（CSS 逻辑像素 → 物理像素）
    const userOffsetX = this.offsetX * dpr
    const userOffsetY = this.offsetY * dpr

    const totalOffsetX = centerOffsetX + userOffsetX
    const totalOffsetY = centerOffsetY + userOffsetY

    const projection = new CubismMatrix44()
    projection.loadIdentity()

    // 顶点变换链（从右向左读，列优先矩阵）：
    // Step 4: NDC 映射 — pixel 座標 → [-1, 1]
    projection.translateRelative(-1.0, -1.0)
    projection.scaleRelative(2.0 / canvasW, 2.0 / canvasH)

    // Step 3: 居中 + 用户偏移
    projection.translateRelative(totalOffsetX, totalOffsetY)

    // Step 2: 缩放
    projection.scaleRelative(finalScale, finalScale)

    this.renderer.setMvpMatrix(projection.getArray())
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

      // 限制最大 delta 避免跳帧 (~15fps floor)
      const clampedDelta = Math.min(delta, 66)
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

    // ---- 4. 头发飘逸 ----
    this.updateHairWave(dt)

    // ---- 5. 动画更新 ----
    this.updateMotion(dt)

    // ---- 6. 提交参数到模型 ----
    this.applyParameters()

    // ---- 8. 模型内部更新（Core 更新のみ、フラグリセットは draw 後） ----
    if (this.model.updateCore) {
      this.model.updateCore()
    } else {
      this.model.update()
    }
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
    this.mouthValue += (this.targetMouthValue - this.mouthValue) * cfg.smoothing
    if (this.mouthValue < cfg.threshold) this.mouthValue = 0
  }

  private updateBreath(dt: number): void {
    this.breathPhase += dt * 0.8 // 呼吸周期约 7-8 秒
  }

  private updateHairWave(dt: number): void {
    this.hairWavePhase += dt * 1.2
  }

  private updateMotion(dt: number): void {
    if (!this.currentMotion || !this.model) return
    this.currentMotion.updateMotion(this.model, dt)
  }

  // ============================================================
  // 内部：参数提交
  // ============================================================

  private applyParameters(): void {
    if (!this.model) return

    const m = this.model
    const setP = (id: string, value: number) => {
      try { m.setParameterValueById(id, value) } catch { /* 参数不存在时静默 */ }
    }

    // ---- 头部旋转 ----
    setP(CUBISM_PARAMS.ANGLE_X, this.currentLookX)
    setP(CUBISM_PARAMS.ANGLE_Y, this.currentLookY)

    // ---- 眼球方向 ----
    setP(CUBISM_PARAMS.EYE_BALL_X, this.currentEyeX)
    setP(CUBISM_PARAMS.EYE_BALL_Y, this.currentEyeY)

    // ---- 口型 (同时驱动上唇和下唇) ----
    setP(CUBISM_PARAMS.MOUTH_OPEN_Y, this.mouthValue)
    setP(CUBISM_PARAMS.MOUTH_OPEN_YL, this.mouthValue * 0.9)

    // ---- 呼吸 ----
    const breathVal = Math.sin(this.breathPhase) * 0.6 + 0.5
    setP(CUBISM_PARAMS.BREATH, breathVal)

    // ---- 身体微动 ----
    const bodySway = Math.sin(this.breathPhase * 1.3) * 1.5
    setP(CUBISM_PARAMS.BODY_ANGLE_X, bodySway)

    // ---- 头发飘逸 (叠加在物理之上，增加生动感) ----
    const hairBack = Math.sin(this.hairWavePhase) * 0.15
    const hairSide = Math.sin(this.hairWavePhase * 1.3) * 0.12
    const hairFront = Math.sin(this.hairWavePhase * 0.9 + 0.5) * 0.1
    setP(CUBISM_PARAMS.HAIR_BACK, hairBack)
    setP(CUBISM_PARAMS.HAIR_SIDE, hairSide)
    setP(CUBISM_PARAMS.HAIR_FRONT, hairFront)
  }

  // ============================================================
  // 内部：绘制
  // ============================================================

  private draw(): void {
    const gl = this.gl
    if (!gl || !this.renderer || !this.model || !this.canvas) return

    const canvasW = this.canvas.width
    const canvasH = this.canvas.height
    if (canvasW <= 0 || canvasH <= 0) return

    // 设置渲染状态：绑定默认 framebuffer 并告知 renderer 视口尺寸
    this.renderer.setRenderState(null, [0, 0, canvasW, canvasH])

    // 清屏
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    this.renderer.drawModel()

    // drawModel 内で頂点変更フラグを消費したので、ここでリセット
    this.model?.resetDynamicFlags?.()
  }

  // ============================================================
  // 内部：音频分析 (口型驱动)
  // ============================================================

  private analyzeAudio(): void {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i]! - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)

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

      let eyeValue: number
      if (progress < blinkClose / blinkDuration) {
        // 闭合阶段: 1 → 0
        eyeValue = 1 - (progress / (blinkClose / blinkDuration))
      } else {
        // 睁开阶段: 0 → 1
        eyeValue = (progress - blinkClose / blinkDuration) / (1 - blinkClose / blinkDuration)
      }
      eyeValue = Math.max(0, Math.min(1, eyeValue))

      // 使用模型自定义参数：eyeballROC(右), eyeballLOC(左)
      // 值为 0 闭眼，1 默认睁开
      setP(CUBISM_PARAMS.EYE_OPEN_L, eyeValue)
      setP(CUBISM_PARAMS.EYE_OPEN_R, eyeValue)

      if (progress < 1) {
        requestAnimationFrame(animateBlink)
      } else {
        // 恢复到默认值 1
        setP(CUBISM_PARAMS.EYE_OPEN_L, 1)
        setP(CUBISM_PARAMS.EYE_OPEN_R, 1)
        this.isBlinking = false
        this.scheduleNextBlink()
      }
    }

    requestAnimationFrame(animateBlink)
  }

  private startBreath(): void {
    this.breathPhase = Math.random() * Math.PI * 2
    this.hairWavePhase = Math.random() * Math.PI * 2
  }
}
