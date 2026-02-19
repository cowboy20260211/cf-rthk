# 代理功能配置完成

## 已完成的配置

### 1. Cloudflare Pages Functions

创建了以下 API 端点：

#### `/api/proxy/{url}`

- **功能**: 通用代理，获取任何 URL 并添加 CORS 头
- **使用**: 前端通过此代理访问 RTHK 网站
- **示例**: `/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2`

#### `/api/timetable`

- **功能**: 获取节目时间表
- **参数**:
  - `channel`: 频道 ID (radio1, radio2, radio3, radio4, radio5, pth)
  - `date`: 日期 (YYYYMMDD 格式)
- **示例**: `/api/timetable?channel=radio2&date=20260219`

### 2. CORS 配置

所有响应包含以下 CORS 头：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, User-Agent
Access-Control-Max-Age: 86400
```

### 3. 前端更新

已更新 `src/services/rthkApi.ts` 中的以下函数：

- `fetchWithProxies()`: 使用 `/api/proxy/` 端点
- `fetchDayProgramSchedule()`: 使用代理获取时间表
- `fetchRadioSchedule()`: 使用代理获取节目表
- `fetchCurrentPlaying()`: 使用代理获取当前播放

## 如何测试

### 方法 1: 本地开发（推荐）

**终端 1 - 启动 Wrangler dev 服务器**:

```bash
npm run workers:dev
```

服务器将在 `http://localhost:8787` 启动

**终端 2 - 启动 Vite dev 服务器**:

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动

Vite 会自动将 `/api/*` 请求代理到 `localhost:8787`

### 方法 2: 直接部署到 Cloudflare Pages

```bash
npm run pages:deploy
```

部署后，Functions 会自动与 Pages 集成。

### 方法 3: 测试代理端点

访问以下 URL 测试代理：

```
http://localhost:8787/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2%2Fprogramme
```

应该返回 RTHK 网站的 HTML 内容。

## 工作原理

```
┌─────────────┐
│   浏览器     │
│  (前端)      │
└──────┬──────┘
       │ 1. 请求 /api/proxy/...
       ↓
┌─────────────────┐
│ Cloudflare      │
│ Pages Function  │
│   (代理)        │
└──────┬──────────┘
       │ 2. 转发请求到 RTHK
       ↓
┌─────────────────┐
│   RTHK 网站     │
└─────────────────┘
       │ 3. 返回内容
       ↓
┌─────────────────┐
│ Cloudflare      │
│ Pages Function  │
│  (添加CORS头)   │
└──────┬──────────┘
       │ 4. 返回给浏览器
       ↓
┌─────────────┐
│   浏览器     │
│  (前端)      │
└─────────────┘
```

## 注意事项

1. **缓存**: 代理响应缓存 5 分钟 (300 秒)
2. **超时**: 请求超时设置为 15 秒
3. **安全**: 只允许 HTTP/HTTPS URL
4. **User-Agent**: 代理使用浏览器 User-Agent 避免被拦截

## 部署检查清单

- [ ] Cloudflare Pages 项目已创建
- [ ] `functions/` 目录已部署
- [ ] 环境变量已配置（如需要）
- [ ] 域名已绑定（如使用自定义域名）
- [ ] CORS 配置正常工作

## 故障排除

### 问题 1: CORS 错误

**解决方案**: 确保使用 `/api/proxy/` 端点，不要直接访问 RTHK URL

### 问题 2: 代理返回 500 错误

**解决方案**: 检查 Cloudflare Workers 日志，确认目标 URL 可访问

### 问题 3: 本地开发时代理不工作

**解决方案**:

1. 确认 Wrangler dev 服务器正在运行
2. 确认 Vite 配置中的代理设置正确
3. 检查端口 8787 是否被占用

## 性能优化

1. **缓存策略**: 代理响应缓存 5 分钟
2. **超时控制**: 15 秒超时避免长时间等待
3. **压缩**: Cloudflare 自动压缩响应
4. **CDN**: 使用 Cloudflare 全球 CDN 加速

## 下一步

- [ ] 添加请求速率限制
- [ ] 添加更详细的错误日志
- [ ] 实现请求重试机制
- [ ] 添加监控和告警
