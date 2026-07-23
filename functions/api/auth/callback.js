// 彩虹聚合登录 - OAuth回调处理
// GET /api/auth/callback?type=qq&code=XXXX
// 流程：服务器调彩虹接口获取用户信息 → 存入KV → 设置session cookie → 重定向到/logs

export async function onRequestGet(context) {
  const { request, env } = context;

  let redirectHome = new URL('/logs', request.url).href;

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const code = url.searchParams.get('code');

    if (!type || !code) {
      return Response.redirect(`${redirectHome}?error=missing_params`, 302);
    }

    const appId = env.CCCYUN_APPID;
    const appKey = env.CCCYUN_APPKEY;
    const apiBase = env.CCCYUN_API || 'https://u.cccyun.cc';

    if (!appId || !appKey) {
      return Response.redirect(`${redirectHome}?error=server_not_configured`, 302);
    }

    // 调用彩虹接口换取用户信息
    const callbackUrl = new URL(`${apiBase}/connect.php`);
    callbackUrl.searchParams.set('act', 'callback');
    callbackUrl.searchParams.set('appid', appId);
    callbackUrl.searchParams.set('appkey', appKey);
    callbackUrl.searchParams.set('type', type);
    callbackUrl.searchParams.set('code', code);

    const res = await fetch(callbackUrl.toString(), {
      headers: { 'User-Agent': 'cf-rthk/1.0' },
    });

    const data = await res.json();

    if (data.code !== 0) {
      const msg = encodeURIComponent(data.msg || 'login failed');
      return Response.redirect(`${redirectHome}?error=${msg}`, 302);
    }

    // 生成session id
    const sessionId = generateSessionId();

    // 准备用户信息
    const userInfo = {
      sessionId,
      type,
      typeLabel: getTypeLabel(type),
      socialUid: data.social_uid || '',
      accessToken: data.access_token || '',
      nickname: data.nickname || '游客',
      faceimg: data.faceimg || '',
      gender: data.gender || '',
      location: data.location || '',
      ip: data.ip || '',
      loginAt: new Date().toISOString(),
    };

    // 存session：KV key session:{id} -> userInfo, 7天过期
    const sessionKey = `session:${sessionId}`;
    await env.RTHK_FAVORITES.put(sessionKey, JSON.stringify(userInfo), {
      expirationTtl: 7 * 24 * 3600,
    });

    // 记录登录日志到access log
    try {
      const cf = request.cf || {};
      const now = new Date();
      const hkDate = new Date(now.getTime() + 8 * 3600000);
      const dateKey = hkDate.toISOString().slice(0, 10);
      const logKey = `log:${dateKey}`;
      const logEntry = {
        timestamp: hkDate.toISOString(),
        ip: request.headers.get('cf-connecting-ip') || data.ip || 'unknown',
        country: cf.country || 'unknown',
        city: cf.city || 'unknown',
        ua: (request.headers.get('user-agent') || '').slice(0, 200),
        browser: 'unknown',
        os: 'unknown',
        device: 'unknown',
        fingerprint: 'unknown',
        screen: 'unknown',
        lang: request.headers.get('accept-language') || 'unknown',
        path: '/api/auth/callback',
        referrer: '',
        loginMethod: type,
        loginMethodLabel: getTypeLabel(type),
        socialUid: data.social_uid || '',
        nickname: data.nickname || '',
        loginEvent: true,
      };

      const existing = await env.RTHK_FAVORITES.get(logKey);
      const logs = existing ? JSON.parse(existing) : [];
      logs.push(logEntry);
      await env.RTHK_FAVORITES.put(logKey, JSON.stringify(logs), {
        expirationTtl: 31 * 24 * 3600,
      });
    } catch (e) {}

    // 重定向回Logs页面，设置session cookie（httponly+secure+samesite=lax）
    const headers = new Headers({
      'Location': `${redirectHome}?login=success&nickname=${encodeURIComponent(data.nickname || '')}&type=${type}`,
      'Set-Cookie': `rthk_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
    });

    return new Response(null, { status: 302, headers });
  } catch (e) {
    const msg = encodeURIComponent(e.message || 'internal_error');
    return Response.redirect(`${redirectHome}?error=${msg}`, 302);
  }
}

function generateSessionId() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function getTypeLabel(type) {
  const labels = {
    qq: 'QQ', wx: '微信', alipay: '支付宝', sina: '微博', baidu: '百度',
    huawei: '华为', xiaomi: '小米', douyin: '抖音', bilibili: '哔哩哔哩',
    dingtalk: '钉钉', microsoft: '微软', gitee: 'Gitee', github: 'GitHub', google: 'Google',
  };
  return labels[type] || type;
}
