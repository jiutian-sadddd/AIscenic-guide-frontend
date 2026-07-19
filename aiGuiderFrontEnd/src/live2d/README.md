# Live2D Cubism 5 SDK 集成说明

## 需要下载的文件

项目使用 Cubism 5 SDK for Web。您需要从 Live2D 官网下载 SDK：

👉 **下载地址**: https://www.live2d.com/download/cubism-sdk/

选择 **Cubism 5 SDK for Web**，接受许可协议后下载 ZIP 包。

## 文件放置

下载解压后，将以下文件复制到项目中：

### 1. Core 运行时 (必须)
```
ZIP中的路径:  CubismSdkForWeb-5/Core/live2dcubismcore.min.js
复制到:      public/live2d/live2dcubismcore.min.js
```

### 2. Framework 框架源码 (必须)
```
ZIP中的路径:  CubismSdkForWeb-5/Framework/src/*
复制到:      src/live2d/cubism5/*
```

需要复制的文件包括（但不限于）：
- `live2dcubismframework.ts`
- `cubismmoc.ts`
- `cubismmodel.ts`
- `cubismmotion.ts`
- `cubismusermodel.ts`
- `cubismrenderer_webgl.ts`
- `cubismmatrix44.ts`
- `cubismtype.ts`
- `cubismid.ts`
- `math/` 目录
- `motion/` 目录
- `effect/` 目录
- 其他依赖的 `.ts` 文件

**推荐做法**: 将 `Framework/src/` 整个目录复制到 `src/live2d/cubism5/`。

## 模型文件

当前已放置在 `public/live2d/` 的模型文件：
- `灵仙儿.cmo3` — Cubism 5 模型文件
- `Untitled Animation.can3` — 动画文件 (应包含 hello / idle 等动画)

## 验证

全部文件就位后，启动开发服务器 (`npm run dev`)，打开控制台应看到：

```
[Live2D] ✓ Cubism 5 SDK 加载成功
[Live2D] ✓ 模型加载完成
[Live2D] ✓ 初始化完成
```

## 故障排查

| 问题 | 可能原因 | 解决 |
|------|---------|------|
| `Live2DCubismCore 未加载` | Core 文件缺失 | 检查 `public/live2d/live2dcubismcore.min.js` |
| `CubismMoc 未加载` | Framework 文件缺失 | 检查 `src/live2d/cubism5/` 目录 |
| `WebGL 不可用` | 浏览器不支持 | 使用现代浏览器 |
| 模型动画不播放 | `.can3` 中无动画 | 在 Cubism Editor 中导出含动画的 `.can3` |

## 动画名称配置

默认动画名称为 `hello` (入场) 和 `idle` (待机)。
如果您的 `.can3` 文件使用不同的名称/索引，请在 `Live2DManager.ts` 中调整：

```ts
// 在 playHello() 和 playIdle() 方法中修改动画名称
manager.playMotion('your_hello_name', false)
manager.playMotion('your_idle_name', true)
```
