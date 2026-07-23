// 获取当前登录用户
// GET /api/auth/user
// 根据cookie中的session id查询KV，返回当前登录用户信息

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const cookie = request.headers.get('cookie') || '';
    const sessionMatch = cookie.match(/rthk_session=([a-f0-9]+)/);

    if (!sessionMatch) {
      return new Response(JSON.stringify({ ok: true, user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://cf-rthk.pages.dev', 'Access-Control-Allow-Credentials': 'true' },
      });
    }

    const sessionId = sessionMatch[1];
    const sessionKey = `session:${sessionId}`;

    const data = await env.RTHK_FAVORITES.get(sessionKey);

    if (!data) {
      return new Response(JSON.stringify({ ok: true, user: null, reason: 'session_expired' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://cf-rthk.pages.dev', 'Access-Control-Allow-Credentials': 'true' },
      });
    }

    const userInfo = JSON.parse(data);

    // 不返回access_token等敏感字段
    const safeUser = {
      type: userInfo.type,
      typeLabel: userInfo.typeLabel,
      socialUid: userInfo.socialUid,
      nickname: userInfo.nickname,
      faceimg: userInfo.faceimg,
      gender: userInfo.gender,
      location: userInfo.location,
      loginAt: userInfo.loginAt,
    };

    return new Response(JSON.stringify({ ok: true, user: safeUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://cf-rthk.pages.dev', 'Access-Control-Allow-Credentials': 'true' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://cf-rthk.pages.dev',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
