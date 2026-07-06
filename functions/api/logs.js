export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const all = url.searchParams.get('all');
    const limit = parseInt(url.searchParams.get('limit') || '500', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (all === '1') {
      const allLogs = [];
      const now = new Date();
      for (let i = 0; i < 31; i++) {
        const d = new Date(now.getTime() - i * 24 * 3600000 + 8 * 3600000);
        const dateKey = d.toISOString().slice(0, 10);
        const key = `log:${dateKey}`;
        try {
          const data = await env.RTHK_FAVORITES.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            allLogs.push(...parsed);
          }
        } catch (e) {}
      }

      allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const total = allLogs.length;
      const paged = allLogs.slice(offset, offset + limit);

      return new Response(JSON.stringify({ ok: true, total, logs: paged }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (date) {
      const key = `log:${date}`;
      try {
        const data = await env.RTHK_FAVORITES.get(key);
        const logs = data ? JSON.parse(data) : [];
        logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const total = logs.length;
        const paged = logs.slice(offset, offset + limit);
        return new Response(JSON.stringify({ ok: true, total, logs: paged }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: true, total: 0, logs: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    const dates = [];
    const now = new Date();
    for (let i = 0; i < 31; i++) {
      const d = new Date(now.getTime() - i * 24 * 3600000 + 8 * 3600000);
      const dateKey = d.toISOString().slice(0, 10);
      const key = `log:${dateKey}`;
      try {
        const data = await env.RTHK_FAVORITES.get(key);
        if (data) {
          const logs = JSON.parse(data);
          dates.push({ date: dateKey, count: logs.length });
        }
      } catch (e) {}
    }

    return new Response(JSON.stringify({ ok: true, dates }), {
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

export async function onRequestDelete(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (date) {
      const key = `log:${date}`;
      await env.RTHK_FAVORITES.delete(key);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const now = new Date();
    for (let i = 0; i < 31; i++) {
      const d = new Date(now.getTime() - i * 24 * 3600000 + 8 * 3600000);
      const dateKey = d.toISOString().slice(0, 10);
      await env.RTHK_FAVORITES.delete(`log:${dateKey}`);
    }

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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
