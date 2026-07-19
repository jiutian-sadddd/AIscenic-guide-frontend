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
  /** .cmo3 模型文件路径 */
  modelPath: string
  /** .can3 动画文件路径 */
  animationPath?: string
  /** 模型缩放比例 */
  scale?: number
  /** X 偏移 */
  offsetX?: number
  /** Y 偏移 */
  offsetY?: number
}

/** 动画名称 → 索引映射 (一个 .can3 中可能含多个动画) */
export type MotionMap = Record<string, number>

/** 默认参数 ID (Cubism 标准) */
export const CUBISM_PARAMS = {
  ANGLE_X: 'ParamAngleX',
  ANGLE_Y: 'ParamAngleY',
  ANGLE_Z: 'ParamAngleZ',
  EYE_BALL_X: 'ParamEyeBallX',
  EYE_BALL_Y: 'ParamEyeBallY',
  MOUTH_OPEN_Y: 'ParamMouthOpenY',
  MOUTH_FORM: 'ParamMouthForm',
  BODY_ANGLE_X: 'ParamBodyAngleX',
  BODY_ANGLE_Y: 'ParamBodyAngleY',
  BODY_ANGLE_Z: 'ParamBodyAngleZ',
  BREATH: 'ParamBreath',
  EYE_OPEN_L: 'ParamEyeLOpen',
  EYE_OPEN_R: 'ParamEyeROpen',
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
