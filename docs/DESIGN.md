# 香港电台 CF 版 - 开发设计文档

**文档版本**: 1.0.0  
**编制日期**: 2026-02-22

---

## 1. 系统架构设计

### 1.1 整体架构

本项目采用前后端分离架构，前端使用 React 构建，后端使用 Cloudflare Pages Functions 实现 CORS 代理服务。

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   React SPA 应用                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │  路由    │ │ 状态管理 │ │  音频   │ │  API    │  │   │
│  │  │ Router  │ │ Zustand │ │ Player  │ │ Service │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           │ /api/*
┌──────────────────────────┴──────────────────────────────────┐
│                   Cloudflare Edge                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Cloudflare Pages Functions             │   │
│  │  ┌─────────────────┐    ┌─────────────────────┐  │   │
│  │  │  Proxy Handler  │    │  Timetable API       │  │   │
│  │  │  /api/proxy/*   │    │  /api/timetable      │  │   │
│  │  └────────┬────────┘    └──────────┬──────────┘  │   │
│  │           │                        │              │   │
│  │           ▼                        ▼              │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │         Cache Layer (5min TTL)              │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│    RTHK Website     │         │  RTHK Audio Server  │
│  (内容抓取)         │         │    (HLS Stream)     │
│                     │         │                     │
│ https://www.rthk.hk │         │ rthkaod2022.akamaized.net │
└─────────────────────┘         └─────────────────────┘
```

### 1.2 前端架构

#### 1.2.1 目录结构

```
src/
├── components/          # React 组件
│   ├── Common/         # 通用组件 (Layout 等)
│   ├── Live/           # 直播相关组件
│   ├── Player/         # 播放器组件
│   ├── Program/        # 节目相关组件
│   └── Favorite/       # 收藏相关组件
├── pages/              # 页面组件
│   ├── index/          # 首页
│   ├── live/           # 直播页面
│   ├── programs/       # 节目列表/详情页
│   ├── favorites/      # 收藏页面
│   └── profile/        # 用户资料页
├── services/           # API 服务层
│   ├── api.ts          # 通用 API
│   └── rthkApi.ts      # RTHK 数据服务
├── stores/             # 状态管理 (Zustand)
│   ├── PlayerContext   # 播放器状态
│   └── FavoriteContext # 收藏状态
├── types/              # TypeScript 类型定义
├── hooks/              # 自定义 React Hooks
├── utils/              # 工具函数
└── styles/             # 全局样式
```

#### 1.2.2 组件设计原则

1. **单一职责**: 每个组件只负责一个功能领域
2. **可复用性**: 通用组件放置在 Common 目录
3. **状态提升**: 共享状态提升到 Context/Store 层级
4. **Props 传递**: 使用 TypeScript 严格定义 Props 类型

### 1.3 后端架构

#### 1.3.1 Cloudflare Pages Functions

```
functions/
├── api/
│   ├── proxy/
│   │   └── [path].ts    # 通用 CORS 代理
│   └── timetable/
│       └── index.ts     # 节目时间表 API
└── _middleware.ts       # 全局中间件 (CORS 头)
```

#### 1.3.2 代理服务设计

**功能**: 解决浏览器跨域访问 RTHK 网站的限制

**实现要点**:

1. 接收前端请求 (`/api/proxy/{encoded_url}`)
2. 转发请求到目标 URL
3. 添加 CORS 响应头
4. 返回响应给前端

**优化策略**:

- 缓存响应 5 分钟
- 15 秒请求超时
- User-Agent 模拟

---

## 2. 核心模块设计

### 2.1 播放器模块

#### 2.1.1 设计目标

- 支持 HLS 流媒体播放
- 支持点播音频播放
- 流畅的播放状态切换
- 跨页面持久化播放

#### 2.1.2 核心接口

```typescript
interface PlayerState {
  // 当前播放内容
  currentChannel: LiveChannel | null; // 直播频道
  currentEpisode: Episode | null; // 点播节目

  // 播放状态
  isPlaying: boolean;
  volume: number;
  progress: number; // 播放进度 (0-100)
  duration: number; // 总时长 (秒)

  // 操作方法
  play(channel: LiveChannel): void;
  play(episode: Episode): void;
  pause(): void;
  resume(): void;
  setVolume(volume: number): void;
  seek(progress: number): void;
}
```

#### 2.1.3 实现方案

| 功能       | 技术选型      | 原因                      |
| ---------- | ------------- | ------------------------- |
| HLS 直播流 | HLS.js        | 支持 HLS 协议，兼容性最好 |
| 点播音频   | HTML5 Audio   | 简单可靠                  |
| 状态管理   | React Context | 组件层级较浅              |

### 2.2 收藏模块

#### 2.2.1 设计目标

- 持久化存储收藏数据
- 快速添加/移除收藏
- 支持收藏列表展示

#### 2.2.2 数据结构

```typescript
interface Favorite {
  id: string; // 唯一标识
  episodeId: string; // 剧集 ID
  programId: string; // 节目 ID
  title: string; // 标题
  channel: string; // 频道
  addedAt: string; // 添加时间 (ISO 8601)
  lastPlayedTime?: number; // 上次播放位置
}
```

#### 2.2.3 存储方案

- **存储位置**: Browser LocalStorage
- **键名**: `rthk_favorites`
- **数据格式**: JSON 字符串

### 2.3 API 模块

#### 2.3.1 服务层设计

```typescript
// rthkApi.ts
export const rthkApi = {
  // 频道相关
  getChannels(): Channel[];
  getChannel(channelId: string): Channel | undefined;

  // 节目相关
  getPopularPrograms(): Program[];
  getProgramsByChannel(channelId: string): Program[];
  getProgramDetail(channelId: string, programId: string): Promise<ProgramDetail>;
  searchPrograms(query: string): Program[];

  // 剧集相关
  getEpisodes(channelId: string, programId: string): Promise<Episode[]>;
};
```

#### 2.3.2 数据缓存

- **静态数据**: 内置在代码中 (频道列表、节目列表)
- **动态数据**: 通过代理从 RTHK 网站获取

---

## 3. 数据库设计

### 3.1 前端数据模型

#### 3.1.1 频道 (Channel)

```typescript
interface Channel {
  id: string; // radio1 | radio2 | radio5
  name: string; // 第一台 | 第二台 | 第五台
  nameEn: string; // Radio 1 | Radio 2 | Radio 5
  frequency: string; // FM 92.6MHz
  description: string; // 频道描述
  color: string; // 主题色 (Tailwind 类名)
  streamUrl: string; // 直播流地址
}
```

#### 3.1.2 节目 (Program)

```typescript
interface Program {
  id: string; // 节目唯一标识
  title: string; // 节目名称
  titleEn?: string; // 英文名称
  channel: string; // 所属频道名称
  channelId: string; // 频道 ID
  description: string; // 节目描述
  archiveUrl?: string; // 存档页面 URL
  imageUrl?: string; // 图片 URL
  host?: string; // 主持人
  schedule?: string; // 播出时间
  episodeCount?: number; // 集数
}
```

#### 3.1.3 剧集 (Episode)

```typescript
interface Episode {
  id: string; // 剧集唯一标识
  programId: string; // 所属节目 ID
  channelId: string; // 频道 ID
  title: string; // 剧集标题
  publishDate: string; // 发布日期 (YYYY-MM-DD)
  duration?: number; // 时长 (秒)
  audioUrl?: string; // 音频 URL
  description?: string; // 描述
}
```

---

## 4. 安全性设计

### 4.1 CORS 代理安全

| 防护措施   | 实现                        |
| ---------- | --------------------------- |
| URL 验证   | 只允许 HTTP/HTTPS 协议      |
| 请求头过滤 | 不转发 Cookie/Authorization |
| 超时控制   | 15 秒请求超时               |
| 错误处理   | 不暴露内部错误细节          |

### 4.2 前端安全

| 措施                    | 说明             |
| ----------------------- | ---------------- |
| TypeScript 严格模式     | 编译时类型检查   |
| Content Security Policy | 限制资源加载来源 |
| XSS 防护                | React 默认防护   |

---

## 5. 性能优化

### 5.1 前端优化

| 优化项   | 方案                  |
| -------- | --------------------- |
| 代码分割 | Rollup manualChunks   |
| 懒加载   | React.lazy() (如需要) |
| 图片优化 | 使用 WebP 格式        |
| 缓存策略 | LocalStorage 缓存     |

### 5.2 后端优化

| 优化项   | 方案                      |
| -------- | ------------------------- |
| 响应缓存 | Cloudflare CDN 5 分钟缓存 |
| 压缩传输 | Cloudflare 自动 gzip      |
| 请求合并 | 批量获取数据              |

### 5.3 音频播放优化

| 优化项     | 方案                |
| ---------- | ------------------- |
| 流媒体缓冲 | HLS.js 默认缓冲策略 |
| 预加载     | 提前加载下一集      |
| 错误重试   | 自动重连机制        |

---

## 6. 扩展性设计

### 6.1 功能扩展

- **新频道**: 在 `CHANNELS` 对象中添加配置
- **新节目**: 在 `PROGRAMS` 对象中添加配置
- **新页面**: 在 Router 中添加路由

### 6.2 部署扩展

- **自定义域名**: 在 Cloudflare Dashboard 配置
- **CDN 加速**: 默认使用 Cloudflare 全球 CDN
- **负载均衡**: Cloudflare 负载均衡器 (可选)

---

## 7. 开发规范

### 7.1 代码规范

- **TypeScript**: 严格模式开启
- **ESLint**: 使用项目预设配置
- **Prettier**: 代码格式化
- **Git Hooks**: Husky + lint-staged

### 7.2 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型 (type):

- feat: 新功能
- fix: Bug 修复
- docs: 文档更新
- style: 样式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具

### 7.3 命名规范

| 类型      | 规范             | 示例               |
| --------- | ---------------- | ------------------ |
| 组件文件  | PascalCase       | `AudioPlayer.tsx`  |
| 工具函数  | camelCase        | `fetchWithProxy()` |
| 常量      | UPPER_SNAKE_CASE | `CHANNELS`         |
| 接口/类型 | PascalCase       | `PlayerState`      |

---

## 8. 测试策略

### 8.1 单元测试

- 工具函数测试
- 组件渲染测试
- 状态管理测试

### 8.2 集成测试

- API 服务测试
- 代理功能测试

### 8.3 E2E 测试 (可选)

- 完整用户流程测试
- 跨浏览器兼容性测试

---

## 9. 监控与日志

### 9.1 监控指标

| 指标     | 工具                    |
| -------- | ----------------------- |
| 页面性能 | Cloudflare Analytics    |
| 错误追踪 | Cloudflare Workers 日志 |
| 用户行为 | (可选) 自行集成         |

### 9.2 日志策略

- 错误日志: Cloudflare Workers Console
- 访问日志: Cloudflare Analytics
- 调试日志: 开发环境仅本地输出

---

## 10. 附录

### 10.1 相关配置文件

- `vite.config.ts` - Vite 构建配置
- `tailwind.config.js` - Tailwind CSS 配置
- `tsconfig.json` - TypeScript 配置
- `wrangler.toml` - Cloudflare 配置

### 10.2 环境变量

| 变量 | 说明               | 必需 |
| ---- | ------------------ | ---- |
| 无   | 本项目无需环境变量 | -    |

### 10.3 依赖版本

| 依赖         | 版本    |
| ------------ | ------- |
| React        | ^18.2.0 |
| TypeScript   | ^5.3.3  |
| Vite         | ^5.0.8  |
| Tailwind CSS | ^3.4.0  |
| Zustand      | ^4.4.7  |
| HLS.js       | ^1.6.15 |

---

**文档结束**
