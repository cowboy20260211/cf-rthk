export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const now = new Date();
    const hkDate = new Date(now.getTime() + 8 * 3600000);
    const dateKey = hkDate.toISOString().slice(0, 10);
    const timestamp = hkDate.toISOString();

    const cf = request.cf || {};
    const entry = {
      timestamp,
      ip: request.headers.get('cf-connecting-ip') || 'unknown',
      country: cf.country || cf.countryCode || 'unknown',
      city: cf.city || 'unknown',
      region: cf.region || cf.regionName || 'unknown',
      asn: cf.asn || 'unknown',
      ua: (request.headers.get('user-agent') || '').slice(0, 200),
      browser: body.browser || 'unknown',
      os: body.os || 'unknown',
      device: body.device || 'unknown',
      fingerprint: body.fingerprint || 'unknown',
      screen: body.screen || 'unknown',
      lang: body.lang || request.headers.get('accept-language') || 'unknown',
      path: body.path || '/',
      referrer: body.referrer || '',
    };

    const key = `log:${dateKey}`;
    let logs = [];
    try {
      const existing = await env.RTHK_FAVORITES.get(key);
      if (existing) {
        logs = JSON.parse(existing);
      }
    } catch (e) {}

    logs.push(entry);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);
    const cutoffDate = new Date(thirtyDaysAgo.getTime() + 8 * 3600000).toISOString().slice(0, 10);
    await env.RTHK_FAVORITES.put(key, JSON.stringify(logs), {
      expirationTtl: 31 * 24 * 3600,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
