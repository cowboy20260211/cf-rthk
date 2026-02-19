# 直播连接错误修复

## 问题

```
AudioPlayer.tsx:263 GET https://rthkradio5-live.akamaized.net/hls/live/2040081/radio5/master.m3u8 net::ERR_CONNECTION_CLOSED
```

## 原因分析

### 1. 直播流URL验证

```bash
# 测试结果
curl -I "https://rthkradio5-live.akamaized.net/hls/live/2040081/radio5/master.m3u8"
HTTP/1.1 200 OK
Content-Type: application/x-mpegURL
Access-Control-Allow-Origin: *
```

URL有效且支持CORS，但浏览器端可能遇到：

- 网络不稳定
- Akamai CDN连接超时
- 客户端网络环境问题

### 2. 原有问题

- 直播流无重试机制
- 无用户错误提示
- 直播错误时无备用方案

## 解决方案

### 1. 添加错误状态管理

```typescript
const [error, setError] = useState<string | null>(null);
const [retryCount, setRetryCount] = useState(0);
```

### 2. 改进HLS配置

```typescript
const hls = new Hls(
  isLive
    ? {
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      }
    : { startPosition: currentEpisode?.startTime || 0 }
);
```

### 3. 添加直播重试逻辑

```typescript
hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
  if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
    if (isLive) {
      const maxRetries = 3;
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setError(`连接中断，正在重试 (${retryCount + 1}/${maxRetries})...`);
        setTimeout(
          () => {
            hls.startLoad();
          },
          1000 * (retryCount + 1)
        ); // 指数退避
      } else {
        setError('直播连接失败，请稍后再试');
        hls.destroy();
      }
    }
  }
});
```

### 4. 用户界面显示错误

```typescript
<div style={{ fontSize: '12px', color: '#666' }}>
  {error ? (
    <span style={{ color: '#d40000' }}>{error}</span>
  ) : (
    // 正常内容
  )}
</div>
```

## 重试策略

### 直播流

- 最多重试 3 次
- 指数退避：1秒、2秒、3秒
- 显示重试进度
- 失败后提示用户

### 点播节目（原有）

- 使用备用URL列表
- 尝试多个CDN源

## 错误类型处理

| 错误类型      | 直播     | 点播        |
| ------------- | -------- | ----------- |
| NETWORK_ERROR | 重试3次  | 使用备用URL |
| MEDIA_ERROR   | 恢复媒体 | 恢复媒体    |
| 其他错误      | 销毁HLS  | 销毁HLS     |

## 测试验证

### 本地测试

```bash
npm run dev:full
```

### 测试步骤

1. 访问 `http://localhost:3000`
2. 点击任意直播频道
3. 观察播放器状态
4. 如果出错，应该看到：
   - "连接中断，正在重试 (1/3)..."
   - "连接中断，正在重试 (2/3)..."
   - "连接中断，正在重试 (3/3)..."
   - "直播连接失败，请稍后再试"

### 预期行为

- ✅ 自动重试连接
- ✅ 显示重试进度
- ✅ 失败后提示用户
- ✅ 点播节目使用备用URL

## 日志输出

开启浏览器控制台，应该看到：

```
[AudioPlayer] HLS Error: {type: "NETWORK_ERROR", ...}
[AudioPlayer] Network error, attempting recovery...
```

## HLS配置优化

### 直播配置

```typescript
{
  maxBufferLength: 30,     // 最大缓冲30秒
  maxMaxBufferLength: 60,  // 绝对最大60秒
}
```

### 点播配置

```typescript
{
  startPosition: startTime; // 从指定位置开始
}
```

## 未来改进

- [ ] 添加手动重试按钮
- [ ] 添加网络状态检测
- [ ] 实现更智能的重退避算法
- [ ] 添加离线播放支持
- [ ] 统计错误率并上报

## 相关文件

| 文件                                    | 更新内容           |
| --------------------------------------- | ------------------ |
| `src/components/Player/AudioPlayer.tsx` | 错误处理和重试逻辑 |

## 注意事项

1. **网络环境**: 某些网络环境可能无法访问Akamai CDN
2. **浏览器兼容**: 确保浏览器支持HLS
3. **防火墙**: 检查是否阻止了m3u8文件
4. **HTTPS**: 确保页面使用HTTPS协议
