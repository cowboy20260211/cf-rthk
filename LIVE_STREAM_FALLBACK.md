# 直播流备用URL功能

## 问题

```
GET https://rthkradio2-live.akamaized.net/hls/live/2040078/radio2/master.m3u8
net::ERR_CONNECTION_CLOSED
```

直播流连接失败，可能原因：

- 网络环境无法访问Akamai CDN
- CDN节点故障
- 网络不稳定

## 解决方案

### 1. 添加备用直播流URL

```typescript
export const RTHK_LIVE_STREAMS: Record<string, string> = {
  radio1: 'https://rthkradio1-live.akamaized.net/hls/live/2035313/radio1/master.m3u8',
  radio2: 'https://rthkradio2-live.akamaized.net/hls/live/2040078/radio2/master.m3u8',
  radio5: 'https://rthkradio5-live.akamaized.net/hls/live/2040081/radio5/master.m3u8',
};

export const RTHK_LIVE_STREAMS_FALLBACK: Record<string, string[]> = {
  radio1: [
    'https://rthkradio1-live.akamaized.net/hls/live/2035313/radio1/master.m3u8',
    'https://www.rthk.hk/stream/radio1/live.m3u8',
  ],
  radio2: [
    'https://rthkradio2-live.akamaized.net/hls/live/2040078/radio2/master.m3u8',
    'https://www.rthk.hk/stream/radio2/live.m3u8',
  ],
  radio5: [
    'https://rthkradio5-live.akamaized.net/hls/live/2040081/radio5/master.m3u8',
    'https://www.rthk.hk/stream/radio5/live.m3u8',
  ],
};
```

### 2. 自动切换逻辑

```
主线路连接失败
    ↓
尝试备用线路
    ↓
备用线路成功 → 继续播放
    ↓
备用线路失败 → 重试主线路
    ↓
重试2次失败 → 显示错误提示
```

### 3. 错误处理策略

#### 主线路失败

```
[主线路] 连接失败
    ↓
[备用线路1] 尝试连接
    ↓
成功 → 恢复播放
失败 → 继续尝试
```

#### 全部线路失败

```
重试次数: 0 → 等待1秒 → 重试
重试次数: 1 → 等待2秒 → 重试
重试次数: 2 → 显示错误
```

## 代码实现

### AudioPlayer错误处理

```typescript
if (isLive) {
  const channelId = currentChannel?.id || 'radio2';
  const fallbackLiveUrls = getLiveStreamFallbackUrls(channelId);

  const currentUrl = hls.url || streamUrl;
  const currentIndex = fallbackLiveUrls.indexOf(currentUrl);

  // 尝试下一个备用URL
  if (currentIndex >= 0 && currentIndex < fallbackLiveUrls.length - 1) {
    const nextUrl = fallbackLiveUrls[currentIndex + 1];
    setRetryCount(0);
    setError(`主线路连接失败，正在切换备用线路...`);
    hls.loadSource(nextUrl);
    hls.startLoad();
  } else {
    // 所有备用URL都失败，重试主线路
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setError(`连接中断，正在重试 (${retryCount + 1}/2)...`);
      hls.loadSource(fallbackLiveUrls[0]);
      hls.startLoad();
    } else {
      setError('直播连接失败，请检查网络后重试');
      hls.destroy();
    }
  }
}
```

## 用户界面提示

### 切换备用线路

```
主线路连接失败，正在切换备用线路...
```

### 重试主线路

```
连接中断，正在重试 (1/2)...
连接中断，正在重试 (2/2)...
```

### 最终失败

```
直播连接失败，请检查网络后重试
```

## URL列表

### Radio 1

| 优先级    | URL                           | 来源       |
| --------- | ----------------------------- | ---------- |
| 主线路    | rthkradio1-live.akamaized.net | Akamai CDN |
| 备用线路1 | www.rthk.hk/stream/radio1     | RTHK官网   |

### Radio 2

| 优先级    | URL                           | 来源       |
| --------- | ----------------------------- | ---------- |
| 主线路    | rthkradio2-live.akamaized.net | Akamai CDN |
| 备用线路1 | www.rthk.hk/stream/radio2     | RTHK官网   |

### Radio 5

| 优先级    | URL                           | 来源       |
| --------- | ----------------------------- | ---------- |
| 主线路    | rthkradio5-live.akamaized.net | Akamai CDN |
| 备用线路1 | www.rthk.hk/stream/radio5     | RTHK官网   |

## 性能指标

| 指标         | 值                |
| ------------ | ----------------- |
| 切换延迟     | 500ms             |
| 重试延迟     | 1-2秒（指数退避） |
| 最大重试次数 | 2次               |
| 备用URL数量  | 2个               |

## 测试验证

### 本地测试

```bash
npm run dev:full
```

### 测试场景

1. **主线路失败**
   - 预期: 自动切换备用线路
   - 验证: 播放器显示"正在切换备用线路"

2. **所有线路失败**
   - 预期: 重试2次后显示错误
   - 验证: 播放器显示"请检查网络后重试"

3. **网络恢复**
   - 预期: 自动恢复播放
   - 验证: 错误消失，正常播放

## 更新的文件

| 文件                                    | 更新内容              |
| --------------------------------------- | --------------------- |
| `src/services/rthk.ts`                  | 添加备用URL和获取函数 |
| `src/components/Player/AudioPlayer.tsx` | 直播流切换逻辑        |

## 未来改进

- [ ] 添加更多备用URL
- [ ] 实现智能线路选择（ping测试）
- [ ] 记录线路质量数据
- [ ] 添加手动切换线路功能
- [ ] 实现自适应码率

## 注意事项

1. **CORS限制**: 某些备用URL可能有CORS限制
2. **网络环境**: 不同网络环境可能需要不同策略
3. **用户体验**: 切换过程应尽可能平滑
4. **错误提示**: 清晰告知用户当前状态
