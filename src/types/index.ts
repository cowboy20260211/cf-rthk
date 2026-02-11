export interface LiveChannel {
  id: string;
  name: string;
  nameEn: string;
  streamUrl: string;
  logo: string;
  description: string;
}

export interface Program {
  id: string;
  channel: string;
  title: string;
  titleEn: string;
  description: string;
  imageUrl: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  programId: string;
  channelId: string;
  title: string;
  description: string;
  publishDate: string;
  duration: number;
  audioUrl: string;
  startTime: number;
  endTime: number;
}

export interface Favorite {
  id: string;
  episodeId: string;
  programId: string;
  title: string;
  channel: string;
  addedAt: string;
  lastPlayedTime?: number;
}

export interface PlayHistory {
  id: string;
  episodeId: string;
  title: string;
  channel: string;
  timestamp: string;
  progress: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentChannel: LiveChannel | null;
  currentEpisode: Episode | null;
  volume: number;
  progress: number;
  duration: number;
}

export interface UserSettings {
  autoPlay: boolean;
  rememberProgress: boolean;
  defaultQuality: 'high' | 'low';
  notifications: boolean;
}
