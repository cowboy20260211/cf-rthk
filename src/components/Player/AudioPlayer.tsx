import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayer } from '../../stores/PlayerContext';
import { RTHK_LIVE_STREAMS } from '../../services/rthk';

interface Episode {
  id: string;
  programId: string;
  channelId: string;
  title: string;
  description?: string;
  publishDate?: string;
  duration?: number;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
}

export default function AudioPlayer() {
  const { currentChannel, currentEpisode } = usePlayer() as {
    currentChannel: { id: string; name: string; description?: string; streamUrl?: string } | null;
    currentEpisode: Episode | null;
  };
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastEpisodeIdRef = useRef<string>('');
  const isLive = !currentEpisode && currentChannel;

  // Initialize audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.volume = 1;

    const audio = audioRef.current;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (audio) {
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      console.log('Audio error:', audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      audio.pause();
      audio.src = '';
    };
  }, []);

  const getStreamUrl = useCallback(() => {
    if (currentEpisode?.audioUrl) {
      return currentEpisode.audioUrl;
    }
    if (currentEpisode) {
      const channelId = currentEpisode.channelId || 'radio1';
      return RTHK_LIVE_STREAMS[channelId as keyof typeof RTHK_LIVE_STREAMS] || RTHK_LIVE_STREAMS.radio1;
    }
    return currentChannel?.streamUrl || '';
  }, [currentEpisode, currentChannel]);

  const getDisplayName = useCallback(() => {
    if (currentEpisode) return currentEpisode.title;
    return currentChannel?.name || '未知频道';
  }, [currentEpisode, currentChannel]);

  const getDisplayDesc = useCallback(() => {
    if (currentEpisode) return currentEpisode.publishDate || '';
    return currentChannel?.description || '';
  }, [currentEpisode, currentChannel]);

  // Play/Pause function
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.log('Play error:', err);
    }
  }, [isPlaying]);

  // Seek function
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Load stream when episode/channel changes
  useEffect(() => {
    const audio = audioRef.current;
    const streamUrl = getStreamUrl();

    if (!audio || !streamUrl) return;

    // Determine if this is live or episode
    const isEpisodePlayback = !!currentEpisode;
    const isLivePlayback = !currentEpisode && !!currentChannel;

    if (isLivePlayback) {
      // Live stream
      const lastChannelId = lastEpisodeIdRef.current.split('-')[0] === 'live' 
        ? lastEpisodeIdRef.current.replace('live-', '') 
        : '';
      const channelChanged = currentChannel?.id !== lastChannelId;

      if (!channelChanged && lastEpisodeIdRef.current.startsWith('live-')) return;

      lastEpisodeIdRef.current = `live-${currentChannel?.id || ''}`;

      // Destroy existing HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);

      // Try HLS first
      if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;

        try {
          hls.attachMedia(audio);
        } catch (e) {}

        hls.loadSource(streamUrl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.muted = false;
          audio.volume = 1;
          audio.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            hls.startLoad();
          }
        });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = streamUrl;
        audio.muted = false;
        audio.volume = 1;
        audio.play().catch(() => {});
      } else {
        audio.src = streamUrl;
        audio.muted = false;
        audio.volume = 1;
        audio.play().catch(() => {});
      }
    } else if (isEpisodePlayback) {
      // Episode playback
      const episodeId = currentEpisode.id;
      const episodeChanged = episodeId !== lastEpisodeIdRef.current;
      lastEpisodeIdRef.current = episodeId;

      if (!episodeChanged) return;

      // Destroy existing HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      audio.pause();
      const startTime = currentEpisode.startTime || 0;
      audio.currentTime = startTime;
      setCurrentTime(startTime);

      // Set duration from episode data as fallback
      if (currentEpisode.duration) {
        setDuration(currentEpisode.duration);
      } else {
        setDuration(0);
      }

      // Try HLS
      if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls({
          startPosition: startTime,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const dur = audio.duration;
          if (dur && isFinite(dur) && dur > 0) {
            setDuration(dur);
          }
          audio.currentTime = startTime;
          audio.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            hls.startLoad();
          }
        });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = streamUrl;
        audio.load();
        audio.oncanplay = () => {
          audio.currentTime = startTime;
          audio.play().catch(() => {});
        };
      } else {
        audio.src = streamUrl;
        audio.crossOrigin = 'anonymous';
        audio.load();
        audio.oncanplay = () => {
          audio.play().catch(() => {});
        };
      }
    }
  }, [currentEpisode, currentChannel, getStreamUrl]);

  // Reset state when no channel/episode
  useEffect(() => {
    if (!currentChannel && !currentEpisode) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentChannel, currentEpisode]);

  if (!currentChannel && !currentEpisode) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: isExpanded ? 'white' : 'transparent',
        zIndex: 50,
        transition: 'all 0.3s ease',
        height: isExpanded ? (isLive ? '50px' : '80px') : '5px',
      }}
    >
      {/* Collapsed state: red bar with expand button */}
      {!isExpanded && (
        <div style={{ position: 'relative', height: '5px' }}>
          <div style={{ height: '5px', background: '#d40000', width: '100%' }} />
          <div
            onClick={() => setIsExpanded(true)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '-22px',
              width: '40px',
              height: '25px',
              background: 'rgba(212, 0, 0, 0.6)',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 51,
            }}
          >
            <span style={{ color: 'white', fontSize: '10px' }}>▲</span>
          </div>
        </div>
      )}

      {/* Expanded state */}
      {isExpanded && (
        <>
          {/* Collapse button */}
          <div
            onClick={() => setIsExpanded(false)}
            style={{
              position: 'absolute',
              top: '-20px',
              right: '10px',
              width: '60px',
              height: '25px',
              background: 'rgba(212, 0, 0, 0.6)',
              borderRadius: '15px 15px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 51,
            }}
          >
            <span style={{ color: 'white', fontSize: '12px' }}>▼</span>
          </div>

          {/* Left: playback info */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: isLive ? '12px' : '8px',
              width: 'calc(100% - 80px)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getDisplayName()}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getDisplayDesc()}
            </div>
          </div>

          {/* Right: play/pause button */}
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <button
              onClick={togglePlay}
              style={{
                fontSize: '24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '5px',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>

          {/* Timeline (replay only) */}
          {!isLive && (
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                left: '10px',
                right: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#666', minWidth: '35px' }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  flex: 1,
                  height: '4px',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '11px', color: '#666', minWidth: '40px', textAlign: 'right' }}>
                {formatTime(duration)}
              </span>
            </div>
          )}
        </>
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
