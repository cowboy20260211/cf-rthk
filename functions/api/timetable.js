export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const channel = url.searchParams.get('channel') || url.searchParams.get('c') || 'radio2';
  const date = url.searchParams.get('date') || url.searchParams.get('d') || getTodayHK();

  console.log(`[Timetable] Channel: ${channel}, Date: ${date}`);

  try {
    const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${date}&c=${channel}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const text = await response.text();

    console.log(`[Timetable] Success: ${response.status}`);

    return new Response(text, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
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

function getTodayHK() {
  const now = new Date();
  const hkOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const hkDate = new Date(now.getTime() + (hkOffset + localOffset) * 60000);
  return `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;
}
