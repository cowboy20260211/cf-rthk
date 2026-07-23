// 彩虹聚合登录 - 获取跳转登录地址
// GET /api/auth/login?type=qq
// 环境变量需要在Cloudflare Pages设置:
//   CCCYUN_APPID  - 应用AppID
//   CCCYUN_APPKEY - 应用AppKey
//   CCCYUN_API    - 彩虹域名(默认 https://u.cccyun.cc)

const LOGIN_TYPES = {
  qq: 'QQ',
  wx: '微信',
  alipay: '支付宝',
  sina: '微博',
  baidu: '百度',
  huawei: '华为',
  xiaomi: '小米',
  douyin: '抖音',
  bilibili: '哔哩哔哩',
  dingtalk: '钉钉',
  microsoft: '微软',
  gitee: 'Gitee',
  github: 'GitHub',
  google: 'Google',
};

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'qq';
    const env_ = type.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const appId = env.CCCYUN_APPID || env[`CCCYUN_${env_}_APPID`];
    const appKey = env.CCCYUN_APPKEY || env[`CCCYUN_${env_}_APPKEY`];
    const apiBase = env.CCCYUN_API || 'https://u.cccyun.cc';

    if (!appId || !appKey) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Server not configured (missing CCCYUN_APPID/CCCYUN_APPKEY env vars)',
        hint: 'In Cloudflare Pages dashboard: Settings → Environment Variables → add CCCYUN_APPID and CCCYUN_APPKEY',
        supportedTypes: Object.keys(LOGIN_TYPES),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 构建回调地址 - 必须是公网可访问的URL
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/callback`;

    const loginUrl = new URL(`${apiBase}/connect.php`);
    loginUrl.searchParams.set('act', 'login');
    loginUrl.searchParams.set('appid', appId);
    loginUrl.searchParams.set('appkey', appKey);
    loginUrl.searchParams.set('type', type);
    loginUrl.searchParams.set('redirect_uri', redirectUri);

    const res = await fetch(loginUrl.toString(), {
      headers: { 'User-Agent': 'cf-rthk/1.0' },
    });

    const data = await res.json();

    if (data.code !== 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: data.msg || 'Failed to get login URL',
        raw: data,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      type,
      url: data.url,
      qrcode: data.qrcode || null,
      redirectUri,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export { LOGIN_TYPES };
