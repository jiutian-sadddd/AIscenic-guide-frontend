// ============================================================
// Live2DPlatform — Cubism 5 SDK 加载 & 模型完整加载流水线
//
// SDK 框架层文件位于 src/live2d/cubsim5/ 下
// Core: public/live2d/live2dcubismcore.min.js
//
// 职责:
//  1. 动态加载 Cubism 5 Framework 核心模块
//  2. 加载完整模型（model3.json → moc3 → 纹理 → 渲染器）
//  3. 加载 motion3.json 动画
//
// 注意：
//  为避免 rolldown 对 SDK 中 export type / export declare type 的
//  打包兼容问题，我们只动态导入 5 个已验证过的核心模块
//  (framework, moc, motion, renderer, motionmanager)。
//  model3.json 和 physics3.json 直接用 JSON.parse 解析。
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
// ICubismModel 适配器
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

    /**
     * Core モデルを更新し、頂点変更フラグをセットする。
     * resetDynamicFlags は呼ばない → drawModel 時にマスク描画が正しく行われる。
     */
    updateCore(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel._model?.update?.()
    },

    /**
     * 頂点変更フラグをリセットする（drawModel 完了後に呼ぶ）
     */
    resetDynamicFlags(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realModel._model?.drawables?.resetDynamicFlags?.()
    },

    draw(_matrix: Float32Array): void {
      // 由 Renderer 负责
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
// model3.json 手工解析 (避免导入 CubismModelSettingJson)
// ============================================================

interface ParsedModel3Json {
  mocFileName: string
  textureFileNames: string[]
  physicsFileName: string
}

function parseModel3Json(jsonText: string): ParsedModel3Json {
  const data = JSON.parse(jsonText)

  return {
    mocFileName: data.FileReferences?.Moc ?? '',
    textureFileNames: Array.isArray(data.FileReferences?.Textures)
      ? data.FileReferences.Textures
      : [],
    physicsFileName: data.FileReferences?.Physics ?? '',
  }
}

// ============================================================
// 类型定义
// ============================================================

/** 完整加载的模型 */
export interface LoadedLive2DModel {
  model: ICubismModel
  renderer: ICubismRenderer
  textures: WebGLTexture[]
  textureWidth: number
  textureHeight: number
}

/** 物理配置 (解析后的 physics3.json) */
export interface ParsedPhysics {
  enabled: boolean
}

// ============================================================
// 初始化
// ============================================================

/**
 * 动态加载 Cubism 5 SDK 核心模块
 */
export async function loadCubismPlatform(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).Live2DCubismCore === 'undefined') {
    console.warn('[Live2D] Live2DCubismCore 未加载，请在 index.html 中引入 live2dcubismcore.min.js')
    return false
  }

  if (CubismFramework?.isStarted()) {
    return true // 已经加载过
  }

  try {
    const [
      frameworkMod,
      mocMod,
      motionMod,
      rendererMod,
      motionMgrMod,
    ] = await Promise.all([
      import('@/live2d/cubsim5/live2dcubismframework'),
      import('@/live2d/cubsim5/model/cubismmoc'),
      import('@/live2d/cubsim5/motion/cubismmotion'),
      import('@/live2d/cubsim5/rendering/cubismrenderer_webgl'),
      import('@/live2d/cubsim5/motion/cubismmotionmanager'),
    ])

    CubismFramework = frameworkMod.CubismFramework
    CubismMocClass = mocMod.CubismMoc
    CubismMotionClass = motionMod.CubismMotion
    CubismRendererClass = rendererMod.CubismRenderer_WebGL
    CubismMotionManagerClass = motionMgrMod.CubismMotionManager

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
// 完整模型加载
// ============================================================

/**
 * 从 model3.json 目录加载完整 Live2D 模型
 *
 * @param modelDir  模型目录 URL，如 '/live2d/lingxianer/'
 * @param jsonName  model3.json 文件名
 * @param gl        WebGL 渲染上下文
 * @returns 加载完毕的模型对象
 */
export async function loadLive2DModel(
  modelDir: string,
  jsonName: string,
  gl: WebGLRenderingContext,
): Promise<LoadedLive2DModel> {
  if (!CubismFramework?.isStarted()) {
    throw new Error('[Live2D] Cubism SDK 尚未初始化')
  }

  const basePath = modelDir.endsWith('/') ? modelDir : modelDir + '/'

  // ---- 1. 加载 & 解析 model3.json ----
  const modelJsonUrl = basePath + jsonName
  console.log(`[Live2D] 加载模型配置: ${modelJsonUrl}`)

  const jsonResp = await fetch(modelJsonUrl)
  if (!jsonResp.ok) throw new Error(`[Live2D] model3.json 加载失败 HTTP ${jsonResp.status}`)
  const jsonText = await jsonResp.text()
  const parsed = parseModel3Json(jsonText)

  console.log(`[Live2D]   Moc: ${parsed.mocFileName}`)
  console.log(`[Live2D]   纹理: ${parsed.textureFileNames.length} 张`)
  if (parsed.physicsFileName) console.log(`[Live2D]   物理: ${parsed.physicsFileName}`)

  // ---- 2. 加载 .moc3 ----
  const mocUrl = basePath + parsed.mocFileName
  console.log(`[Live2D] 加载 Moc: ${mocUrl}`)

  const mocResp = await fetch(mocUrl)
  if (!mocResp.ok) throw new Error(`[Live2D] moc3 加载失败 HTTP ${mocResp.status}`)
  const mocBuffer = await mocResp.arrayBuffer()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const moc = CubismMocClass.create(mocBuffer, false)
  if (!moc) throw new Error('[Live2D] CubismMoc.create() 失败')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const realModel = moc.createModel()
  if (!realModel) throw new Error('[Live2D] moc.createModel() 失败')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  realModel.saveParameters()

  const model = wrapModel(realModel)

  // ---- 3. 加载纹理 ----
  const textures: WebGLTexture[] = []
  let textureWidth = 0
  let textureHeight = 0

  for (let i = 0; i < parsed.textureFileNames.length; i++) {
    const textureFileName = parsed.textureFileNames[i]!
    const textureUrl = basePath + textureFileName
    console.log(`[Live2D] 加载纹理 ${i}: ${textureUrl}`)

    const img = await loadImage(textureUrl)
    textureWidth = img.width
    textureHeight = img.height

    // 检查纹理尺寸是否超过 WebGL 限制
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    console.log(`[Live2D]  纹理尺寸: ${textureWidth}x${textureHeight} (GPU 最大: ${maxTexSize})`)
    if (textureWidth > maxTexSize || textureHeight > maxTexSize) {
      console.warn(`[Live2D] ⚠ 纹理 ${textureWidth}x${textureHeight} 超过 GPU 最大 ${maxTexSize}，渲染可能失败`)
    }

    const tex = gl.createTexture()
    if (!tex) throw new Error('[Live2D] 创建 WebGL 纹理失败')

    gl.bindTexture(gl.TEXTURE_2D, tex)

    // Cubism SDK は Premultiplied Alpha を前提としているため、
    // HTML Image (straight alpha) をアップロード時に事前乗算する
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
    // HTML Image は上下反転しているため Flip-Y を有効化
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

    // pixelStorei をデフォルトに戻す
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)

    // 检查 WebGL 错误
    const texErr = gl.getError()
    if (texErr !== gl.NO_ERROR) {
      console.warn(`[Live2D] ⚠ 纹理上传 WebGL 错误: 0x${texErr.toString(16)}`)
    }
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const ext = gl.getExtension('EXT_texture_filter_anisotropic')
    if (ext) {
      const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max)
    }

    textures.push(tex)
  }

  // ---- 4. 创建渲染器 ----
  const modelCanvasW = model.getCanvasWidth()
  const modelCanvasH = model.getCanvasHeight()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const realRenderer = new CubismRendererClass(modelCanvasW, modelCanvasH)

  const renderer = wrapRenderer(realRenderer)
  renderer.initialize(model)

  // startUp() 内部で _currentFbo を参照してマスク用 RenderTarget を生成するため、
  // 現在の framebuffer binding を事前に設定しておく（null = デフォルト framebuffer）
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if ((realRenderer as any)._currentFbo === undefined || (realRenderer as any)._currentFbo === null) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ;(realRenderer as any)._currentFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING)
  }

  renderer.startUp(gl)
  renderer.setIsPremultipliedAlpha(true)

  // 绑定纹理
  for (let i = 0; i < textures.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    realRenderer.bindTexture(i, textures[i]!)
  }

  console.log('[Live2D] ✓ 模型完整加载成功')
  console.log(`[Live2D]   - 模型画布: ${modelCanvasW}x${modelCanvasH}`)
  console.log(`[Live2D]   - 纹理: ${textures.length} 张 (${textureWidth}x${textureHeight})`)
  console.log(`[Live2D]   - Drawables: ${model.getDrawableCount()}`)
  console.log(`[Live2D]   - Parameters: ${model.getParameterCount()}`)
  console.log(`[Live2D]   - Parts: ${model.getPartCount()}`)

  console.log(`[Live2D]   - 纹理: ${textures.length} 张 (${textureWidth}x${textureHeight})`)
  console.log(`[Live2D]   - Drawables: ${model.getDrawableCount()}`)
  console.log(`[Live2D]   - Parameters: ${model.getParameterCount()}`)

  return { model, renderer, textures, textureWidth, textureHeight }
}

