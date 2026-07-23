// 退出登录
// POST /api/auth/logout

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const cookie = request.headers.get('cookie') || '';
    const sessionMatch = cookie.match(/rthk_session=([a-f0-9]+)/);

    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const sessionKey = `session:${sessionId}`;
      await env.RTHK_FAVORITES.delete(sessionKey);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://cf-rthk.pages.dev',
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie': 'rthk_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
