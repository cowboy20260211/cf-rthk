# 项目测试指南

## 一、本地开发测试

### 1.1 安装依赖
```bash
npm install
```

### 1.2 启动前端开发服务器
```bash
npm run dev
```
- 访问: http://localhost:3000
- 查看首页、直播、节目等页面

### 1.3 启动 Workers (可选)
```bash
npm run workers:dev
```
- Workers 运行在: http://localhost:8787
- 前端会自动代理 `/api` 请求到 Workers

---

## 二、生产构建测试

### 2.1 构建项目
```bash
npm run build
```
- 构建产物输出到 `dist/` 目录
- 检查是否有构建错误

### 2.2 预览构建结果
```bash
npm run preview
```
- 访问: http://localhost:4173
- 测试生产环境的页面

---

## 三、功能测试清单

### 3.1 页面导航
- [ ] 首页加载正常
- [ ] 底部导航切换正常
- [ ] 页面标题显示正确

### 3.2 直播功能
- [ ] 进入直播页面
- [ ] 点击"开始收听"按钮
- [ ] 检查播放器是否显示
- [ ] 测试播放/暂停功能

### 3.3 节目功能
- [ ] 进入节目页面
- [ ] 切换不同电台 (第一台/第二台/第五台)
- [ ] 测试搜索功能
- [ ] 点击节目进入详情页

### 3.4 收藏功能
- [ ] 进入节目详情
- [ ] 点击收藏按钮
- [ ] 进入收藏页面查看
- [ ] 测试取消收藏

### 3.5 响应式布局
- [ ] 测试电脑端布局
- [ ] 测试手机端布局 (按 F12 切换移动端视图)

---

## 四、Workers 测试

### 4.1 本地 Workers 测试
```bash
# 测试 API 端点
curl http://localhost:8787/api/live
```

### 4.2 部署后测试
```bash
# 部署 Workers
npm run workers:deploy

# 测试直播 API
curl https://<your-workers-url>/api/live
```

---

## 五、常见问题

### Q: 播放器无法播放
A: 检查网络连接，确认直播流 URL 是否正确

### Q: 页面显示异常
A: 打开浏览器控制台 (F12) 查看错误信息

### Q: 构建失败
A: 运行 `npm run lint` 检查代码规范问题

### Q: Workers 部署失败
A: 检查 Cloudflare 登录状态: `npx wrangler whoami`

---

## 六、快速测试命令

```bash
# 完整测试流程
npm install && npm run build && npm run preview

# 仅构建
npm run build

# 仅启动开发服务器
npm run dev

# 仅启动 Workers
npm run workers:dev
```
