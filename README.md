# 香港电台CF版

香港电台在线收听与节目点播平台。

## 功能特性

- 📻 **直播收听** - 第一台、第二台、第五台实时直播
- 📋 **节目重温** - 各台节目列表与时间轴选择播放
- ⭐ **收藏功能** - 收藏喜欢的节目，快速访问
- 📱 **多端适配** - 电脑、手机、微信小程序支持
- ⚡ **自动部署** - Cloudflare Pages GitHub Actions 自动部署

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **音频播放**: HLS.js
- **部署**: Cloudflare Pages

## 快速开始

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发环境

\`\`\`bash
npm run dev
\`\`\`

### 构建

\`\`\`bash
npm run build
\`\`\`

### Pages 预览

```bash
npm run pages:dev
```

### Pages 手动部署

```bash
npm run pages:deploy
```

## 部署到 Cloudflare Pages

### 方式 1: GitHub Actions 自动部署 (推荐)

1. 推送代码到 `main` 分支
2. 访问 https://github.com/<username>/<repo>/actions 查看部署状态

### 方式 2: 手动部署

```bash
npm run build
npx wrangler pages deploy dist --project-name=rthk-radio-cf
```

## 项目结构

```
├── .github/workflows/    # GitHub Actions
│   └── deploy-pages.yml  # 自动部署配置
├── wrangler.toml        # Cloudflare Pages 配置
├── src/                  # 源代码
│   ├── components/     # 组件
│   │   ├── Player/      # 播放器组件
│   │   ├── Live/        # 直播组件
│   │   ├── Program/     # 节目组件
│   │   ├── Favorite/    # 收藏组件
│   │   └── Common/      # 通用组件
│   ├── pages/           # 页面
│   ├── services/        # API 服务
│   ├── stores/          # 状态管理
│   ├── types/           # 类型定义
│   └── utils/           # 工具函数
├── public/              # 静态资源
└── dist/                # 构建输出
```

## 配置说明

### GitHub Secrets

在仓库 Settings → Secrets 中添加:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID

### 访问地址

- Production: https://rthk-radio-cf.pages.dev

## 许可证

MIT
