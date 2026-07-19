/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// ============================================================
// Live2D Cubism 5 SDK 模块声明
// (SDK 文件需从 Live2D 官网下载后放入 src/live2d/cubism5/)
// ============================================================
declare module '@/live2d/cubism5/cubismmoc' {
  export const CubismMoc: {
    create(arrayBuffer: ArrayBuffer): {
      createModel(): import('@/live2d/types').ICubismModel
    }
  }
}

declare module '@/live2d/cubism5/cubismmotion' {
  export const CubismMotion: {
    create(arrayBuffer: ArrayBuffer): import('@/live2d/types').ICubismMotion
  }
}

declare module '@/live2d/cubism5/cubismrenderer_webgl' {
  export const CubismRenderer_WebGL: {
    new (): import('@/live2d/types').ICubismRenderer
  }
}

declare module '@/live2d/cubism5/live2dcubismframework' {
  export const CubismFramework: import('@/live2d/types').ICubismFramework
  export const Option: unknown
  export const LogLevel: Record<string, number>
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_AI_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_MAP_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