/**
 * 辅助：加载 Image
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`[Live2D] 纹理图片加载失败: ${url}`))
    img.src = url
  })
}

// ============================================================
// 动画加载 (motion3.json 格式)
// ============================================================

export async function loadMotionFromJson(
  url: string,
  name: string,
): Promise<ICubismMotion | null> {
  if (!CubismMotionClass || !CubismMotionManagerClass) {
    console.warn('[Live2D] SDK 未加载，无法加载动画')
    return null
  }

  try {
    console.log(`[Live2D] 加载动画: ${name} (${url})`)
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const arrayBuffer = await resp.arrayBuffer()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const realMotion = CubismMotionClass.create(
      arrayBuffer,
      arrayBuffer.byteLength,
      undefined,
      undefined,
      false,
    )

    // 初始化 effectIds 为空数组，防止 doUpdateParameters 中访问 null 导致崩溃
    // 眼睛眨眼和口型同步由 Live2DManager.applyParameters() 单独控制
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (typeof realMotion.setEffectIds === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realMotion.setEffectIds([], [])
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const manager = new CubismMotionManagerClass()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    manager.startMotion(realMotion, false)

    let finishedHandler: ((self: ICubismMotion) => void) | null = null
    let wasFinished = false

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const motion: ICubismMotion = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _realMotion: realMotion,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _manager: manager,

      updateMotion(m: ICubismModel, deltaTimeSeconds: number): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        manager.updateMotion(
          (m as unknown as { _real: unknown })._real,
          deltaTimeSeconds,
        )
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        if (!wasFinished && manager.isFinished()) {
          wasFinished = true
          finishedHandler?.(motion)
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

    console.log(`[Live2D] ✓ 动画加载成功: ${name}`)
    return motion
  } catch (err) {
    console.warn(`[Live2D] 动画加载失败 "${name}":`, err)
    return null
  }
}

// ============================================================
// 渲染器包装
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapRenderer(realRenderer: any): ICubismRenderer {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _real: realRenderer,

    initialize(m: ICubismModel): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.initialize((m as unknown as { _real: unknown })._real)
    },

    drawModel(): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.drawModel()
    },

    setMvpMatrix(matrix: Float32Array): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const mvp = realRenderer.getMvpMatrix()
      if (mvp) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        mvp.setMatrix(matrix)
      } else {
        console.warn('[Live2D] getMvpMatrix() 返回了空值，投影矩阵设置失败')
      }
    },

    setRenderState(fbo: WebGLFramebuffer | null, viewport: number[]): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.setRenderState(fbo, viewport)
    },

    setIsPremultipliedAlpha(enable: boolean): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.setIsPremultipliedAlpha(enable)
    },

    startUp(gl: WebGLRenderingContext): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      realRenderer.startUp(gl)
    },
  }
}

// ============================================================
// 兼容旧 API
// ============================================================

export function createMoc(arrayBuffer: ArrayBuffer): ICubismMoc {
  if (!CubismMocClass) throw new Error('[Live2D] CubismMoc 未加载')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const realMoc = CubismMocClass.create(arrayBuffer, false)

  return {
    createModel(): ICubismModel {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return wrapModel(realMoc.createModel())
    },
  }
}

export function createRenderer(): ICubismRenderer {
  if (!CubismRendererClass) throw new Error('[Live2D] CubismRenderer 未加载')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return wrapRenderer(new CubismRendererClass())
}

export function isPlatformReady(): boolean {
  return !!(CubismMocClass && CubismFramework?.isStarted())
}

export function getFramework() {
  return CubismFramework
}

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
