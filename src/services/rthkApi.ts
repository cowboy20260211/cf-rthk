// RTHK API Service - Data for programs and episodes

import * as cheerio from 'cheerio';

export interface Program {
  id: string;
  title: string;
  titleEn?: string;
  channel: string;
  channelId: string;
  description: string;
  archiveUrl?: string;
  imageUrl?: string;
  host?: string;
  schedule?: string;
  episodeCount?: number;
  isPopular?: boolean;
}

export interface Episode {
  id: string;
  programId: string;
  channelId: string;
  title: string;
  publishDate: string;
  duration?: number;
  audioUrl?: string;
  description?: string;
  programTitle?: string;
}

export interface Channel {
  id: string;
  name: string;
  nameEn: string;
  frequency: string;
  description: string;
  color: string;
}

// RTHK Archive base URL
const RTHK_BASE_URL = 'https://www.rthk.hk';

const CACHE_DURATION = 30 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const programCache: Map<string, CacheEntry<Program[]>> = new Map();
let popularProgramsCache: CacheEntry<Program[]> | null = null;

// Use internal proxy API instead of third-party proxies
async function fetchWithProxies(url: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/proxy/${encodeURIComponent(url)}`;

    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const text = await res.text();
      return text;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

// Generate archive URL for a program
export function getArchiveUrl(channelId: string, programId: string, dateStr: string): string {
  const dateWithoutDash = dateStr.replace(/-/g, '');
  return (
    'https://rthkaod2022.akamaized.net/m4a/radio/archive/' +
    channelId +
    '/' +
    programId +
    '/m4a/' +
    dateWithoutDash +
    '.m4a/index_0_a.m3u8'
  );
}

// Generate episodes based on program schedule
function generateEpisodesFromSchedule(programId: string, channelId: string): Episode[] {
  const episodes: Episode[] = [];
  const today = new Date();

  // Program durations in minutes
  const durations: Record<string, number> = {
    morning: 240,
    millennium: 30,
    freedom: 60,
    health: 60,
    news: 30,
    finance: 60,
    keepuco: 240,
    musiclover: 60,
    madelee: 120,
    crazylife: 120,
    music: 60,
    三五成群: 120,
    culture: 120,
    education: 60,
    sports: 60,
    community: 60,
    senior: 60,
  };

  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    if (!['sports'].includes(programId) && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    const dateStr = date.toISOString().split('T')[0];
    const durationSec = (durations[programId] || 60) * 60;

    episodes.push({
      id: programId + '-' + dateStr,
      programId,
      channelId,
      title: dateStr + ' 足本重溫',
      publishDate: dateStr,
      duration: durationSec,
      audioUrl: getArchiveUrl(channelId, programId, dateStr),
      description: '節目足本重溫',
    });
  }
  return episodes;
}

// Fetch episodes from RTHK via proxy
export async function fetchEpisodesFromRTHK(
  channelId: string,
  programId: string
): Promise<Episode[]> {
  try {
    const programUrl = RTHK_BASE_URL + '/radio/' + channelId + '/programme/' + programId;
    const html = await fetchWithProxies(programUrl);

    if (!html) {
      return generateEpisodesFromSchedule(programId, channelId);
    }

    const $ = cheerio.load(html);
    const episodes: Episode[] = [];
    const seenIds = new Set<string>();

    // 方法1: 查找 data-episode 属性和 catBlockDate 日期
    $('[data-episode]').each((_i, el) => {
      const $el = $(el);
      const episodeId = $el.attr('data-episode');
      if (!episodeId || seenIds.has(episodeId)) return;

      const title = $el.attr('title') || '';

      // 查找日期: 在同一元素或相邻元素中的 .catBlockDate p
      let dateText = $el.find('.catBlockDate p').text() || $el.find('.date, .ep-date').text();

      // 如果当前元素没有日期，查找相邻的 .catBlockDate
      if (!dateText) {
        const parent = $el.closest('a.progPop, .progItem');
        dateText = parent.find('.catBlockDate p').text() || parent.find('.date, .ep-date').text();
      }

      // 如果还是没有，查找前面或后面的 .catBlockDate
      if (!dateText) {
        dateText =
          $el.prev('.catBlockDate').find('p').text() ||
          $el.next('.catBlockDate').find('p').text() ||
          $el.parent().find('.catBlockDate p').text();
      }

      if (!dateText) return;

      seenIds.add(episodeId);

      // 解析日期格式: DD/MM/YYYY 或 YYYY年M月D日
      let dateStr = '';

      // 尝试 DD/MM/YYYY 格式
      const dmyMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmyMatch) {
        dateStr = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      } else {
        // 尝试 YYYY年M月D日 格式
        const ymdMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})/);
        if (ymdMatch) {
          dateStr = `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
        }
      }

      if (!dateStr) return;

      episodes.push({
        id: programId + '-' + dateStr,
        programId,
        channelId,
        title: title || dateStr + ' 足本重溫',
        publishDate: dateStr,
        duration: 3600,
        audioUrl: getArchiveUrl(channelId, programId, dateStr),
        description: '',
      });
    });

    // 如果上面方法没找到，尝试查找 /episode/ 链接
    if (episodes.length === 0) {
      $('a[href*="/episode/"]').each((_i, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.attr('title') || $el.text().trim();

        const episodeMatch = href.match(/\/episode\/(\d+)/);
        if (!episodeMatch) return;

        const episodeId = episodeMatch[1];
        if (seenIds.has(episodeId)) return;
        seenIds.add(episodeId);

        // 查找日期
        const dateText = $el
          .closest('.progItem, .episode-item, li, div')
          .find('.catBlockDate p, .date, .ep-date')
          .text();

        let dateStr = '';
        const dmyMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmyMatch) {
          dateStr = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        } else {
          const ymdMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})/);
          if (ymdMatch) {
            dateStr = `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
          }
        }

        if (!dateStr) {
          const titleDateMatch = title.match(/(\d{4})年(\d{1,2})月(\d{1,2})/);
          if (titleDateMatch) {
            dateStr = `${titleDateMatch[1]}-${titleDateMatch[2].padStart(2, '0')}-${titleDateMatch[3].padStart(2, '0')}`;
          }
        }

        if (!dateStr) return;

        episodes.push({
          id: programId + '-' + dateStr,
          programId,
          channelId,
          title: title || dateStr + ' 足本重溫',
          publishDate: dateStr,
          duration: 3600,
          audioUrl: getArchiveUrl(channelId, programId, dateStr),
          description: '',
        });
      });
    }

    // 按日期倒序排序
    episodes.sort((a, b) => b.publishDate.localeCompare(a.publishDate));

    if (episodes.length === 0) {
      return generateEpisodesFromSchedule(programId, channelId);
    }

    return episodes;
  } catch {
    return generateEpisodesFromSchedule(programId, channelId);
  }
}

// Channel definitions
export const CHANNELS: Record<string, Channel> = {
  radio1: {
    id: 'radio1',
    name: '第一台',
    nameEn: 'Radio 1',
    frequency: 'FM 92.6MHz',
    description: '新聞、財經、時事',
    color: 'bg-red-600',
  },
  radio2: {
    id: 'radio2',
    name: '第二台',
    nameEn: 'Radio 2',
    frequency: 'FM 94.8MHz',
    description: '流行音樂、青年節目',
    color: 'bg-blue-600',
  },
  radio5: {
    id: 'radio5',
    name: '第五台',
    nameEn: 'Radio 5',
    frequency: 'AM 783kHz',
    description: '文化、教育、社區',
    color: 'bg-green-600',
  },
};

export const PROGRAMS: Record<string, Program[]> = {
  radio1: [],
  radio2: [],
  radio5: [],
};

export const POPULAR_PROGRAMS: Program[] = [];

// API functions
export const rthkApi = {
  getChannels(): Channel[] {
    return Object.values(CHANNELS);
  },
  getChannel(channelId: string): Channel | undefined {
    return CHANNELS[channelId];
  },
  getPopularPrograms(): Program[] {
    return POPULAR_PROGRAMS;
  },
  getProgramsByChannel(channelId: string): Program[] {
    return PROGRAMS[channelId] || [];
  },
  getAllPrograms(): Program[] {
    return Object.values(PROGRAMS).flat();
  },

  async getAllProgramsPaged(
    channelId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ programs: Program[]; hasMore: boolean }> {
    const allPrograms = PROGRAMS[channelId] || [];
    const start = (page - 1) * pageSize;
    return {
      programs: allPrograms.slice(start, start + pageSize),
      hasMore: start + pageSize < allPrograms.length,
    };
  },

  async getProgramDetail(
    channelId: string,
    programId: string
  ): Promise<{ program: Program; episodes: Episode[] } | null> {
    const programIdNormalized = decodeURIComponent(programId);
    const scrapedPrograms = await fetchAllProgramsFromArchive(channelId);

    let program = scrapedPrograms.find(p => p.id === programIdNormalized);

    if (!program) {
      const staticPrograms = PROGRAMS[channelId] || [];
      program = staticPrograms.find(p => p.id === programId);
    }

    if (!program) {
      const cachedPopular = popularProgramsCache?.data || [];
      const popularProgram = cachedPopular.find(
        p => p.id === programIdNormalized && p.channelId === channelId
      );
      if (popularProgram) {
        program = popularProgram;
      }
    }

    if (!program) {
      const channelNameMap: Record<string, string> = {
        radio1: '第一台',
        radio2: '第二台',
        radio5: '第五台',
      };
      program = {
        id: programIdNormalized,
        title: programIdNormalized,
        channel: channelNameMap[channelId] || channelId,
        channelId: channelId,
        description: '節目重溫',
        episodeCount: 30,
      };
    }

    const episodes = await fetchEpisodesFromRTHK(channelId, program.id);
    return { program, episodes };
  },

  searchPrograms(query: string): Program[] {
    const all = this.getAllPrograms();
    const q = query.toLowerCase();
    return all.filter(
      p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  },
};

export default rthkApi;

// Generate fallback URLs for error recovery
export function getFallbackUrls(channelId: string, programId: string, dateStr: string): string[] {
  const dateWithoutDash = dateStr.replace(/-/g, '');

  return [
    `https://rthkaod2022.akamaized.net/m4a/radio/archive/${channelId}/${programId}/m4a/${dateWithoutDash}.m4a/index_0_a.m3u8`,
    `https://rthkaod2022.akamaized.net/m4a/radio/archive/${channelId}/${programId}/m4a/${dateWithoutDash}.m4a/master.m3u8`,
    `https://rthkaod2022.akamaized.net/m4a/radio/${channelId}/${programId}/${dateWithoutDash}.m4a/index_0_a.m3u8`,
  ];
}

