# 本地开发启动指南

## 问题解决

之前的错误 `500 Internal Server Error` 是因为代理服务器未启动。现在已经修复，请按照以下步骤启动。

## 启动方式

### 方法 1: 同时启动代理和前端（推荐）

```bash
npm run dev:full
```

这会同时启动：

- **代理服务器**: `http://localhost:8787` (提供 CORS 代理)
- **前端开发服务器**: `http://localhost:3000` (Vite)

### 方法 2: 分开启动（调试用）

**终端 1 - 启动代理服务器**:

```bash
npm run proxy
```

**终端 2 - 启动前端**:

```bash
npm run dev
```

## 代理服务器功能

### `/api/proxy/{url}`

通用 CORS 代理，获取任何 URL 并添加 CORS 头。

**示例**:

```
http://localhost:8787/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2%2Fprogramme
```

### `/api/timetable`

获取节目时间表。

**示例**:

```
http://localhost:8787/api/timetable?channel=radio2&date=20260219
```

## 工作流程

```
浏览器 (http://localhost:3000)
  ↓
  请求 /api/proxy/...
  ↓
Vite Proxy (转发到 localhost:8787)
  ↓
Node.js 代理服务器 (http://localhost:8787)
  ↓
获取 RTHK 网站内容
  ↓
添加 CORS 头
  ↓
返回给浏览器
```

## 验证代理是否工作

1. 启动服务后，访问 `http://localhost:3000`
2. 打开浏览器开发者工具 (F12)
3. 查看 Console 标签，应该看到:
   ```
   [fetchWithProxies] Using proxy: /api/proxy/https%3A%2F%2F...
   [Proxy] Fetching: https://www.rthk.hk/...
   [Proxy] Success: 200, length: ...
   ```
4. 查看 Network 标签，应该看到请求路径为 `/api/proxy/...`

## 测试代理端点

直接测试代理服务器:

```bash
# 测试通用代理
curl "http://localhost:8787/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2"

# 测试时间表 API
curl "http://localhost:8787/api/timetable?channel=radio2"
```

## 常见问题

### 问题 1: 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::8787`

**解决**:

```bash
# 查找占用端口的进程
lsof -i :8787

# 终止进程
kill -9 <PID>
```

### 问题 2: CORS 错误

**错误**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解决**: 确保代理服务器正在运行 (`npm run proxy`)

### 问题 3: 前端无法连接代理

**错误**: `ERR_CONNECTION_REFUSED`

**解决**:

1. 确认代理服务器正在运行
2. 检查 Vite 配置中的代理设置 (`vite.config.ts`)
3. 重启 Vite 开发服务器

## 生产环境

生产环境部署到 Cloudflare Pages 后，不需要单独的代理服务器。

Cloudflare Pages Functions 会自动处理 CORS 代理。

部署命令:

```bash
npm run pages:deploy
```

## 相关文件

- `proxy-server.cjs` - Node.js 代理服务器
- `vite.config.ts` - Vite 配置（包含代理设置）
- `functions/api/proxy/[[path]].ts` - Cloudflare Pages Functions（生产环境）
- `src/services/rthkApi.ts` - 前端 API 服务

## 技术细节

### 为什么需要代理？

浏览器的同源策略（Same-Origin Policy）阻止前端直接访问其他域名的资源。代理服务器充当中间人，添加必要的 CORS 头。

### 代理服务器性能

- 超时时间: 15 秒
- User-Agent: 模拟真实浏览器
- 响应格式: 保持原始格式（HTML/JSON）
- CORS 头: 允许所有来源 (`*`)

### 安全考虑

- 只允许 HTTP/HTTPS URL
- 不转发敏感请求头（如 Cookie）
- 设置合理的超时时间
- 错误信息不暴露内部细节
