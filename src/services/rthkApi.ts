// RTHK API Service - Data for programs and episodes

import axios from 'axios';
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
const RTHK_ARCHIVE_BASE = 'https://rthkaod2022.akamaized.net/m4a/radio/archive';
const RTHK_BASE_URL = 'https://www.rthk.hk';

// Generate archive URL for a program
export function getArchiveUrl(channelId: string, programId: string, dateStr: string): string {
  const dateWithoutDash = dateStr.replace(/-/g, '');
  return (
    RTHK_ARCHIVE_BASE +
    '/' +
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

  const programDurations: Record<string, number> = {
    morning: 240, millennium: 30, freedom: 60, health: 60, news: 30, finance: 60,
    keepuco: 240, musiclover: 60, madelee: 120, crazylife: 120, music: 60, 三五成群: 120,
    culture: 120, education: 60, sports: 60, community: 60, senior: 60,
  };

  const defaultDurationMinutes = 60;

  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();

    const skipWeekends = !['sports'].includes(programId);
    if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    const dateStr = date.toISOString().split('T')[0];
    const audioUrl = getArchiveUrl(channelId, programId, dateStr);
    const scheduledDurationSeconds = (programDurations[programId] || defaultDurationMinutes) * 60;

    episodes.push({
      id: programId + '-' + dateStr,
      programId,
      channelId,
      title: dateStr + ' 足本重溫',
      publishDate: dateStr,
      duration: scheduledDurationSeconds,
      audioUrl,
      description: '節目足本重溫',
    });
  }

  return episodes;
}

// Fetch m3u8 and parse to get actual duration
async function fetchM3u8Duration(audioUrl: string): Promise<number | null> {
  try {
    const response = await fetch(audioUrl, { method: 'GET' });
    if (!response.ok) return null;
    const text = await response.text();
    const extinfMatches = text.match(/#EXTINF:(\d+)/g);
    if (extinfMatches && extinfMatches.length > 0) {
      let totalDuration = 0;
      for (const match of extinfMatches) {
        const duration = parseInt(match.replace('#EXTINF:', ''));
        if (!isNaN(duration)) totalDuration += duration;
      }
      if (totalDuration > 0) return totalDuration;
    }
    return null;
  } catch {
    return null;
  }
}

// Enhanced episode generation with actual m3u8 duration
export async function fetchEpisodesWithActualDuration(
  channelId: string,
  programId: string
): Promise<{ episodes: Episode[]; actualDuration: number | null }> {
  const episodes = generateEpisodesFromSchedule(programId, channelId);
  if (episodes.length > 0) {
    const latestEpisode = episodes[0];
    const actualDuration = await fetchM3u8Duration(latestEpisode.audioUrl || '');
    if (actualDuration) {
      episodes.forEach(ep => {
        ep.duration = actualDuration;
        ep.description = '足本重溫 (實際時長: ' + Math.floor(actualDuration / 60) + '分鐘)';
      });
      return { episodes, actualDuration };
    }
  }
  return { episodes, actualDuration: null };
}

// Fetch episodes for a specific program from RTHK (with CORS handling)
export async function fetchEpisodesFromRTHK(
  channelId: string,
  programId: string
): Promise<Episode[]> {
  try {
    const programUrl = RTHK_BASE_URL + '/radio/' + channelId + '/programme/' + programId;
    
    // Use CORS proxy for browser requests
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(programUrl);
    
    const response = await axios.get(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const episodes: Episode[] = [];

    $('.episode-item, .programme-episode, .episode-list .item').each((_i, el) => {
      const $el = $(el);
      const link = $el.find('a').attr('href') || '';
      const title = $el.find('.title, .ep-title').text().trim();
      const dateText = $el.find('.date, .ep-date, .publish-date').text().trim();
      const duration = $el.find('.duration, .ep-duration').text().trim();

      const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})/);
      let dateStr = '';
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        dateStr = year + '-' + month + '-' + day;
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateStr = yesterday.toISOString().split('T')[0];
      }

      const episodeIdMatch = link.match(/episode\/([^/]+)/);
      const episodeId = episodeIdMatch ? episodeIdMatch[1] : programId + '-' + dateStr;

      if (episodeId && dateStr) {
        const audioUrl = getArchiveUrl(channelId, programId, dateStr);
        let durationSeconds = 3600;
        const durationMatch = duration.match(/(\d+)/);
        if (durationMatch) durationSeconds = parseInt(durationMatch[1]) * 60;

        episodes.push({
          id: episodeId,
          programId,
          channelId,
          title: title || dateStr + ' 足本重溫',
          publishDate: dateStr,
          duration: durationSeconds,
          audioUrl,
          description: '',
        });
      }
    });

    if (episodes.length === 0) {
      return generateEpisodesFromSchedule(programId, channelId);
    }
    return episodes;
  } catch (error) {
    console.log('CORS error, using fallback data:', error);
    return generateEpisodesFromSchedule(programId, channelId);
  }
}

