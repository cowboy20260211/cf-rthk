# 香港电台 CF 版 - 部署指南

**文档版本**: 1.0.0  
**编制日期**: 2026-02-22

---

## 1. 部署概述

本文档介绍如何将香港电台 CF 版部署到 Cloudflare Pages 平台。

### 1.1 部署架构

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  GitHub      │────▶│  GitHub         │────▶│ Cloudflare  │
│  Repository  │     │  Actions        │     │   Pages     │
└──────────────┘     └─────────────────┘     └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  cf-rthk    │
                                              │ .pages.dev  │
                                              └──────────────┘
```

### 1.2 部署方式

| 方式                    | 适用场景  | 推荐程度   |
| ----------------------- | --------- | ---------- |
| GitHub Actions 自动部署 | 生产环境  | ⭐⭐⭐⭐⭐ |
| Wrangler CLI 手动部署   | 测试/预览 | ⭐⭐⭐⭐   |
| Dashboard 直接上传      | 临时部署  | ⭐⭐⭐     |

---

## 2. 准备工作

### 2.1 环境要求

| 工具     | 版本要求  | 说明           |
| -------- | --------- | -------------- |
| Node.js  | >= 18.0.0 | 运行环境       |
| npm      | >= 9.0.0  | 包管理器       |
| Git      | 任意版本  | 版本控制       |
| Wrangler | >= 3.22.0 | Cloudflare CLI |

### 2.2 账号要求

- GitHub 账户
- Cloudflare 账户

### 2.3 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd CFradio2026020901

# 安装依赖
npm install
```

---

## 3. GitHub Actions 自动部署 (推荐)

### 3.1 配置步骤

#### 步骤 1: 创建 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Profile** → **API Tokens**
3. 点击 **Create Custom Token**
4. 配置权限：

```
Token name: rthk-radio-deploy

Permissions:
- Cloudflare Pages: Edit
- Account: Workers: Write

Account resources:
- Include: All accounts

Zone resources:
- Include: All zones
```

5. 点击 **Continue to summary**
6. 点击 **Create Token**
7. **重要**: 复制并保存生成的 Token

#### 步骤 2: 获取 Cloudflare Account ID

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在地址栏中找到 Account ID：

```
https://dash.cloudflare.com/<ACCOUNT_ID>/...
```

3. 复制并保存 Account ID

#### 步骤 3: 添加 GitHub Secrets

1. 进入 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**

添加以下两个 Secret：

| Secret Name           | Value                     |
| --------------------- | ------------------------- |
| CLOUDFLARE_API_TOKEN  | 你的 Cloudflare API Token |
| CLOUDFLARE_ACCOUNT_ID | 你的 Account ID           |

#### 步骤 4: 推送代码触发部署

```bash
# 添加所有更改
git add .

# 提交更改
git commit -m "Configure deployment"

# 推送到 main 分支
git push origin main
```

### 3.2 验证部署

1. 访问 `https://github.com/<username>/<repo>/actions`
2. 查看部署状态
3. 部署成功后，访问 `https://cf-rthk.pages.dev`

---

## 4. Wrangler CLI 手动部署

### 4.1 安装 Wrangler

```bash
# 全局安装
npm install -g wrangler

# 验证安装
wrangler --version
```

### 4.2 登录 Cloudflare

```bash
npx wrangler login
```

这将打开浏览器窗口，请按照提示完成登录。

### 4.3 构建项目

```bash
npm run build
```

构建产物将生成在 `dist/` 目录。

### 4.4 部署到 Cloudflare Pages

```bash
# 方式 1: 创建新项目
npx wrangler pages deploy dist

# 方式 2: 部署到已有项目
npx wrangler pages deploy dist --project-name=cf-rthk
```

### 4.5 配置项目名称

首次部署时，系统会提示输入项目名称。请输入 `cf-rthk`。

---

## 5. Cloudflare Dashboard 部署

### 5.1 访问 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** → **Direct upload**

### 5.2 上传构建产物

1. 点击 **Upload assets**
2. 将 `dist` 文件夹拖入上传区域
3. 等待上传完成
4. 点击 **Deploy site**

### 5.3 配置项目

