import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Favorite } from '../types';

interface FavoriteStore {
  favorites: Favorite[];
  addFavorite: (favorite: Omit<Favorite, 'id' | 'addedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (episodeId: string) => boolean;
  getFavorite: (episodeId: string) => Favorite | undefined;
  updateProgress: (episodeId: string, progress: number) => void;
}

export const useFavoriteStore = create<FavoriteStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (favorite) =>
        set((state) => ({
          favorites: [
            ...state.favorites,
            {
              ...favorite,
              id: crypto.randomUUID(),
              addedAt: new Date().toISOString(),
            },
          ],
        })),
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),
      isFavorite: (episodeId) => get().favorites.some((f) => f.episodeId === episodeId),
      getFavorite: (episodeId) => get().favorites.find((f) => f.episodeId === episodeId),
      updateProgress: (episodeId, progress) =>
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.episodeId === episodeId ? { ...f, lastPlayedTime: progress } : f
          ),
        })),
    }),
    {
      name: 'favorites-storage',
    }
  )
);
