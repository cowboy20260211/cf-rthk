# Cloudflare & GitHub 账号配置指南

## 一、Cloudflare 配置

### 1.1 获取 API Token

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Edit Cloudflare Workers" 模板
4. 配置权限:
   - Account: Workers Scripts: Edit
   - Workers KV: Edit
5. 点击 "Continue to summary" → "Create Token"
6. **复制生成的 Token** (格式: `ABCdefGHIjklMNOpqrsTUVwxyz1234567890`)

### 1.2 获取 Account ID

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击右侧边栏的 "Workers & Pages"
3. 复制顶部的 "Account ID" (32位字符)

### 1.3 创建 KV 命名空间

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 (会打开浏览器)
npx wrangler login

# 创建 KV 命名空间
npx wrangler kv:namespace create "FAVORITES"
npx wrangler kv:namespace create "HISTORY"
npx wrangler kv:namespace create "SETTINGS"
```

### 1.4 配置 wrangler.toml

将生成的 ID 填入 `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FAVORITES"
id = "你的FAVORITES_NAMESPACE_ID"

[[kv_namespaces]]
binding = "HISTORY"
id = "你的HISTORY_NAMESPACE_ID"

[[kv_namespaces]]
binding = "SETTINGS"
id = "你的SETTINGS_NAMESPACE_ID"
```

---

## 二、GitHub 配置

### 2.1 创建 Personal Access Token (PAT)

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 设置 Token 名称: `rthk-radio-cf-deploy`
4. 设置过期时间: 建议 90 天或无期限
5. 选择权限:
   - ✅ `repo` - 完整仓库访问
   - ✅ `workflow` - GitHub Actions
6. 点击 "Generate token"
7. **复制生成的 Token** (格式: `ghp_xxxxxxxxxxxxxxxxxxxx`)

### 2.2 配置 GitHub Secrets

1. 访问 GitHub 仓库: `https://github.com/<你的用户名>/rthk-radio-cf`
2. 点击 "Settings" → "Secrets and variables" → "Actions"
3. 添加以下 Secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | 你的 Cloudflare API Token |

### 2.3 推送代码到 GitHub

```bash
# 如果还没有创建仓库，先在 GitHub 网站创建空的仓库
# 访问: https://github.com/new
# 仓库名: rthk-radio-cf
# 不要勾选任何选项 (创建空仓库)

# 添加远程仓库
git remote add origin https://github.com/<你的用户名>/rthk-radio-cf.git

# 推送代码
git branch -M main
git push -u origin main
```

---

## 三、本地开发配置

### 3.1 安装依赖

```bash
npm install
```

### 3.2 配置环境变量

创建 `.env.local` 文件:

```env
# Cloudflare (用于本地 Workers 开发)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### 3.3 启动开发服务器

```bash
# 启动前端开发服务器
npm run dev

# 在另一个终端启动 Workers
npm run workers:dev
```

---

## 四、部署

### 4.1 手动部署 Workers

```bash
npx wrangler deploy
```

### 4.2 自动部署

推送到 `main` 分支会自动触发 GitHub Actions 部署:

```bash
git add .
git commit -m "feat: 新功能"
git push origin main
```

---

## 五、账号信息汇总

| 服务 | 用户名 | 密码/Token | 获取位置 |
|------|--------|------------|----------|
| Cloudflare | 2026012701@cowboy.cc.cd | cowboy@61862 | Dashboard 登录 |
| Cloudflare API | - | [API Token] | https://dash.cloudflare.com/profile/api-tokens |
| Cloudflare Account ID | - | [32位ID] | https://dash.cloudflare.com/ → Workers & Pages |
| GitHub | 2026012701@cowboy.cc.cd | Cowboy61862 | 网站登录 |
| GitHub PAT | - | [PAT] | https://github.com/settings/tokens |

---

## 六、常见问题

### Q: Cloudflare 登录失败
A: 访问 https://dash.cloudflare.com 使用邮箱密码登录，检查账号是否有效。

### Q: GitHub 密码被拒绝
A: GitHub 已不再支持密码认证，需要使用 Personal Access Token (PAT)。

### Q: KV 命名空间 ID 是什么
A: 运行 `npx wrangler kv:namespace create "NAME"` 后显示的 ID。

### Q: 部署失败
A: 检查 GitHub Secrets 是否正确配置，确保 Account ID 和 API Token 都已添加。
