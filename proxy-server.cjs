const http = require('http');
const https = require('https');

const PORT = 8787;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  console.log(`[Proxy Server] ${req.method} ${path}`);

  if (path.startsWith('/api/proxy/')) {
    const targetUrl = decodeURIComponent(path.replace('/api/proxy/', ''));
    console.log(`[Proxy] Fetching: ${targetUrl}`);

    if (!targetUrl.startsWith('http')) {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL' }));
      return;
    }

    try {
      const target = new URL(targetUrl);
      const httpModule = target.protocol === 'https:' ? https : http;

      const proxyReq = httpModule.request(
        {
          hostname: target.hostname,
          port: target.port || (target.protocol === 'https:' ? 443 : 80),
          path: target.pathname + target.search,
          method: req.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-HK,zh-TW,zh-CN,en-US,en;q=0.5',
          },
        },
        proxyRes => {
          const chunks = [];

          proxyRes.on('data', chunk => chunks.push(chunk));

          proxyRes.on('end', () => {
            const body = Buffer.concat(chunks);
            console.log(`[Proxy] Success: ${proxyRes.statusCode}, length: ${body.length}`);

            res.writeHead(proxyRes.statusCode || 200, {
              ...corsHeaders,
              'Content-Type': proxyRes.headers['content-type'] || 'text/html; charset=utf-8',
            });
            res.end(body);
          });
        }
      );

      proxyReq.on('error', error => {
        console.error('[Proxy] Error:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      });

      proxyReq.setTimeout(15000, () => {
        console.error('[Proxy] Timeout');
        proxyReq.destroy();
        res.writeHead(504, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request timeout' }));
      });

      proxyReq.end();
    } catch (error) {
      console.error('[Proxy] Error:', error);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (path === '/api/timetable') {
    const channel = url.searchParams.get('channel') || url.searchParams.get('c') || 'radio2';
    const date = url.searchParams.get('date') || url.searchParams.get('d') || getTodayHK();
    const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${date}&c=${channel}`;

    console.log(`[Timetable] Fetching: ${apiUrl}`);

    https
      .get(
        apiUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
        proxyRes => {
          const chunks = [];

          proxyRes.on('data', chunk => chunks.push(chunk));

          proxyRes.on('end', () => {
            const body = Buffer.concat(chunks);
            console.log(`[Timetable] Success: ${proxyRes.statusCode}`);

            res.writeHead(proxyRes.statusCode || 200, {
              ...corsHeaders,
              'Content-Type': 'application/json',
            });
            res.end(body);
          });
        }
      )
      .on('error', error => {
        console.error('[Timetable] Error:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      });
    return;
  }

  res.writeHead(404, { ...corsHeaders, 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

function getTodayHK() {
  const now = new Date();
  const hkOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const hkDate = new Date(now.getTime() + (hkOffset + localOffset) * 60000);
  return `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;
}

server.listen(PORT, () => {
  console.log(`\n✅ CORS Proxy Server running at http://localhost:${PORT}`);
  console.log(`📡 Proxy endpoint: http://localhost:${PORT}/api/proxy/{url}`);
  console.log(`📅 Timetable endpoint: http://localhost:${PORT}/api/timetable?channel=radio2\n`);
  console.log(`Press Ctrl+C to stop\n`);
});
