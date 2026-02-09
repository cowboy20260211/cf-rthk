import axios from 'axios';
import type { LiveChannel, Program, Episode } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const liveApi = {
  getChannels: async (): Promise<LiveChannel[]> => {
    const { data } = await api.get<LiveChannel[]>('/live');
    return data;
  },
  getChannel: async (id: string): Promise<LiveChannel> => {
    const { data } = await api.get<LiveChannel>(`/live/${id}`);
    return data;
  },
  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/live/${id}/stream`);
    return data.url;
  },
};

export const programApi = {
  getPrograms: async (channel: string): Promise<Program[]> => {
    const { data } = await api.get<Program[]>('/programs', { params: { channel } });
    return data;
  },
  getProgram: async (channel: string, id: string): Promise<Program> => {
    const { data } = await api.get<Program>(`/programs/${channel}/${id}`);
    return data;
  },
  getEpisodes: async (programId: string): Promise<Episode[]> => {
    const { data } = await api.get<Episode[]>(`/programs/${programId}/episodes`);
    return data;
  },
  getEpisode: async (id: string): Promise<Episode> => {
    const { data } = await api.get<Episode>(`/episodes/${id}`);
    return data;
  },
};

export const favoriteApi = {
  getFavorites: async (): Promise<Favorite[]> => {
    const { data } = await api.get<Favorite[]>('/favorites');
    return data;
  },
  addFavorite: async (favorite: Omit<Favorite, 'id' | 'addedAt'>): Promise<Favorite> => {
    const { data } = await api.post<Favorite>('/favorites', favorite);
    return data;
  },
  removeFavorite: async (id: string): Promise<void> => {
    await api.delete(`/favorites/${id}`);
  },
};
