import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';

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

// Generate browser fingerprint
function getBrowserFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
  ];
  
  let fingerprint = components.join('|');
  
  // Add simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return 'fingerprint_' + Math.abs(hash).toString(16);
}

const STORAGE_KEY_PREFIX = 'rthk_favorites_';

const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [storageKey, setStorageKey] = useState<string>('');

  // Initialize fingerprint and load favorites
  useEffect(() => {
    const fingerprint = getBrowserFingerprint();
    const key = STORAGE_KEY_PREFIX + fingerprint;
    setStorageKey(key);
    
    // Load from localStorage
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Save to localStorage when favorites change
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(favorites));
      } catch (e) {
        // ignore storage errors
      }
    }
  }, [favorites, storageKey]);

  const addFavorite = useCallback((favorite: Omit<Favorite, 'id' | 'addedAt'>) => {
    setFavorites(prev => {
      // Check if already exists
      if (prev.some(f => f.programId === favorite.programId)) {
        return prev;
      }
      return [
        ...prev,
        { ...favorite, id: crypto.randomUUID(), addedAt: new Date().toISOString() },
      ];
    });
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
