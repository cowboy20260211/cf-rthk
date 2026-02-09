import axios from 'axios';
import * as cheerio from 'cheerio';
import type { LiveChannel, Program, Episode } from '../types';

const RTHK_BASE = 'https://www.rthk.hk';

class RTHKService {
  private baseUrl = RTHK_BASE;
  private channelMapping: Record<string, { name: string; nameEn: string; path: string }> = {
    radio1: { name: '第一台', nameEn: 'Radio 1', path: '/radio/radio1' },
    radio2: { name: '第二台', nameEn: 'Radio 2', path: '/radio/radio2' },
    radio5: { name: '第五台', nameEn: 'Radio 5', path: '/radio/radio5' },
  };

  async getLiveChannels(): Promise<LiveChannel[]> {
    const channels: LiveChannel[] = [];

    for (const [id, info] of Object.entries(this.channelMapping)) {
      const streamUrl = await this.getLiveStreamUrl(id);
      channels.push({
        id,
        name: info.name,
        nameEn: info.nameEn,
        streamUrl,
        logo: `${this.baseUrl}${info.path}/assets/images/logo.png`,
        description: `香港电台${info.name}`,
      });
    }

    return channels;
  }

  async getLiveStreamUrl(channelId: string): Promise<string> {
    const path = this.channelMapping[channelId]?.path;
    if (!path) throw new Error(`Unknown channel: ${channelId}`);

    try {
      const { data } = await axios.get(`${this.baseUrl}${path}/live`);
      const $ = cheerio.load(data);
      
      const audioElement = $('audio source[type="audio/mpeg"]').first();
      return audioElement.attr('src') || '';
    } catch (error) {
      console.error(`Failed to get stream URL for ${channelId}:`, error);
      return '';
    }
  }

  async getPrograms(channelId: string): Promise<Program[]> {
    const path = this.channelMapping[channelId]?.path;
    if (!path) throw new Error(`Unknown channel: ${channelId}`);

    try {
      const { data } = await axios.get(`${this.baseUrl}${path}/programme`);
      const $ = cheerio.load(data);
      const programs: Program[] = [];

      $('.programme-item').each((_index: number, element: cheerio.Element) => {
        const id = $(element).attr('data-id');
        const title = $(element).find('.title').text().trim();
        const description = $(element).find('.description').text().trim();
        const imageUrl = $(element).find('img').attr('src') || '';

        if (id && title) {
          programs.push({
            id,
            channel: channelId,
            title,
            titleEn: '',
            description,
            imageUrl,
            episodes: [],
          });
        }
      });

      return programs;
    } catch (error) {
      console.error(`Failed to get programs for ${channelId}:`, error);
      return [];
    }
  }

  async getProgramDetail(channelId: string, programId: string): Promise<Program> {
    const path = this.channelMapping[channelId]?.path;
    if (!path) throw new Error(`Unknown channel: ${channelId}`);

    const { data } = await axios.get(`${this.baseUrl}${path}/programme/${programId}`);
    const $ = cheerio.load(data);

    const title = $('.programme-title').text().trim();
    const description = $('.programme-description').text().trim();
    const episodes = await this.getProgramEpisodes(channelId, programId);

    return {
      id: programId,
      channel: channelId,
      title,
      titleEn: '',
      description,
      imageUrl: '',
      episodes,
    };
  }

  async getProgramEpisodes(channelId: string, programId: string): Promise<Episode[]> {
    const path = this.channelMapping[channelId]?.path;
    if (!path) throw new Error(`Unknown channel: ${channelId}`);

    try {
      const { data } = await axios.get(`${this.baseUrl}${path}/archive/${programId}`);
      const $ = cheerio.load(data);
      const episodes: Episode[] = [];

      $('.episode-item').each((_index: number, element: cheerio.Element) => {
        const id = $(element).attr('data-id');
        const title = $(element).find('.title').text().trim();
        const publishDate = $(element).attr('data-date') || '';
        const audioUrl = $(element).attr('data-audio') || '';

        if (id && audioUrl) {
          episodes.push({
            id,
            programId,
            title,
            description: '',
            publishDate,
            duration: 0,
            audioUrl,
            startTime: 0,
            endTime: 0,
          });
        }
      });

      return episodes;
    } catch (error) {
      console.error(`Failed to get episodes for ${programId}:`, error);
      return [];
    }
  }
}

export const rthkService = new RTHKService();
