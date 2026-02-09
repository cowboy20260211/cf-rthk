import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlayerState, LiveChannel, Episode } from '../types';

interface PlayerStore extends PlayerState {
  setChannel: (channel: LiveChannel | null) => void;
  setEpisode: (episode: Episode | null) => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  reset: () => void;
}

const initialState: PlayerState = {
  isPlaying: false,
  currentChannel: null,
  currentEpisode: null,
  volume: 1,
  progress: 0,
  duration: 0,
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      ...initialState,
      setChannel: (channel) => set({ currentChannel: channel, currentEpisode: null }),
      setEpisode: (episode) => set({ currentEpisode: episode, currentChannel: null }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      reset: () => set(initialState),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        volume: state.volume,
        currentChannel: state.currentChannel,
        currentEpisode: state.currentEpisode,
      }),
    }
  )
);
