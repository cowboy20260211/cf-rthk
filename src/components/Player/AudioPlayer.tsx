import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import clsx from 'clsx';
import { usePlayerStore } from '../../stores/playerStore';

export default function AudioPlayer() {
  const {
    isPlaying,
    currentChannel,
    currentEpisode,
    volume,
    setPlaying,
    setProgress,
    setDuration,
  } = usePlayerStore();

  const soundRef = useRef<Howl | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audioUrl = currentChannel?.streamUrl || currentEpisode?.audioUrl;
    if (!audioUrl) return;

    if (soundRef.current) {
      soundRef.current.unload();
    }

    const sound = new Howl({
      src: [audioUrl],
      html5: true,
      volume,
      onplay: () => setPlaying(true),
      onpause: () => setPlaying(false),
      onend: () => setPlaying(false),
      onloaderror: (_, error) => console.error('Load error:', error),
      onplayerror: (_, error) => console.error('Play error:', error),
    });

    soundRef.current = sound;

    return () => {
      sound.unload();
    };
  }, [currentChannel, currentEpisode]);

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(volume);
    }
  }, [volume]);

  useEffect(() => {
    if (!soundRef.current) return;

    const interval = setInterval(() => {
      if (soundRef.current && isPlaying) {
        const seek = soundRef.current.seek() as number;
        const duration = soundRef.current.duration();
        setCurrentTime(seek);
        setProgress(seek);
        setDuration(duration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, setProgress, setDuration]);

  const togglePlay = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChannel && !currentEpisode) {
    return null;
  }

  return (
    <div className="player-bar p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">
              {currentChannel?.name || currentEpisode?.title}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {currentChannel?.description || currentEpisode?.description}
            </p>
          </div>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-rthk-red text-white flex items-center justify-center flex-shrink-0 ml-4"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-rthk-red transition-all duration-200"
              style={{
                width: `${currentEpisode ? (currentTime / (currentEpisode.duration || 1)) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {formatTime(currentEpisode?.duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
