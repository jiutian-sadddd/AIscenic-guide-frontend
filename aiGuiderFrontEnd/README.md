# AI 数字人智能景区导览系统 — 前端工程

> 基于 Vue 3 + TypeScript + Vite 构建的生产级景区智能导览前端应用

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | ^3.5 |
| 语言 | TypeScript | ~6.0 |
| 构建 | Vite | ^8.0 |
| 状态管理 | Pinia | ^3.0 |
| 路由 | Vue Router | ^5.0 |
| HTTP | Axios (封装拦截器) | ^1.9 |
| 移动端 UI | Vant | ^4.9 |
| 管理端 UI | Element Plus | ^2.11 |
| 图表 | ECharts / vue-echarts | ^5.6 / ^7.0 |
| Markdown | marked | ^16.0 |
| 样式 | SCSS | - |
| 测试 | Vitest + Playwright | - |

---

## 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- npm >= 9

### 安装与运行

```bash
# 1. 安装依赖
cd aiGuiderFrontEnd
npm install

# 2. 启动开发服务器 (游客端 H5)
npm run dev

# 3. 启动开发服务器 (局域网可访问，用于手机调试)
npm run dev:mobile

# 4. 构建生产版本
npm run build:prod

# 5. 预览生产构建
npm run preview
```

### 环境配置

- `.env.development` — 开发环境，API 代理到 `localhost:8000`
- `.env.production` — 生产环境，需替换为实际域名

关键环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | REST API 根路径 | `http://localhost:8000/api/v1` |
| `VITE_AI_BASE_URL` | AI 端 SSE 接口路径 | `http://localhost:8080/ai` |
| `VITE_WS_URL` | WebSocket 地址 | `ws://localhost:8000/ws` |
| `VITE_MAP_KEY` | 高德地图 JS SDK Key | 待配置 |

---

## 项目结构

```
aiGuiderFrontEnd/
├── .env.development          # 开发环境变量
├── .env.production           # 生产环境变量
├── index.html                # 入口 HTML
├── vite.config.ts            # Vite 配置 (代理/别名/插件)
├── tsconfig.json             # TypeScript 配置
├── package.json
│
└── src/
    ├── main.ts               # 应用入口
    ├── App.vue               # 根组件
    │
    ├── api/                  # API 层 (按模块拆分)
    │   ├── index.ts          # Axios 实例 (Token/错误拦截)
    │   ├── auth.ts           # 认证接口
    │   ├── chat.ts           # 对话接口 (含 SSE 流式)
    │   ├── knowledge.ts      # 知识库接口
    │   ├── analytics.ts      # 数据分析接口
    │   ├── location.ts       # 位置服务接口
    │   └── admin.ts          # 管理后台接口
    │
    ├── types/
    │   └── api.types.ts      # TypeScript 接口定义 (200+ 类型)
    │
    ├── stores/               # Pinia 状态管理
    │   ├── chat.ts           # 对话/偏好状态
    │   ├── user.ts           # 认证/用户状态
    │   └── admin.ts          # 数据大屏/系统设置状态
    │
    ├── router/
    │   └── index.ts          # 路由配置 (游客/管理端 + 权限守卫)
    │
    ├── components/           # 通用组件
    │   ├── DigitalHuman/     # ★ 数字人组件 (Live2D 预留)
    │   │   └── index.vue
    │   └── VoiceRecorder/    # 语音录音组件
    │       └── index.vue
    │
    ├── pages/
    │   ├── mobile/
    │   │   └── ChatView.vue  # ★ 游客端主对话页
    │   ├── admin/
    │   │   ├── Login.vue     # 管理员登录
    │   │   ├── Layout.vue    # 管理后台布局
    │   │   ├── dashboard/
    │   │   │   └── Index.vue # 数据大屏 (ECharts)
    │   │   └── knowledge/
    │   │       └── List.vue  # 知识库管理
    │   └── NotFound.vue      # 404 页面
    │
    └── styles/
        └── global.scss       # 全局样式 & 工具类
```

---

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | ChatView | 游客端主对话页 (H5) |
| `/admin/login` | Login | 管理员登录 |
| `/admin/dashboard` | Dashboard | 数据大屏 |
| `/admin/knowledge` | KnowledgeList | 知识库管理 |
| `/*` | NotFound | 404 |

---

## API 接口对照

本项目对接 `backend-api.md` 定义的 RESTful API。

