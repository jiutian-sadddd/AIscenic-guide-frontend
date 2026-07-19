// ============================================================
// Live2DPlatform — Cubism 5 SDK 加载 & 适配层
//
// SDK 文件位于 src/live2d/ 下（从 Cubism 5 SDK for Web 的
// Framework/src/ 复制而来，保留原始子目录结构）。
// Core: public/live2d/live2dcubismcore.min.js
// ============================================================

import type {
  ICubismModel,
  ICubismMoc,
  ICubismMotion,
  ICubismRenderer,
} from './types'

// ---- SDK 真实类型 (动态加载后赋值) ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CubismFramework: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CubismMocClass: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CubismMotionClass: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CubismRendererClass: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CubismMotionManagerClass: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CubismIdManager: any = null

// ============================================================
// CubismId 字符串 → CubismIdHandle 缓存
// SDK 中所有参数/部件 ID 必须为 CubismIdHandle 类型
// ============================================================

const idHandleCache = new Map<string, unknown>()

function toCubismId(idStr: string): unknown {
  let handle = idHandleCache.get(idStr)
  if (!handle) {
    handle = CubismIdManager.getId(idStr)
    idHandleCache.set(idStr, handle)
  }
  return handle
}

// ============================================================
// ICubismModel 适配器 — 自动将 string ID 转为 CubismIdHandle
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapModel(realModel: any): ICubismModel {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _real: realModel,

    update(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel.update()
    },

    draw(_matrix: Float32Array): void {
      // CubismModel 不直接 draw，由 Renderer 负责
    },

    setParameterValueById(id: string, value: number, weight?: number): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel.setParameterValueById(toCubismId(id), value, weight ?? 1.0)
    },

    getParameterValueById(id: string): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getParameterValueById(toCubismId(id))
    },

    getParameterCount(): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getParameterCount()
    },

    getParameterId(index: number): string {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getParameterId(index)
    },

    getParameterIndex(id: string): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getParameterIndex(toCubismId(id))
    },

    getDrawableCount(): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getDrawableCount()
    },

    getDrawableId(index: number): string {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getDrawableId(index)
    },

    getPartCount(): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getPartCount()
    },

    getPartId(index: number): string {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getPartId(index)
    },

    setPartOpacityById(id: string, opacity: number): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel.setPartOpacityById(toCubismId(id), opacity)
    },

    getCanvasWidth(): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getCanvasWidth()
    },

    getCanvasHeight(): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realModel.getCanvasHeight()
    },

    saveParameters(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel.saveParameters()
    },

    loadParameters(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel.loadParameters()
    },
  }
}

// ============================================================
// 初始化
// ============================================================

/**
 * 动态加载 Cubism 5 SDK 框架模块
 */
export async function loadCubismPlatform(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).Live2DCubismCore === 'undefined') {
    console.warn('[Live2D] Live2DCubismCore 未加载，请在 index.html 中引入 live2dcubismcore.min.js')
    return false
  }

  try {
    const [
      frameworkMod,
      mocMod,
      motionMod,
      rendererMod,
      motionMgrMod,
    ] = await Promise.all([
      import('@/live2d/live2dcubismframework'),
      import('@/live2d/model/cubismmoc'),
      import('@/live2d/motion/cubismmotion'),
      import('@/live2d/rendering/cubismrenderer_webgl'),
      import('@/live2d/motion/cubismmotionmanager'),
    ])

    CubismFramework = frameworkMod.CubismFramework
    CubismMocClass = mocMod.CubismMoc
    CubismMotionClass = motionMod.CubismMotion
    CubismRendererClass = rendererMod.CubismRenderer_WebGL
    CubismMotionManagerClass = motionMgrMod.CubismMotionManager

    // 注意: SDK 方法名为 startUp (大写 U)
    if (!CubismFramework.isStarted()) {
      CubismFramework.startUp({
        logFunction: console.log,
        loggingLevel: frameworkMod.LogLevel?.LogLevel_Warning ?? 2,
      })
      CubismFramework.initialize()
    }

    CubismIdManager = CubismFramework.getIdManager()

    console.log('[Live2D] ✓ Cubism 5 SDK 加载成功')
    return true
  } catch (err) {
    console.warn('[Live2D] ✗ Cubism 5 框架加载失败:', err)
    return false
  }
}

