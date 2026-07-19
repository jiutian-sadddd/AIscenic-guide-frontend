// ============================================================
// live2dcubismcore.min.js 全局类型声明
//
// 该文件由 public/live2d/live2dcubismcore.min.js 加载后挂载到 window
// ============================================================

declare namespace Live2DCubismCore {
  /** WASM 内存分配 */
  function _malloc(size: number): number
  function _free(ptr: number): void

  /** Moc 操作 */
  function csmReviveMocInPlace(bufferPtr: number, size: number): number
  function csmGetSizeofMoc(mocPtr: number): number
  function csmGetMocVersion(mocPtr: number): number
  function csmGetLatestMocVersion(): number
  function csmHasMocConsistency(mocPtr: number): boolean

  /** Model 操作 */
  function csmInitializeModelInPlace(mocPtr: number, memorySize: number, modelSize: number): number
  function csmUpdateModel(modelPtr: number): void
  function csmResetDrawableDynamicFlags(modelPtr: number): void

  /** 参数 */
  function csmGetParameterCount(modelPtr: number): number
  function csmGetParameterIds(modelPtr: number): number // char**
  function csmGetParameterTypes(modelPtr: number): number
  function csmGetParameterValues(modelPtr: number): number
  function csmGetParameterMinimumValues(modelPtr: number): number
  function csmGetParameterMaximumValues(modelPtr: number): number
  function csmGetParameterDefaultValues(modelPtr: number): number

  /** Part (部件) */
  function csmGetPartCount(modelPtr: number): number
  function csmGetPartIds(modelPtr: number): number // char**
  function csmGetPartOpacities(modelPtr: number): number

  /** Drawable */
  function csmGetDrawableCount(modelPtr: number): number
  function csmGetDrawableIds(modelPtr: number): number // char**
  function csmGetDrawableConstantFlags(modelPtr: number): number
  function csmGetDrawableDynamicFlags(modelPtr: number): number
  function csmGetDrawableTextureIndices(modelPtr: number): number
  function csmGetDrawableDrawOrders(modelPtr: number): number
  function csmGetDrawableRenderOrders(modelPtr: number): number
  function csmGetDrawableOpacities(modelPtr: number): number
  function csmGetDrawableMaskCounts(modelPtr: number): number
  function csmGetDrawableMasks(modelPtr: number): number // int**
  function csmGetDrawableVertexCounts(modelPtr: number): number
  function csmGetDrawableVertexPositions(modelPtr: number): number // float**
  function csmGetDrawableVertexUvs(modelPtr: number): number // float**
  function csmGetDrawableIndexCounts(modelPtr: number): number
  function csmGetDrawableIndices(modelPtr: number): number // unsigned short**

  /** 版本 */
  const Version: {
    csmGetVersion: () => number
    csmGetMajor: (version: number) => number
    csmGetMinor: (version: number) => number
    csmGetPatch: (version: number) => number
  }
}
