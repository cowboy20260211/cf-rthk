import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LiveChannel, Episode } from '../types';

interface PlayerContextType {
  currentChannel: LiveChannel | null;
  currentEpisode: Episode | null;
  isPlaying: boolean;
  volume: number;
  setChannel: (channel: LiveChannel | null) => void;
  setEpisode: (episode: Episode | null) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentChannel, setCurrentChannel] = useState<LiveChannel | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const setChannel = useCallback((channel: LiveChannel | null) => {
    console.log('PlayerContext setChannel:', channel);
    setCurrentChannel(channel);
    setCurrentEpisode(null);
  }, []);

  const setEpisode = useCallback((episode: Episode | null) => {
    console.log('PlayerContext setEpisode:', episode);
    setCurrentEpisode(episode);
    setCurrentChannel(null);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentChannel,
        currentEpisode,
        isPlaying,
        volume,
        setChannel,
        setEpisode,
        setPlaying: setIsPlaying,
        setVolume,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