// Channel definitions
export const CHANNELS: Record<string, Channel> = {
  radio1: { id: 'radio1', name: '第一台', nameEn: 'Radio 1', frequency: 'FM 92.6MHz', description: '新聞、財經、時事', color: 'bg-red-600' },
  radio2: { id: 'radio2', name: '第二台', nameEn: 'Radio 2', frequency: 'FM 94.8MHz', description: '流行音樂、青年節目', color: 'bg-blue-600' },
  radio5: { id: 'radio5', name: '第五台', nameEn: 'Radio 5', frequency: 'AM 783kHz', description: '文化、教育、社區', color: 'bg-green-600' },
};

// Programs by channel
export const PROGRAMS: Record<string, Program[]> = {
};

// Popular programs
export const POPULAR_PROGRAMS: Program[] = [
  { id: 'keepuco', title: '輕談淺唱不夜天', channel: '第二台', channelId: 'radio2', description: '音樂訪談節目', archiveUrl: '/radio/radio2/programme/keepuco', episodeCount: 30 },
  { id: 'musiclover', title: '音樂情人', channel: '第二台', channelId: 'radio2', description: '經典音樂節目', archiveUrl: '/radio/radio2/programme/musiclover', episodeCount: 30 },
  { id: 'madelee', title: 'Made in Hong Kong 李志剛', channel: '第二台', channelId: 'radio2', description: '香港音樂文化節目', archiveUrl: '/radio/radio2/programme/madelee', episodeCount: 30 },
  { id: 'morning', title: '晨光第一線', channel: '第一台', channelId: 'radio1', description: '晨早新聞時事節目', archiveUrl: '/radio/radio1/programme/morning', episodeCount: 30 },
  { id: 'crazylife', title: '瘋Show快活人', channel: '第二台', channelId: 'radio2', description: '輕鬆娛樂節目', archiveUrl: '/radio/radio2/programme/crazylife', episodeCount: 30 },
  { id: 'millennium', title: '千禧年代', channel: '第一台', channelId: 'radio1', description: '新聞時事評論節目', archiveUrl: '/radio/radio1/programme/millennium', episodeCount: 30 },
];

// API functions
export const rthkApi = {
  getChannels(): Channel[] { return Object.values(CHANNELS); },
  getChannel(channelId: string): Channel | undefined { return CHANNELS[channelId]; },
  getPopularPrograms(): Program[] { return POPULAR_PROGRAMS; },
  getProgramsByChannel(channelId: string): Program[] { return PROGRAMS[channelId] || []; },
  getAllPrograms(): Program[] { return Object.values(PROGRAMS).flat(); },
  
  async getAllProgramsPaged(channelId: string, page: number = 1, pageSize: number = 20): Promise<{ programs: Program[]; hasMore: boolean }> {
    const allPrograms = PROGRAMS[channelId] || [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { programs: allPrograms.slice(start, end), hasMore: end < allPrograms.length };
  },

  async getProgramDetail(channelId: string, programId: string): Promise<{ program: Program; episodes: Episode[] } | null> {
    const programs = PROGRAMS[channelId] || [];
    const program = programs.find(p => p.id === programId);
    if (!program) return null;
    const episodes = await fetchEpisodesFromRTHK(channelId, programId);
    return { program, episodes };
  },

  searchPrograms(query: string): Program[] {
    const allPrograms = this.getAllPrograms();
    const lowerQuery = query.toLowerCase();
    return allPrograms.filter(p => p.title.toLowerCase().includes(lowerQuery) || p.description.toLowerCase().includes(lowerQuery));
  },
};

export default rthkApi;
