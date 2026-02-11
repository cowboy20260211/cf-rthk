import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Favorite {
  id: string;
  episodeId: string;
  programId: string;
  title: string;
  channel: string;
  addedAt: string;
  lastPlayedTime?: number;
}

interface FavoriteContextType {
  favorites: Favorite[];
  addFavorite: (favorite: Omit<Favorite, 'id' | 'addedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (episodeId: string) => boolean;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const addFavorite = useCallback((favorite: Omit<Favorite, 'id' | 'addedAt'>) => {
    setFavorites(prev => [
      ...prev,
      { ...favorite, id: crypto.randomUUID(), addedAt: new Date().toISOString() },
    ]);
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  const isFavorite = useCallback(
    (episodeId: string) => {
      return favorites.some(f => f.episodeId === episodeId);
    },
    [favorites]
  );

  return (
    <FavoriteContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorite() {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavorite must be used within a FavoriteProvider');
  }
  return context;
}
