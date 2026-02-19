# 直播问题修复

## 已修复的问题

### 1. 节目名称不显示

**原因**: `fetchCurrentLiveProgram` 使用本地时间而非香港时间，且使用旧的HTML解析方式

**修复**:

- 更新为使用香港时间
- 使用API接口 `getTimetable` 获取节目数据

```typescript
// 修复前：使用本地时间和HTML解析
const currentDate = new Date();
const day = currentDate.getDay();

// 修复后：使用香港时间和API
const hkDate = new Date(currentDate.getTime() + (hkOffset + localOffset) * 60000);
const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${todayStr}&c=${channelId}`;
```

### 2. 第一台、第五台直播错误

**原因**: 备用URL不存在（返回301重定向）

**修复**: 移除无效的备用URL

```typescript
// 修复前：包含无效的备用URL
export const RTHK_LIVE_STREAMS_FALLBACK: Record<string, string[]> = {
  radio1: [
    'https://rthkradio1-live.akamaized.net/...',
    'https://www.rthk.hk/stream/radio1/live.m3u8', // 301 - 不存在
  ],
};

// 修复后：只保留有效URL
export const RTHK_LIVE_STREAMS_FALLBACK: Record<string, string[]> = {
  radio1: ['https://rthkradio1-live.akamaized.net/...'],
};
```

## 测试结果

### 节目名称获取测试

```
测试频道: radio1
✓ 现正播放:
  节目: 是日快樂
  主持: 米哈、杜雯惠、標爺
  时间: 10:00 - 12:00

测试频道: radio2
✓ 现正播放:
  节目: 瘋 Show 快活人
  主持: 李麗蕊、敖嘉年、馬小強...
  时间: 10:00 - 12:00

测试频道: radio5
✓ 现正播放:
  节目: 香江暖流
  主持: Harry哥哥、袁沅玉...
  时间: 10:00 - 13:00
```

### 直播流URL测试

```
Radio 1: HTTP/1.1 200 OK ✓
Radio 2: HTTP/1.1 200 OK ✓
Radio 5: HTTP/1.1 200 OK ✓
```

## 调试日志

现在播放器会在控制台输出详细日志：

```
[AudioPlayer] Fetching live program for channel: radio1
[fetchCurrentLiveProgram] Fetching: /api/proxy/https%3A%2F%2F...
[fetchCurrentLiveProgram] Result: {program: "...", host: "...", time: "..."}
[AudioPlayer] Live program info: {program: "...", host: "...", time: "..."}
```

## 可能的剩余问题

如果某些频道仍然无法播放，可能原因：

### 1. 网络环境限制

某些网络环境可能无法访问Akamai CDN

**解决方案**:

- 尝试不同的网络环境
- 使用VPN或代理

### 2. 防火墙/安全软件

阻止了m3u8文件或HLS流

**解决方案**:

- 检查防火墙设置
- 允许访问 `rthkradio*-live.akamaized.net`

### 3. 浏览器兼容性

某些浏览器可能不完全支持HLS

**解决方案**:

- 使用现代浏览器（Chrome, Firefox, Safari, Edge）
- 确保浏览器支持MSE（Media Source Extensions）

## 验证步骤

1. 启动开发环境

```bash
npm run dev:full
```

2. 打开浏览器控制台（F12）

3. 访问直播频道，检查日志：
   - 应该看到 `Fetching live program for channel: radio1`
   - 应该看到 `Live program info: {...}`
   - 播放器应该显示节目名称

4. 检查Network标签：
   - 应该看到对 `/api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2FgetTimetable` 的请求
   - 应该看到对直播流 m3u8 的请求

## 更新的文件

| 文件                                    | 更新内容             |
| --------------------------------------- | -------------------- |
| `src/services/rthkApi.ts`               | 修复节目名称获取逻辑 |
| `src/services/rthk.ts`                  | 移除无效备用URL      |
| `src/components/Player/AudioPlayer.tsx` | 添加调试日志         |

## 下次运行

如果问题仍然存在，请提供：

1. 浏览器控制台的完整日志
2. Network标签中的请求状态
3. 错误信息的截图