// Dynamically query RTHK website for program IDs instead of using hardcoded mapping
export async function fetchAllProgramsFromArchive(channelId?: string): Promise<Program[]> {
  const targetChannel = channelId || 'radio2';
  const cacheKey = `programs_${targetChannel}`;

  const cached = programCache.get(cacheKey);
  const isTestMode = window.location.href.includes('test-archive');
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION && !isTestMode) {
    return cached.data;
  }

  try {
    const targetChannel = channelId || 'radio2';

    let popularProgramIds = new Set<string>();
    try {
      const popularPrograms = await fetchPopularPrograms();
      popularPrograms.forEach(p => popularProgramIds.add(p.id));
    } catch (e) {
      // Ignore errors
    }

    const url = `https://www.rthk.hk/radio/${targetChannel}`;

    const html = await fetchWithProxies(url);

    if (!html) {
      const staticPrograms = PROGRAMS[targetChannel] || [];
      return staticPrograms.map(p => ({ ...p, isPopular: popularProgramIds.has(p.id) }));
    }

    const $ = cheerio.load(html);
    const programs: Program[] = [];
    const channelNameMap: Record<string, string> = {
      radio1: '第一台',
      radio2: '第二台',
      radio3: '第三台',
      radio4: '第四台',
      radio5: '第五台',
      pth: '普通話台',
    };
    const channelName = channelNameMap[targetChannel] || '未知頻道';

    const seenIds = new Set<string>();

    const catchupSection = $('div.catupWrap.clearfix, div.catupWrap');

    if (catchupSection.length) {
      const linksInCatchup = catchupSection.find('a[href*="/programme/"]');

      linksInCatchup.each((_: any, element) => {
        const link = $(element).attr('href') || '';
        const title = $(element).attr('title')?.trim() || '';

        if (!link || title.length < 2) return;

        const programmeMatch = link.match(/\/radio\/([^\/]+)\/programme\/([^\/?#]+)/);
        if (!programmeMatch) return;

        const channelInUrl = programmeMatch[1];
        const programId = programmeMatch[2];

        if (channelInUrl !== targetChannel) return;
        if (!programId || seenIds.has(programId)) return;

        seenIds.add(programId);
        const isPopular = popularProgramIds.has(programId);

        programs.push({
          id: programId,
          title: title,
          channel: channelName,
          channelId: targetChannel,
          description: `${title} 节目重温`,
          archiveUrl: link.startsWith('http') ? link : `https://www.rthk.hk${link}`,
          episodeCount: 30,
          schedule: '',
          isPopular: isPopular,
        });
      });
    }

    programCache.set(cacheKey, { data: programs, timestamp: Date.now() });

    return programs;
  } catch (error) {
    return [];
  }
}

// Fetch popular programs from RTHK archive page
export async function fetchPopularPrograms(): Promise<Program[]> {
  if (popularProgramsCache && Date.now() - popularProgramsCache.timestamp < CACHE_DURATION) {
    return popularProgramsCache.data;
  }

  try {
    const url = 'https://www.rthk.hk/archive';

    const html = await fetchWithProxies(url);

    if (!html) {
      return getStaticPopularPrograms();
    }

    const $ = cheerio.load(html);
    const popularPrograms: Program[] = [];
    const seenIds = new Set<string>();

    const programLinks = $('a[href*="/radio/radio"]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      return href.includes('/programme/') && href.includes('/episode/');
    });

    const programIdToTitle: Record<string, string> = {
      morningsuite: '晨光第一線',
      keepuco: '輕談淺唱不夜天',
      musiclover: '音樂情人',
      seesaw: '守下留情',
      Free_as_the_wind: '講東講西',
      threesacrowd: '三五成群',
      crazyandhappy: '瘋Show快活人',
      madeinhk: 'Made in Hong Kong 李志剛',
      musiclife: '音樂中年',
      HK2000: '千禧年代',
      hktoday: '晨早新聞天地',
      relax_morning: '自在早晨',
      hellosunrise: '清晨爽利',
    };

    programLinks.each((_: any, element) => {
      const $el = $(element);
      const link = $el.attr('href') || '';
      const titleFromAttr = $el.attr('title')?.trim() || '';

      if (!link.includes('/programme/') || !link.includes('/episode/')) {
        return;
      }

      const programmeUrl = link.split('/episode/')[0];
      const match = programmeUrl.match(/\/programme\/([^\/]+)/);
      let programId = match ? match[1] : '';

      if (!programId || seenIds.has(programId)) {
        return;
      }

      seenIds.add(programId);

      let title = titleFromAttr || programIdToTitle[programId] || '';

      if (!title) {
        const rawTitle = $el.text().trim();
        const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}/;
        let cleaned = rawTitle.replace(datePattern, '').trim();

        const titleMatch = cleaned.match(/^([^0-9]+?)(?:\1|$)/);
        if (titleMatch) {
          title = titleMatch[1].trim();
        } else {
          const parts = cleaned.split(/[\d]/);
          title = parts[0].trim();
        }
      }

      if (!title || title.length < 2) {
        return;
      }

      let channelId = 'radio2';
      let channelName = '第二台';

      if (programmeUrl.includes('/radio/radio1/')) {
        channelId = 'radio1';
        channelName = '第一台';
      } else if (programmeUrl.includes('/radio/radio2/')) {
        channelId = 'radio2';
        channelName = '第二台';
      } else if (programmeUrl.includes('/radio/radio5/')) {
        channelId = 'radio5';
        channelName = '第五台';
      }

      popularPrograms.push({
        id: programId,
        title: title,
        channel: channelName,
        channelId: channelId,
        description: `${title} 热门节目`,
        archiveUrl: programmeUrl,
        episodeCount: 30,
        schedule: '',
      });
    });

    if (popularPrograms.length > 0) {
      popularProgramsCache = { data: popularPrograms, timestamp: Date.now() };
      return popularPrograms;
    }

    return getDefaultPopularPrograms();
  } catch (error) {
    return getDefaultPopularPrograms();
  }
}

