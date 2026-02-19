# 测试清单

## 本地开发测试

### 1. 启动服务
- [ ] 启动 Wrangler Workers: `npm run workers:dev` (端口 8787)
- [ ] 启动 Vite Dev Server: `npm run dev` (端口 3000)

### 2. 测试代理端点

#### 测试通用代理
访问: http://localhost:8787/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2%2Fprogramme

**预期结果**:
- 返回 RTHK 网站HTML 内容
- 响应头包含 CORS 头:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`

#### 测试时间表 API
访问: http://localhost:8787/api/timetable?channel=radio2

**预期结果**:
- 返回 JSON 格式的节目时间表
- 包含 timetable 数组

### 3. 测试前端功能

访问: http://localhost:3000

- [ ] 首页加载正常
- [ ] 频道列表显示正常
- [ ] 节目列表加载正常（应该通过代理获取）
- [ ] 点击节目可以播放

### 4. 浏览器控制台检查

打开浏览器开发者工具，检查:
- [ ] 没有 CORS 错误
- [ ] Network 标签显示请求通过 `/api/proxy/` 端点
- [ ] Console 显示代理日志: `[fetchWithProxies] Using proxy: ...`

## 部署测试

### 1. 部署到 Cloudflare Pages
```bash
npm run pages:deploy
```

### 2. 测试线上环境

访问: https://cf-rthk.pages.dev

- [ ] 页面加载正常
- [ ] 节目列表显示正常
- [ ] 可以播放节目

### 3. 测试线上代理

访问: https://cf-rthk.pages.dev/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2%2Fprogramme

- [ ] 返回正确的 HTML 内容
- [ ] 包含 CORS 头

## 性能测试

### 1. 响应时间
- [ ] 代理响应时间 < 2 秒
- [ ] 缓存命中时响应时间 < 100ms

### 2. 并发测试
- [ ] 同时请求 10 个节目列表
- [ ] 所有请求都能成功返回

## 错误处理测试

### 1. 无效 URL
访问: http://localhost:8787/api/proxy/invalid-url

- [ ] 返回 400 错误
- [ ] 错误信息清晰

### 2. 超时测试
- [ ] 请求超过 15 秒自动取消
- [ ] 返回超时错误信息

### 3. 网络错误
- [ ] 目标网站不可用时返回友好错误信息
- [ ] 前端显示适当的错误提示

## 安全测试

### 1. CORS 配置
- [ ] OPTIONS 请求返回正确的 CORS 头
- [ ] 实际请求包含正确的 CORS 头

### 2. 输入验证
- [ ] 非HTTP/HTTPS URL 被拒绝
- [ ] 特殊字符正确编码

## 回归测试

### 1. 原有功能
- [ ] 直播功能正常
- [ ] 节目重温功能正常
- [ ] 收藏功能正常

### 2. 兼容性
- [ ] Chrome 浏览器正常
- [ ] Firefox 浏览器正常
- [ ] Safari 浏览器正常
- [ ] 移动端浏览器正常

## 测试完成标准

所有测试项都通过才算测试完成。

## 问题记录

如果测试中发现问题，请记录：
- 问题描述
- 复现步骤
- 预期结果 vs 实际结果
- 环境信息（浏览器、操作系统等）
