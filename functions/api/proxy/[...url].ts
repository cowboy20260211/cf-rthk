export async function onRequest(context: any) {
  const { request, params } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const fullPath = url.pathname.replace('/api/proxy/', '');
    const targetUrl = decodeURIComponent(fullPath);

    console.log(`[Proxy] Target URL: ${targetUrl}`);

    if (!targetUrl.startsWith('http')) {
      return new Response(JSON.stringify({ error: 'Invalid URL: ' + targetUrl }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-HK,zh-TW,zh-CN,en-US,en;q=0.5',
      },
    });

    const contentType = response.headers.get('Content-Type') || 'text/html; charset=utf-8';
    const text = await response.text();

    console.log(`[Proxy] Success: ${response.status}, length: ${text.length}`);

    return new Response(text, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('[Proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
