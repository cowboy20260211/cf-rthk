// RTHK Radio API Worker
// 香港电台节目数据 API

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API endpoints
    if (path === '/api/programs') {
      const channel = url.searchParams.get('channel') || 'radio1';
      return handlePrograms(channel, corsHeaders);
    }

    if (path.startsWith('/api/episodes/')) {
      const parts = path.split('/');
      const channel = parts[3];
      const programId = parts[4];
      return handleEpisodes(channel, programId, corsHeaders);
    }

    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'RTHK Radio API',
      endpoints: [
        '/api/programs?channel=radio1|radio2|radio5',
        '/api/episodes/{channel}/{programId}'
      ]
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

function handlePrograms(channel, corsHeaders) {
  const programs = {
    radio1: [
      { id: 'morning', title: '晨光第一線', duration: 240, schedule: '06:00-10:00' },
      { id: 'millennium', title: '千禧年代', duration: 30, schedule: '08:00-08:30' },
      { id: 'freedom', title: '自由風自由Phone', duration: 60, schedule: '16:00-17:00' },
      { id: 'health', title: '精靈一點', duration: 60, schedule: '13:00-14:00' },
    ],
    radio2: [
      { id: 'keepuco', title: '輕談淺唱不夜天', duration: 240, schedule: '02:00-06:00' },
      { id: 'musiclover', title: '音樂情人', duration: 60, schedule: '21:00-22:00' },
      { id: 'madelee', title: 'Made in Hong Kong 李志剛', duration: 120, schedule: '13:00-15:00' },
      { id: 'crazylife', title: '瘋Show快活人', duration: 120, schedule: '10:00-12:00' },
    ],
    radio5: [
      { id: 'culture', title: '文化星空', duration: 120, schedule: '10:00-12:00' },
      { id: 'education', title: '教育新天地', duration: 60, schedule: '14:00-15:00' },
      { id: 'sports', title: '體育世界', duration: 60, schedule: '週末' },
    ],
  };

  return new Response(JSON.stringify(programs[channel] || []), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function handleEpisodes(channel, programId, corsHeaders) {
  const durations = {
    morning: 240, millennium: 30, freedom: 60, health: 60,
    keepuco: 240, musiclover: 60, madelee: 120, crazylife: 120,
    culture: 120, education: 60, sports: 60,
  };

  const duration = (durations[programId] || 60) * 60;
  const episodes = [];
  const today = new Date();

  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    
    if (!['sports'].includes(programId) && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    const dateStr = date.toISOString().split('T')[0];
    const dateFormatted = (date.getMonth() + 1) + '月' + date.getDate() + '日';
    
    episodes.push({
      id: programId + '-' + dateStr,
      programId,
      channelId: channel,
      title: dateFormatted + ' 足本重溫',
      publishDate: dateStr,
      duration: duration,
      audioUrl: 'https://rthkaod2022.akamaized.net/m4a/radio/archive/' + channel + '/' + programId + '/m4a/' + dateStr.replace(/-/g, '') + '.m4a/index_0_a.m3u8',
      description: Math.floor(duration / 60) + '分鐘節目',
    });
  }

  return new Response(JSON.stringify(episodes), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
