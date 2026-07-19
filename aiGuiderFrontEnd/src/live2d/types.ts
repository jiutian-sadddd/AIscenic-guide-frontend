// ============================================================
// Live2D Cubism 5 类型定义
// 描述 Cubism 5 SDK for Web 核心接口，不依赖实际 SDK 文件
// ============================================================

/** Moc (Model Container) — 从 .cmo3 二进制创建模型 */
export interface ICubismMoc {
  createModel(): ICubismModel
}

export interface ICubismMocStatic {
  create(arrayBuffer: ArrayBuffer): ICubismMoc
}

/** 模型实例 — 参数读写 & 更新 */
export interface ICubismModel {
  update(): void
  /** Core 更新のみ（resetDynamicFlags を呼ばない） */
  updateCore?(): void
  /** 頂点変更フラグをリセット（drawModel 完了後に呼ぶ） */
  resetDynamicFlags?(): void
  draw(matrix: Float32Array): void
  setParameterValueById(id: string, value: number, weight?: number): void
  getParameterValueById(id: string): number
  getParameterCount(): number
  getParameterId(index: number): string
  getParameterIndex(id: string): number
  getDrawableCount(): number
  getDrawableId(index: number): string
  getPartCount(): number
  getPartId(index: number): string
  setPartOpacityById(id: string, opacity: number): void
  getCanvasWidth(): number
  getCanvasHeight(): number
  saveParameters(): void
  loadParameters(): void
}

/** 动画 / 动作 */
export interface ICubismMotion {
  updateMotion(model: ICubismModel, deltaTimeSeconds: number): void
  isFinished(): boolean
  setFinishedMotionHandler(handler: (self: ICubismMotion) => void): void
  setEffectIds(eyeBlinkIds: string[], lipSyncIds: string[]): void
  setFadeInTime(seconds: number): void
  setFadeOutTime(seconds: number): void
  setLoop(loop: boolean): void
  getDuration(): number
}

export interface ICubismMotionStatic {
  create(arrayBuffer: ArrayBuffer): ICubismMotion
}

/** WebGL 渲染器 */
export interface ICubismRenderer {
  initialize(model: ICubismModel): void
  drawModel(): void
  setMvpMatrix(matrix: Float32Array): void
  setIsPremultipliedAlpha(enable: boolean): void
  /** 设置 WebGL 上下文，必须在 initialize 之后、drawModel 之前调用 */
  startUp(gl: WebGLRenderingContext): void
  /** 设置渲染状态（framebuffer + viewport），每次 drawModel 之前调用 */
  setRenderState(fbo: WebGLFramebuffer | null, viewport: number[]): void
}

export interface ICubismRendererStatic {
  new (): ICubismRenderer
}

/** 框架入口 */
export interface ICubismFramework {
  startUp(options: { logFunction?: (...args: unknown[]) => void; loggingLevel?: number }): void
  initialize(): void
  dispose(): void
  isStarted(): boolean
}

// ============================================================
// 应用层类型
// ============================================================

/** 模型配置 */
export interface Live2DModelConfig {
  /** 模型目录路径 (包含 .model3.json 的目录) */
  modelPath: string
  /** model3.json 文件名 (默认 "lingxianer.model3.json") */
  modelJsonName?: string
  /** 动画目录路径 */
  motionPath?: string
  /** 动画名称映射 { 名称: 文件名 } */
  motions?: Record<string, string>
  /** 模型缩放比例 */
  scale?: number
  /** X 偏移 */
  offsetX?: number
  /** Y 偏移 */
  offsetY?: number
}

/** 动画名称 → 索引映射 */
export type MotionMap = Record<string, string>

/**
 * 自定义模型参数 ID — 匹配 lingxianer 模型
 *
 * 这些参数是在 Live2D Cubism Editor 中为模型定义的自定义参数，
 * 与 Cubism 标准参数 (ParamAngleX 等) 不同。
 */
export const CUBISM_PARAMS = {
  // ---- 头部运动 ----
  /** 头部左右水平摇头 -20~20 */
  ANGLE_X: 'faceX',
  /** 头部上下俯仰 -20~20 */
  ANGLE_Y: 'faceY',
  /** 头部左右歪头倾斜 -20~20 */
  ANGLE_Z: 'faceR',

  // ---- 眼球视线 ----
  /** 眼球左右视线移动 -20~20 */
  EYE_BALL_X: 'eyeballX',
  /** 眼球上下视线移动 -20~20 */
  EYE_BALL_Y: 'eyeballY',

  // ---- 眼睛开闭 ----
  /** 右眼眼皮 0闭~1默认~1.5睁大 */
  EYE_OPEN_L: 'eyeballLOC',
  /** 左眼眼皮 0闭~1默认~1.5睁大 */
  EYE_OPEN_R: 'eyeballROC',

  // ---- 嘴巴 ----
  /** 上唇开合 0闭~1开 */
  MOUTH_OPEN_Y: 'upmouthOC',
  /** 下唇开合 0闭~1开 */
  MOUTH_OPEN_YL: 'downmouthOC',
  /** 嘴型宽窄弧度形变 -1~1 */
  MOUTH_FORM: 'mouthShapeChange',

  // ---- 身体 ----
  /** 躯干左右侧身偏移 -10~10 */
  BODY_ANGLE_X: 'bodyRX',
  /** 胸腹呼吸起伏 0静止~1扩张 */
  BREATH: 'breath',

  // ---- 头发飘逸 ----
  /** 后脑后发摆动 -1~1 */
  HAIR_BACK: 'backHairWave',
  /** 两侧马尾侧发摆动 -1~1 */
  HAIR_SIDE: 'sidehairWave',
  /** 额前刘海飘动 -1~1 */
  HAIR_FRONT: 'fronthairWave',

  // ---- 手臂 (供高级动画控制) ----
  /** 默认手臂旋转 0~10 */
  ARM_DEFAULT_ROTATE: 'ButtomArmR',
  /** 手势切换 0默认~1手势二 */
  ARM_GESTURE_SWITCH: 'gestureSwitch',
  /** 手势二小臂旋转 -10~10 */
  ARM_FOREARM: 'forearmR',
  /** 手势二大臂伸展 -10~10 */
  ARM_UPPER_ARM: 'upperarmR',
} as const

/** 口型同步配置 */
export interface LipSyncConfig {
  /** 平滑系数 (0-1，越大越灵敏) */
  smoothing: number
  /** 最小张嘴阈值 (低于此值视为闭嘴) */
  threshold: number
  /** 最大张嘴程度映射 */
  maxMouthValue: number
}

/** 视线跟踪配置 */
export interface LookTrackingConfig {
  /** 是否启用 */
  enabled: boolean
  /** 头部跟踪灵敏度 */
  headSensitivity: number
  /** 眼球跟踪灵敏度 */
  eyeSensitivity: number
  /** 插值平滑系数 */
  smoothing: number
  /** 最大头部偏角 (度) */
  maxHeadAngle: number
}

/** Live2D 平台状态 */
export type Live2DPlatformState =
  | 'unloaded'
  | 'loading'
  | 'ready'
  | 'error'