// Default popular programmes as fallback
function getDefaultPopularPrograms(): Program[] {
  // Based on typical popular RTHK programmes
  return [
    {
      id: 'keepuco',
      title: '輕談淺唱不夜天',
      channel: '第二台',
      channelId: 'radio2',
      description: '音樂訪談節目',
      archiveUrl: 'https://www.rthk.hk/radio/radio2/programme/keepuco',
      episodeCount: 30,
      schedule: '星期一至五 02:00-06:00',
    },
    {
      id: 'musiclover',
      title: '音樂情人',
      channel: '第二台',
      channelId: 'radio2',
      description: '經典音樂節目',
      archiveUrl: 'https://www.rthk.hk/radio/radio2/programme/musiclover',
      episodeCount: 30,
      schedule: '星期一至五 21:00-22:00',
    },
    {
      id: 'morning',
      title: '晨光第一線',
      channel: '第一台',
      channelId: 'radio1',
      description: '晨早新聞時事節目',
      archiveUrl: 'https://www.rthk.hk/radio/radio1/programme/morning',
      episodeCount: 30,
      schedule: '星期一至六 06:00-10:00',
    },
    {
      id: 'crazylife',
      title: '瘋Show快活人',
      channel: '第二台',
      channelId: 'radio2',
      description: '輕鬆娛樂節目',
      archiveUrl: 'https://www.rthk.hk/radio/radio2/programme/crazylife',
      episodeCount: 30,
      schedule: '星期一至五 10:00-12:00',
    },
    {
      id: 'madelee',
      title: 'Made in Hong Kong 李志剛',
      channel: '第二台',
      channelId: 'radio2',
      description: '香港音樂文化節目',
      archiveUrl: 'https://www.rthk.hk/radio/radio2/programme/madelee',
      episodeCount: 30,
      schedule: '星期一至五 13:00-15:00',
    },
    {
      id: 'millennium',
      title: '千禧年代',
      channel: '第一台',
      channelId: 'radio1',
      description: '新聞時事評論節目',
      archiveUrl: 'https://www.rthk.hk/radio/radio1/programme/millennium',
      episodeCount: 30,
      schedule: '星期一至五 08:00-08:30',
    },
  ];
}

