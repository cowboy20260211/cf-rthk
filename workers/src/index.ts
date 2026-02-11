import rthk from '../api/rthk';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // API routes
    if (path.startsWith('/api/')) {
      return rthk.fetch(request);
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('RTHK Radio API - Use /api/ endpoints', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  },
};
