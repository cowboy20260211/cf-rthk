import type { LiveChannel, Program, Episode } from '../types';

const RTHK_BASE = 'https://www.rthk.hk';

// RTHK 真实直播流 (HLS m3u8格式)
export const RTHK_LIVE_STREAMS: Record<string, string> = {
  radio1: 'https://rthkradio1-live.akamaized.net/hls/live/2035313/radio1/master.m3u8',
  radio2: 'https://rthkradio2-live.akamaized.net/hls/live/2040078/radio2/master.m3u8',
  radio5: 'https://rthkradio5-live.akamaized.net/hls/live/2040081/radio5/master.m3u8',
};

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
      channels.push({
        id,
        name: info.name,
        nameEn: info.nameEn,
        streamUrl: RTHK_LIVE_STREAMS[id] || '',
        logo: `${this.baseUrl}${info.path}/assets/images/logo.png`,
        description: `香港电台${info.name} - ${this.getChannelDescription(id)}`,
      });
    }

    return channels;
  }

  private getChannelDescription(channelId: string): string {
    const descriptions: Record<string, string> = {
      radio1: '新闻、财经、时事',
      radio2: '流行音乐、青年节目',
      radio5: '文化、教育、社区',
    };
    return descriptions[channelId] || '';
  }

  async getLiveStreamUrl(channelId: string): Promise<string> {
    return RTHK_LIVE_STREAMS[channelId] || '';
  }

  async getPrograms(channelId: string): Promise<Program[]> {
    const mockPrograms: Program[] = [
      {
        id: 'program1',
        channel: channelId,
        title: '千禧年代',
        titleEn: 'The Millennium',
        description: '新闻时事评论节目',
        imageUrl: '',
        episodes: [],
      },
      {
        id: 'program2',
        channel: channelId,
        title: '自由风自由phone',
        titleEn: 'Freedom Phone',
        description: '时事烽烟节目',
        imageUrl: '',
        episodes: [],
      },
      {
        id: 'program3',
        channel: channelId,
        title: '精靈一點',
        titleEn: 'Health Line',
        description: '健康资讯节目',
        imageUrl: '',
        episodes: [],
      },
    ];

    return mockPrograms;
  }

  async getProgramDetail(channelId: string, programId: string): Promise<Program> {
    const programs = await this.getPrograms(channelId);
    const program = programs.find(p => p.id === programId) || programs[0];

    if (program) {
      program.episodes = await this.getProgramEpisodes(channelId, programId);
    }

    return program;
  }

  async getProgramEpisodes(channelId: string, programId: string): Promise<Episode[]> {
    const today = new Date();
    const episodes: Episode[] = [];

    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      episodes.push({
        id: `${programId}-${i}`,
        programId,
        channelId,
        title: `第${i + 1}節`,
        description: `节目第${i + 1}节内容`,
        publishDate: dateStr,
        duration: 1800,
        audioUrl: RTHK_LIVE_STREAMS[channelId] || '',
        startTime: i * 1800,
        endTime: (i + 1) * 1800,
      });
    }

    return episodes;
  }
}

export const rthkService = new RTHKService();
