/**
 * RTHK API Proxy Worker
 * Handles CORS and fetches节目数据 from RTHK
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Proxy endpoint - fetch HTML from RTHK
    if (path.startsWith('/api/proxy/')) {
      const targetUrl = decodeURIComponent(path.replace('/api/proxy/', ''));
      return handleProxyRequest(targetUrl, corsHeaders);
    }

    // RTHK timetable API
    if (path === '/api/timetable') {
      const channel = url.searchParams.get('channel') || 'radio1';
      const date = url.searchParams.get('date') || getTodayHK();
      return handleTimetableRequest(channel, date, corsHeaders);
    }

    // API endpoints
    if (path === '/api/programs') {
      const channel = url.searchParams.get('channel') || 'radio1';
      return handleProgramsRequest(channel, corsHeaders);
    }

    if (path.startsWith('/api/program/')) {
      const parts = path.split('/');
      const channel = parts[3];
      const programId = parts[4];
      return handleProgramRequest(channel, programId, corsHeaders);
    }

    if (path.startsWith('/api/episodes/')) {
      const parts = path.split('/');
      const channel = parts[3];
      const programId = parts[4];
      return handleEpisodesRequest(channel, programId, corsHeaders);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

async function handleProxyRequest(
  targetUrl: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-HK,zh-TW,zh-CN,en-US,en;q=0.5',
      },
    });

    const text = await response.text();

    return new Response(text, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function getTodayHK(): string {
  const now = new Date();
  const hkOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const hkDate = new Date(now.getTime() + (hkOffset + localOffset) * 60000);
  return `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;
}

async function handleTimetableRequest(
  channel: string,
  date: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const proxyUrl = `https://www.rthk.hk/radio/getTimetable?d=${date}&c=${channel}`;
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch timetable' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleProgramsRequest(
  channel: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const programs: Record<string, any[]> = {
    radio1: [
      { id: 'morning', title: '晨光第一線', schedule: '星期一至六 06:00-10:00', duration: 240 },
      { id: 'millennium', title: '千禧年代', schedule: '星期一至五 08:00-08:30', duration: 30 },
      { id: 'freedom', title: '自由風自由Phone', schedule: '星期一至五 16:00-17:00', duration: 60 },
      { id: 'health', title: '精靈一點', schedule: '星期一至五 13:00-14:00', duration: 60 },
      { id: 'news', title: '新聞天地', schedule: '每日多個时段', duration: 30 },
      { id: 'finance', title: '財經即時通', schedule: '星期一至五 07:00-08:00', duration: 60 },
    ],
    radio2: [
      { id: 'keepuco', title: '輕談淺唱不夜天', schedule: '星期一至五 02:00-06:00', duration: 240 },
      { id: 'musiclover', title: '音樂情人', schedule: '星期一至五 21:00-22:00', duration: 60 },
      {
        id: 'madelee',
        title: 'Made in Hong Kong 李志剛',
        schedule: '星期一至五 13:00-15:00',
        duration: 120,
      },
      { id: 'crazylife', title: '瘋Show快活人', schedule: '星期一至五 10:00-12:00', duration: 120 },
      { id: 'music', title: '音樂中年', schedule: '星期一至五 12:00-13:00', duration: 60 },
      { id: '三五成群', title: '三五成群', schedule: '星期一至五 15:00-17:00', duration: 120 },
    ],
    radio5: [
      { id: 'culture', title: '文化星空', schedule: '星期一至五 10:00-12:00', duration: 120 },
      { id: 'education', title: '教育新天地', schedule: '星期一至五 14:00-15:00', duration: 60 },
      { id: 'sports', title: '體育世界', schedule: '週末多個时段', duration: 60 },
      { id: 'community', title: '社區時事', schedule: '星期一至五 08:00-09:00', duration: 60 },
      { id: 'senior', title: '長者天地', schedule: '星期一至五 16:00-17:00', duration: 60 },
    ],
  };

  return new Response(JSON.stringify(programs[channel] || []), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleProgramRequest(
  channel: string,
  programId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const program = getProgramInfo(channel, programId);
  if (!program) {
    return new Response(JSON.stringify({ error: 'Program not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(program), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleEpisodesRequest(
  channel: string,
  programId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const episodes = generateEpisodes(channel, programId);
  return new Response(JSON.stringify(episodes), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getProgramInfo(channel: string, programId: string): any {
  const allPrograms: Record<string, any[]> = {
    radio1: [
      { id: 'morning', title: '晨光第一線', schedule: '星期一至六 06:00-10:00', duration: 240 },
      { id: 'millennium', title: '千禧年代', schedule: '星期一至五 08:00-08:30', duration: 30 },
      { id: 'freedom', title: '自由風自由Phone', schedule: '星期一至五 16:00-17:00', duration: 60 },
      { id: 'health', title: '精靈一點', schedule: '星期一至五 13:00-14:00', duration: 60 },
      { id: 'news', title: '新聞天地', schedule: '每日多個时段', duration: 30 },
      { id: 'finance', title: '財經即時通', schedule: '星期一至五 07:00-08:00', duration: 60 },
    ],
    radio2: [
      { id: 'keepuco', title: '輕談淺唱不夜天', schedule: '星期一至五 02:00-06:00', duration: 240 },
      { id: 'musiclover', title: '音樂情人', schedule: '星期一至五 21:00-22:00', duration: 60 },
      {
        id: 'madelee',
        title: 'Made in Hong Kong 李志剛',
        schedule: '星期一至五 13:00-15:00',
        duration: 120,
      },
      { id: 'crazylife', title: '瘋Show快活人', schedule: '星期一至五 10:00-12:00', duration: 120 },
      { id: 'music', title: '音樂中年', schedule: '星期一至五 12:00-13:00', duration: 60 },
      { id: '三五成群', title: '三五成群', schedule: '星期一至五 15:00-17:00', duration: 120 },
    ],
    radio5: [
      { id: 'culture', title: '文化星空', schedule: '星期一至五 10:00-12:00', duration: 120 },
      { id: 'education', title: '教育新天地', schedule: '星期一至五 14:00-15:00', duration: 60 },
      { id: 'sports', title: '體育世界', schedule: '週末多個时段', duration: 60 },
      { id: 'community', title: '社區時事', schedule: '星期一至五 08:00-09:00', duration: 60 },
      { id: 'senior', title: '長者天地', schedule: '星期一至五 16:00-17:00', duration: 60 },
    ],
  };

  return allPrograms[channel]?.find(p => p.id === programId) || null;
}

function generateEpisodes(channel: string, programId: string): any[] {
  const program = getProgramInfo(channel, programId);
  const duration = (program?.duration || 60) * 60; // Convert to seconds
  const episodes = [];
  const today = new Date();

  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();

    // Skip weekends for most programs (except sports)
    const skipWeekends = !['sports'].includes(programId);
    if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    const dateStr = date.toISOString().split('T')[0];
    const dateFormatted = `${date.getMonth() + 1}月${date.getDate()}日`;

    episodes.push({
      id: `${programId}-${dateStr}`,
      programId,
      channelId: channel,
      title: `${dateFormatted} 足本重溫`,
      publishDate: dateStr,
      duration: duration,
      audioUrl: `https://rthkaod2022.akamaized.net/m4a/radio/archive/${channel}/${programId}/m4a/${dateStr.replace(/-/g, '')}.m4a/index_0_a.m3u8`,
    });
  }

  return episodes;
}
