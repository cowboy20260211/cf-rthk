# Cloudflare Pages 自动部署指南

## 方式 1: GitHub Actions 自动部署 (推荐)

### 前提条件

1. Cloudflare 账户 (2026012701@cowboy.cc.cd)
2. GitHub 仓库已配置

### 配置步骤

#### 1. 创建 Cloudflare API Token

访问: https://dash.cloudflare.com/profile/api-tokens

创建新 Token，权限:

- `Cloudflare Pages` - Edit
- `Account` - Cloudflare Workers

#### 2. 添加 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加:

```
Name: CLOUDFLARE_API_TOKEN
Value: 你的 Cloudflare API Token

Name: CLOUDFLARE_ACCOUNT_ID
Value: 你的 Account ID (访问 https://dash.cloudflare.com/<email>/workers-and-pages 获取)
```

#### 3. 推送代码到 main 分支

```bash
git add .
git commit -m "Configure Cloudflare Pages deployment"
git push origin main
```

#### 4. 查看部署状态

访问: https://github.com/<username>/<repo>/actions

---

## 方式 2: 手动部署

### 前提条件

1. 安装 Wrangler: `npm install -g wrangler`
2. 登录: `npx wrangler login`

### 部署命令

```bash
# 构建
npm run build

# 部署到 Pages
npx wrangler pages deploy dist --project-name=rthk-radio-cf
```

---

## 方式 3: Cloudflare Dashboard 手动上传

### 步骤

1. 访问: https://dash.cloudflare.com/<your-email>/pages
2. 点击 "Create a project"
3. 选择 "Direct upload"
4. 上传 `dist` 文件夹
5. 完成部署

---

## 访问地址

部署成功后，访问:

- Production: `https://rthk-radio-cf.pages.dev`
- 自定义域名: 配置后显示

---

## 项目配置

### 文件结构

```
├── .github/workflows/deploy.yml  # 自动部署工作流
├── wrangler.toml                # Pages 配置
├── dist/                        # 构建输出
└── vite.config.ts              # Vite 配置 (base: './')
```

### 环境变量

无需额外环境变量。API 数据内置在应用中。

---

## 构建失败

```故障排除

###bash
# 检查 Node 版本
node -v  # 应为 18.x

# 清除缓存重新构建
rm -rf node_modules dist
npm install
npm run build
```

### 部署失败

1. 检查 Cloudflare API Token 权限
2. 确认 Account ID 正确
3. 查看 GitHub Actions 日志

### 页面空白

1. 确认 `base: './'` 在 vite.config.ts 中
2. 检查 `dist/index.html` 存在
3. 查看浏览器控制台错误