// ============================================================
// 工厂方法
// ============================================================

export function createMoc(arrayBuffer: ArrayBuffer): ICubismMoc {
  if (!CubismMocClass) throw new Error('[Live2D] CubismMoc 未加载')
  // SDK: create(mocBytes, shouldCheckMocConsistency)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const realMoc = CubismMocClass.create(arrayBuffer, false)

  return {
    createModel(): ICubismModel {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const realModel = realMoc.createModel()
      return wrapModel(realModel)
    },
  }
}

export function createMotion(arrayBuffer: ArrayBuffer): ICubismMotion {
  if (!CubismMotionClass) throw new Error('[Live2D] CubismMotion 未加载')
  if (!CubismMotionManagerClass) throw new Error('[Live2D] CubismMotionManager 未加载')

  // SDK: create(buffer, size, onFinished?, onBegan?, shouldCheck?)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const realMotion = CubismMotionClass.create(
    arrayBuffer,
    arrayBuffer.byteLength,
    undefined,
    undefined,
    false,
  )

  // 使用 CubismMotionManager 管理单个动作的播放
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const manager = new CubismMotionManagerClass()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  manager.startMotion(realMotion, false)

  // SDK 的 doUpdateMotion 不会主动触发 _onFinishedMotion，
  // 因此我们在 wrapper 层自行检测完成状态
  let finishedHandler: ((self: ICubismMotion) => void) | null = null
  let wasFinished = false

  // 用闭包引用自身，以便回调中使用
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const self: ICubismMotion = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _realMotion: realMotion,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _manager: manager,

    updateMotion(model: ICubismModel, deltaTimeSeconds: number): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      manager.updateMotion(
        (model as unknown as { _real: unknown })._real,
        deltaTimeSeconds,
      )

      // 检测完成 → 调用回调
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (!wasFinished && manager.isFinished()) {
        wasFinished = true
        finishedHandler?.(self)
      }
    },

    isFinished(): boolean {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return manager.isFinished()
    },

    setFinishedMotionHandler(handler: (self: ICubismMotion) => void): void {
      finishedHandler = handler
    },

    setEffectIds(eyeBlinkIds: string[], lipSyncIds: string[]): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realMotion.setEffectIds(
        eyeBlinkIds.map((id) => toCubismId(id)),
        lipSyncIds.map((id) => toCubismId(id)),
      )
    },

    setFadeInTime(seconds: number): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realMotion.setFadeInTime(seconds)
    },

    setFadeOutTime(seconds: number): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realMotion.setFadeOutTime(seconds)
    },

    setLoop(loop: boolean): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realMotion.setLoop(loop)
    },

    getDuration(): number {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return realMotion.getDuration()
    },
  }

  return self
}

export function createRenderer(): ICubismRenderer {
  if (!CubismRendererClass) throw new Error('[Live2D] CubismRenderer 未加载')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const realRenderer = new CubismRendererClass()

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _real: realRenderer,

    initialize(model: ICubismModel): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.initialize((model as unknown as { _real: unknown })._real)
    },

    drawModel(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.drawModel()
    },

    setMvpMatrix(matrix: Float32Array): void {
      // SDK 内部使用 CubismMatrix44，通过 setMatrix 设置底层数组
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        realRenderer.getMvpMatrix().setMatrix(matrix)
      } catch {
        // 某些 SDK 版本可能 API 不同，静默忽略
      }
    },

    setIsPremultipliedAlpha(enable: boolean): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.setIsPremultipliedAlpha(enable)
    },

    /** 设置 WebGL 上下文，必须在 initialize 之后、drawModel 之前调用 */
    startUp(gl: WebGLRenderingContext): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.startUp(gl)
    },
  }
}

export function isPlatformReady(): boolean {
  return !!(CubismMocClass && CubismFramework?.isStarted())
}

export function getFramework() {
  return CubismFramework
}

// ============================================================
// Core WASM 直接访问 (备用)
// ============================================================

export function getCubismCore() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Live2DCubismCore as {
    csmGetParameterCount: (modelPtr: number) => number
    csmGetParameterIds: (modelPtr: number) => number
    csmUpdateModel: (modelPtr: number) => void
    csmResetDrawableDynamicFlags: (modelPtr: number) => void
    csmGetDrawableCount: (modelPtr: number) => number
    [key: string]: unknown
  } | null
}