function getStaticPopularPrograms(): Program[] {
  return [];
}

const liveProgramCache: {
  data: { channel: string; program: string; host: string; time: string } | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

export async function fetchCurrentLiveProgram(
  channelId: string
): Promise<{ program: string; host: string; time: string } | null> {
  const now = Date.now();

  if (
    liveProgramCache.data &&
    liveProgramCache.timestamp &&
    now - liveProgramCache.timestamp < 5 * 60 * 1000
  ) {
    if (liveProgramCache.data?.channel === channelId) {
      return {
        program: liveProgramCache.data.program,
        host: liveProgramCache.data.host,
        time: liveProgramCache.data.time,
      };
    }
  }

  try {
    const currentDate = new Date();
    const hkOffset = 8 * 60;
    const localOffset = currentDate.getTimezoneOffset();
    const hkDate = new Date(currentDate.getTime() + (hkOffset + localOffset) * 60000);
    const todayStr = `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;

    const currentHour = hkDate.getHours();
    const currentMinute = hkDate.getMinutes();
    const currentTimeValue = currentHour * 60 + currentMinute;

    const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${todayStr}&c=${channelId}`;
    const proxyUrl = `/api/proxy/${encodeURIComponent(apiUrl)}`;

    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return null;
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return null;
    }

    if (!data?.timetable || !Array.isArray(data.timetable)) {
      return null;
    }

    let result = { program: '', host: '', time: '' };

    for (const item of data.timetable) {
      const [startHour, startMin] = (item.start || '00:00').split(':').map(Number);
      const [endHour, endMin] = (item.end || '00:00').split(':').map(Number);
      const startTimeValue = startHour * 60 + startMin;
      const endTimeValue = endHour * 60 + endMin;

      if (currentTimeValue >= startTimeValue && currentTimeValue < endTimeValue) {
        result = {
          program: item.name || item.programme || '',
          host: item.presenter || '',
          time: `${item.start}-${item.end}`,
        };
        break;
      }
    }

    if (!result.program && data.timetable.length > 0) {
      const firstItem = data.timetable[0];
      result = {
        program: firstItem.name || firstItem.programme || '',
        host: firstItem.presenter || '',
        time: `${firstItem.start}-${firstItem.end}`,
      };
    }

    liveProgramCache.data = { channel: channelId, ...result };
    liveProgramCache.timestamp = now;

    return result;
  } catch (error) {
    return null;
  }
}

