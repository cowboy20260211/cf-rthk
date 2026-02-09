export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/live')) {
      return handleLiveRequest(request, env);
    }

    if (path.startsWith('/api/programs')) {
      return handleProgramRequest(request, env);
    }

    if (path.startsWith('/api/favorites')) {
      return handleFavoriteRequest(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

interface Env {
  FAVORITES: KVNamespace;
  HISTORY: KVNamespace;
  SETTINGS: KVNamespace;
}

async function handleLiveRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/live' && request.method === 'GET') {
    const channels = [
      {
        id: 'radio1',
        name: '第一台',
        nameEn: 'Radio 1',
        streamUrl: 'https://stream.rthk.hk/radio1live',
        logo: 'https://www.rthk.hk/radio/radio1/assets/images/logo.png',
        description: '香港电台第一台 - 新闻、财经、时事',
      },
      {
        id: 'radio2',
        name: '第二台',
        nameEn: 'Radio 2',
        streamUrl: 'https://stream.rthk.hk/radio2live',
        logo: 'https://www.rthk.hk/radio/radio2/assets/images/logo.png',
        description: '香港电台第二台 - 流行音乐、青年节目',
      },
      {
        id: 'radio5',
        name: '第五台',
        nameEn: 'Radio 5',
        streamUrl: 'https://stream.rthk.hk/radio5live',
        logo: 'https://www.rthk.hk/radio/radio5/assets/images/logo.png',
        description: '香港电台第五台 - 文化、教育、社区',
      },
    ];

    return new Response(JSON.stringify(channels), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleProgramRequest(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Program API' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleFavoriteRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const favorites = await env.FAVORITES.get('user_favorites');
    return new Response(favorites || '[]', {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const favorites = await env.FAVORITES.get('user_favorites');
    const current = favorites ? JSON.parse(favorites) : [];
    current.push({ ...body, id: crypto.randomUUID(), addedAt: new Date().toISOString() });
    await env.FAVORITES.put('user_favorites', JSON.stringify(current));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