部署完成后：

1. 点击 **Continue to project**
2. 设置项目名称为 `cf-rthk`
3. 完成配置

---

## 6. 部署配置说明

### 6.1 项目配置

#### 6.1.1 构建命令

```bash
npm run build
```

#### 6.1.2 输出目录

```
dist/
```

#### 6.1.3 Node 版本

```
18
```

### 6.2 环境变量

本项目无需额外的环境变量。

### 6.3 Cloudflare Pages Functions

部署时，`functions/` 目录会自动作为 Cloudflare Pages Functions 部署。

```
functions/
├── api/
│   ├── proxy/
│   │   └── [path].ts
│   └── timetable/
│       └── index.ts
└── _middleware.ts
```

---

## 7. 自定义域名 (可选)

### 7.1 添加自定义域名

1. 在 Cloudflare Dashboard 中进入 Pages 项目
2. 点击 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入你的域名
5. 按照提示配置 DNS 记录

### 7.2 SSL 证书

Cloudflare 会自动为自定义域名提供 SSL 证书（使用 Let's Encrypt）。

---

## 8. 验证部署

### 8.1 功能验证清单

- [ ] 首页正常加载
- [ ] 三个直播频道可以播放
- [ ] 节目列表正常显示
- [ ] 节目详情页可以播放
- [ ] 收藏功能正常工作
- [ ] 页面响应式布局正常

### 8.2 性能验证

- [ ] 首屏加载时间 < 3 秒
- [ ] 无明显 JavaScript 错误
- [ ] 音频播放流畅

---

## 9. 故障排除

### 9.1 构建失败

```bash
# 检查 Node 版本
node -v  # 应为 18.x

# 清除缓存重新构建
rm -rf node_modules dist
npm install
npm run build
```

### 9.2 部署失败

1. 检查 Cloudflare API Token 权限
2. 确认 Account ID 正确
3. 查看 GitHub Actions 日志

### 9.3 页面空白

1. 确认 `base: '/'` 在 `vite.config.ts` 中
2. 检查 `dist/index.html` 存在
3. 查看浏览器控制台错误

### 9.4 CORS 错误

确认 Cloudflare Pages Functions 已正确部署：

1. 访问 `https://cf-rthk.pages.dev/api/proxy/test`
2. 应返回 200 状态码

---

## 10. 监控与维护

### 10.1 查看日志

在 Cloudflare Dashboard 中：

1. 进入 **Workers & Pages**
2. 选择 **cf-rthk** 项目
3. 查看 **Logs** 标签

### 10.2 性能监控

Cloudflare 自动提供：

- 请求统计
- 带宽使用
- 缓存命中率
- 错误率

### 10.3 更新部署

每次推送到 `main` 分支都会自动触发新部署。

手动触发部署：

```bash
git push origin main
```

---

## 11. 回滚操作

### 11.1 从 Dashboard 回滚

1. 进入 Cloudflare Dashboard
2. 选择 **Workers & Pages** → **cf-rthk**
3. 点击 **Deployments** 标签
4. 选择要回滚的版本
5. 点击 **Rollback**

### 11.2 从 CLI 回滚

```bash
npx wrangler pages deployment list cf-rthk
npx wrangler pages rollback cf-rthk <deployment-id>
```

---

## 12. 附录

### 12.1 常用命令

| 命令                   | 说明           |
| ---------------------- | -------------- |
| `npm install`          | 安装依赖       |
| `npm run dev`          | 开发模式       |
| `npm run build`        | 构建生产版本   |
| `npm run pages:dev`    | 本地预览 Pages |
| `npm run pages:deploy` | 部署到 Pages   |

### 12.2 部署配置

- **项目名称**: cf-rthk
- **默认域名**: cf-rthk.pages.dev
- **构建输出**: dist/
- **Functions 目录**: functions/

### 12.3 相关文档

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

---

## 13. 联系与支持

如有问题，请：

1. 查阅 [GitHub Issues](https://github.com/<username>/<repo>/issues)
2. 提交新的 Issue
3. 联系项目维护者

---

**部署成功！**

访问地址: https://cf-rthk.pages.dev

---

**文档结束**