export interface ProgramScheduleItem {
  time: string;
  program: string;
  host: string;
  url?: string;
  isPlaying?: boolean;
}

export async function fetchDayProgramSchedule(channelId: string): Promise<ProgramScheduleItem[]> {
  try {
    const proxyUrl = `/api/proxy/${encodeURIComponent(`https://www.rthk.hk/timetable/${channelId}`)}`;

    let html = '';
    try {
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch (e) {
      // Ignore errors
    }

    if (!html) {
      return [];
    }

    const $ = cheerio.load(html);
    const schedule: ProgramScheduleItem[] = [];

    const currentDate = new Date();
    const hkOffset = 8 * 60;
    const localOffset = currentDate.getTimezoneOffset();
    const hkDate = new Date(currentDate.getTime() + (hkOffset + localOffset) * 60000);

    const currentHour = hkDate.getHours();
    const currentMinute = hkDate.getMinutes();
    const todayDate = `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;

    const todayBlock = $(`div.slideBlock[date="${todayDate}"]`);

    if (!todayBlock.length) {
      return [];
    }

    const programBlocks = todayBlock.find('div.shdBlock');

    programBlocks.each((_, el) => {
      const block = $(el);

      const timeBlock = block.find('.shTimeBlock');
      const startTime = timeBlock.find('.timeDis').first().text().trim();

      if (!startTime || !startTime.match(/^\d{1,2}:\d{2}$/)) {
        return;
      }

      const [hour, minute] = startTime.split(':').map(Number);
      const timeValue = hour * 60 + minute;
      const currentTimeValue = currentHour * 60 + currentMinute;
      const isPlaying = currentTimeValue >= timeValue && currentTimeValue < timeValue + 60;

      const titleBlock = block.find('.shTitleBlock');
      const programLink = titleBlock.find('.shTitle a');
      const programName = programLink.text().trim() || '';

      const subTitleBlock = titleBlock.find('.shSubTitle a');
      let hostName = '';
      const subTitleText = subTitleBlock.attr('title') || '';
      if (subTitleText.includes('主持:') || subTitleText.includes('嘉賓:')) {
        hostName = subTitleText;
      } else if (subTitleText !== programName) {
        hostName = subTitleText;
      }

      if (programName) {
        schedule.push({
          time: startTime,
          program: programName,
          host: hostName,
          isPlaying: isPlaying,
        });
      }
    });

    return schedule;
  } catch (error) {
    return [];
  }
}

export interface RadioScheduleItem {
  channel: string;
  time: string;
  program: string;
  host: string;
  isPlaying?: boolean;
}

export async function fetchRadioSchedule(channelId: string): Promise<RadioScheduleItem[]> {
  const channelNames: Record<string, string> = {
    radio1: '香港電台第一台',
    radio2: '香港電台第二台',
    radio3: '香港電台第三台',
    radio4: '香港電台第四台',
    radio5: '香港電台第五台',
    pth: '香港電台普通話台',
  };
  const channelName = channelNames[channelId] || channelId;

  const currentDate = new Date();
  const hkOffset = 8 * 60;
  const localOffset = currentDate.getTimezoneOffset();
  const hkDate = new Date(currentDate.getTime() + (hkOffset + localOffset) * 60000);
  const todayStr = `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;

  const currentHour = hkDate.getHours();
  const currentMinute = hkDate.getMinutes();
  const currentTimeValue = currentHour * 60 + currentMinute;

  const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${todayStr}&c=${channelId}`;

  let data = null;

  try {
    const proxyUrl = `/api/proxy/${encodeURIComponent(apiUrl)}`;

    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Ignore parse errors
      }
    }
  } catch (e) {
    // Ignore fetch errors
  }

  if (!data?.timetable) {
    return [];
  }

  const schedule: RadioScheduleItem[] = [];
  for (const item of data.timetable) {
    const [startHour, startMin] = (item.start || '00:00').split(':').map(Number);
    const [endHour, endMin] = (item.end || '00:00').split(':').map(Number);
    const startTimeValue = startHour * 60 + startMin;
    const endTimeValue = endHour * 60 + endMin;

    const isPlaying = currentTimeValue >= startTimeValue && currentTimeValue < endTimeValue;

    schedule.push({
      channel: channelName,
      time: `${item.start}-${item.end}`,
      program: item.name || item.programme || '',
      host: item.presenter || '',
      isPlaying: isPlaying,
    });
  }

  return schedule;
}

export interface CurrentPlayingItem {
  channel: string;
  channelId: string;
  program: string;
  host: string;
  time: string;
}

export async function fetchCurrentPlaying(channelId: string): Promise<CurrentPlayingItem | null> {
  const channelNames: Record<string, string> = {
    radio1: '香港電台第一台',
    radio2: '香港電台第二台',
    radio3: '香港電台第三台',
    radio4: '香港電台第四台',
    radio5: '香港電台第五台',
    pth: '香港電台普通話台',
  };
  const channelName = channelNames[channelId] || channelId;

  const currentDate = new Date();
  const hkOffset = 8 * 60;
  const localOffset = currentDate.getTimezoneOffset();
  const hkDate = new Date(currentDate.getTime() + (hkOffset + localOffset) * 60000);
  const todayStr = `${hkDate.getFullYear()}${String(hkDate.getMonth() + 1).padStart(2, '0')}${String(hkDate.getDate()).padStart(2, '0')}`;

  const currentHour = hkDate.getHours();
  const currentMinute = hkDate.getMinutes();
  const currentTimeValue = currentHour * 60 + currentMinute;

  const apiUrl = `https://www.rthk.hk/radio/getTimetable?d=${todayStr}&c=${channelId}`;

  let data = null;

  try {
    const timetableUrl = `/api/timetable?d=${todayStr}&c=${channelId}`;

    const res = await fetch(timetableUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith('{') || text.startsWith('[')) {
        data = JSON.parse(text);
      }
    }
  } catch (e) {
    // Try proxy next
  }

  if (!data) {
    try {
      const proxyUrl = `/api/proxy/${encodeURIComponent(apiUrl)}`;

      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (e) {
      // Ignore fetch errors
    }
  }

  if (!data?.timetable) {
    return null;
  }

  for (const item of data.timetable) {
    const [startHour, startMin] = (item.start || '00:00').split(':').map(Number);
    const [endHour, endMin] = (item.end || '00:00').split(':').map(Number);
    const startTimeValue = startHour * 60 + startMin;
    const endTimeValue = endHour * 60 + endMin;

    const isPlaying = currentTimeValue >= startTimeValue && currentTimeValue < endTimeValue;

    if (isPlaying) {
      return {
        channel: channelName,
        channelId: channelId,
        program: item.name || item.programme || '',
        host: item.presenter || '',
        time: `${item.start}-${item.end}`,
      };
    }
  }

  return null;
}
