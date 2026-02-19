# Cloudflare Pages Functions - API Documentation

This directory contains Cloudflare Pages Functions that act as a proxy server to bypass CORS restrictions when fetching data from RTHK website.

## Available Endpoints

### 1. Generic Proxy

**Endpoint:** `/api/proxy/{url}`

**Description:** Fetches any URL and returns the content with CORS headers.

**Example:**

```
GET /api/proxy/https%3A%2F%2Fwww.rthk.hk%2Fradio%2Fradio2%2Fprogramme
```

**Response:**

- Content-Type: Based on the original response
- CORS headers: Access-Control-Allow-Origin: \*

### 2. Timetable API

**Endpoint:** `/api/timetable`

**Parameters:**

- `channel` (optional): Channel ID (radio1, radio2, radio3, radio4, radio5, pth). Default: radio2
- `date` (optional): Date in YYYYMMDD format. Default: Today (HK timezone)

**Example:**

```
GET /api/timetable?channel=radio2&date=20260219
```

**Response:**

```json
{
  "timetable": [
    {
      "start": "00:00",
      "end": "02:00",
      "name": "节目名称",
      "presenter": "主持人"
    }
  ]
}
```

## CORS Configuration

All endpoints return the following CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, User-Agent
Access-Control-Max-Age: 86400
```

## How It Works

1. **Frontend Request:** Browser makes request to `/api/proxy/...`
2. **Cloudflare Worker:** Intercepts request and fetches the target URL
3. **CORS Headers:** Adds proper CORS headers to the response
4. **Response:** Returns the fetched content to the browser

## Deployment

These functions are automatically deployed with Cloudflare Pages:

```bash
npm run pages:deploy
```

## Local Development

The Vite dev server proxies `/api/*` requests to `localhost:8787` (Wrangler dev server).

To test locally:

```bash
# Terminal 1: Start Wrangler dev server
npm run workers:dev

# Terminal 2: Start Vite dev server
npm run dev
```

## Security Notes

- Only HTTP/HTTPS URLs are allowed
- User-Agent header is set to mimic a real browser
- Responses are cached for 5 minutes (300 seconds) for performance
- Timeout is set to 15 seconds to prevent hanging