| 模块 | 接口 | 对应方法 |
|------|------|----------|
| 认证 | `POST /auth/login` | `auth.ts → touristLogin()` |
| 认证 | `POST /auth/admin/login` | `auth.ts → adminLogin()` |
| 对话 | `POST /dialog/message` | `chat.ts → sendMessage()` |
| 对话 | `POST /dialog/voice` | `chat.ts → sendVoiceMessage()` |
| 对话 | `GET /ai/chat/stream` (SSE) | `chat.ts → createChatStream()` |
| 知识库 | `GET /knowledge` | `knowledge.ts → getDocList()` |
| 知识库 | `POST /knowledge` | `knowledge.ts → createDoc()` |
| 数据分析 | `GET /analytics/dashboard` | `analytics.ts → getDashboardOverview()` |
| 位置服务 | `GET /location/nearby` | `location.ts → getNearbySpots()` |
| 管理 | `GET /admin/settings` | `admin.ts → getSystemSettings()` |

---

## 核心组件详解

### DigitalHuman 数字人组件

**路径:** `src/components/DigitalHuman/index.vue`

**Props (Live2D 口型驱动核心接口):**

| Prop | 类型 | 说明 |
|------|------|------|
| `audioUrl` | `string` | TTS 音频地址，驱动口型同步 |
| `text` | `string` | 当前播报文本 (字幕) |
| `emotion` | `'friendly' \| 'professional' \| 'lively' \| 'enthusiastic' \| 'neutral'` | 数字人表情 |
| `videoStreamUrl` | `string` | 实时视频流地址 (预留) |
| `isIdle` | `boolean` | 是否待机状态 |

**集成 Live2D SDK 的步骤:**
1. 安装 `@pixi/live2d-display` 或 Cubism SDK
2. 将模型文件放入 `public/models/`
3. 在组件中取消 `<canvas id="live2d-canvas">` 注释
4. 在 `onMounted` 中初始化 Live2D 模型
5. 使用 `audioUrl` prop 的 `watch` 驱动 `ParamMouthOpenY` 参数

### VoiceRecorder 录音组件

**路径:** `src/components/VoiceRecorder/index.vue`

支持：
- 按住录音 / 松开发送 (移动端 Touch + PC Mouse)
- 录音时长显示
- 音频可视化动画
- WebSocket 流式 ASR 接口预留

---

## 数据大屏

管理后台数据大屏 (`/admin/dashboard`) 包含 4 个 ECharts 图表：

1. **情感趋势曲线** — 折线图，展示 positive / neutral / negative 随时间变化
2. **情感分布** — 环形饼图，展示好评/中评/差评比例
3. **满意度趋势** — 面积折线图，展示用户满意度分数走势
4. **热门问答 TOP 10** — 排行榜列表

---

## 开发说明

### Token 刷新机制

Axios 拦截器实现了自动 Token 刷新：
1. 收到 401 且错误码为 `40103` (Token 过期) 时自动调用 `/auth/refresh`
2. 刷新期间并发的其他请求会被挂起，刷新完成后自动重试
3. 刷新失败则清除登录态，跳转登录页

### 流式对话 (SSE)

游客端对话使用 SSE (Server-Sent Events) 实现流式输出：
- 首个 SSE 事件为 `sentiment`，标识情感标签
- 后续 `message` 事件为 Markdown 文本流
- 收到 `[DONE]` 信号后关闭连接
- SSE 失败时自动降级为非流式接口

### 移动端适配

- 使用 `100dvh` 解决移动端浏览器地址栏高度问题
- 安全区域适配 (`env(safe-area-inset-*)`)
- Vant 组件按需导入 (unplugin-vue-components)

---

## 部署

```bash
# 构建
npm run build:prod

# 产物位于 dist/ 目录
# 托管到 Nginx / CDN 即可
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/ai-guider;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    location /ai/ {
        proxy_pass http://ai-server:8080;
        proxy_buffering off;  # SSE 需要关闭缓冲
    }
}
```

---

## 待集成清单

- [ ] 高德地图 JS SDK Key 配置 (`VITE_MAP_KEY`)
- [ ] Live2D Cubism SDK 模型集成
- [ ] WebSocket 流式 ASR 实时转写
- [ ] Markdown 编辑器升级 (推荐 @kangc/v-md-editor)
- [ ] 微信 OAuth 登录 (`POST /auth/wechat`)
- [ ] 单元测试覆盖
- [ ] CI/CD 流水线
