/**
 * Cloudflare Pages Functions Worker
 * Handles all API routes for RTHK Radio
 */

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
    'Access-Control-Max-Age': '86400',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Proxy endpoint - fetch content from RTHK
  if (path.startsWith('/api/proxy/')) {
    const targetUrl = decodeURIComponent(path.replace('/api/proxy/', ''));

    console.log(`[Proxy] Fetching: ${targetUrl}`);

    if (!targetUrl.startsWith('http')) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
    } catch (error) {
      console.error('[Proxy] Error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Failed to fetch' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Timetable API
  if (path === '/api/timetable') {
    const channel = url.searchParams.get('channel') || 'radio2';
    const date = url.searchParams.get('date') || getTodayHK();
    const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${date}&c=${channel}`;

    console.log(`[Timetable] Fetching: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const text = await response.text();

      return new Response(text, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      });
    } catch (error) {
      console.error('[Timetable] Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // 404 for unknown routes
  return new Response(JSON.stringify({ error: 'Not Found', path }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getTodayHK() {
  const now = new Date();
  const hkOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const hkDate = new Date(now.getTime() + (hkOffset + localOffset) * 60000);
  return `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;
}
