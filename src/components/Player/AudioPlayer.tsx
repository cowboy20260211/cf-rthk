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

  // Play/Pause handler
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('[Player] Button clicked, paused:', audio.paused);

    if (audio.paused) {
      audio.play().then(() => {
        console.log('[Player] Play success');
        setIsPlaying(true);
      }).catch(err => {
        console.log('[Player] Play failed:', err);
      });
    } else {
      audio.pause();
      console.log('[Player] Pause called');
      setIsPlaying(false);
    }
  }, []);

  // Seek handler
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    console.log('[Player] Seek to:', time);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Initialize audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.volume = 1;
    audioRef.current = audio;

    // Time update - update every 250ms
    const timeUpdateHandler = () => {
      if (!audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    };
    audio.addEventListener('timeupdate', timeUpdateHandler);

    // Play/Pause events
    audio.addEventListener('play', () => {
      console.log('[Player] play event');
      setIsPlaying(true);
    });
    audio.addEventListener('pause', () => {
      console.log('[Player] pause event');
      setIsPlaying(false);
    });
    audio.addEventListener('ended', () => {
      console.log('[Player] ended');
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      console.log('[Player] Cleanup');
      audio.removeEventListener('timeupdate', timeUpdateHandler);
      audio.removeEventListener('play', () => {});
      audio.removeEventListener('pause', () => {});
      audio.removeEventListener('ended', () => {});
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Load media
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let streamUrl = '';
    if (currentEpisode?.audioUrl) {
      streamUrl = currentEpisode.audioUrl;
      console.log('[Player] Episode URL:', streamUrl);
    } else if (currentEpisode) {
      streamUrl = RTHK_LIVE_STREAMS[currentEpisode.channelId as keyof typeof RTHK_LIVE_STREAMS] || RTHK_LIVE_STREAMS.radio1;
      console.log('[Player] Fallback URL:', streamUrl);
    } else if (currentChannel?.streamUrl) {
      streamUrl = currentChannel.streamUrl;
      console.log('[Player] Live URL:', streamUrl);
    }

    if (!streamUrl) return;

    const episodeId = currentEpisode?.id || `live-${currentChannel?.id || ''}`;
    
    if (lastEpisodeIdRef.current === episodeId && audio.src === streamUrl) {
      console.log('[Player] Same, skip');
      return;
    }
    lastEpisodeIdRef.current = episodeId;

    console.log('[Player] Loading:', episodeId);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    audio.pause();

    // Reset state
    setIsPlaying(false);
    setCurrentTime(0);

    if (isLive) {
      setDuration(0);
    } else if (currentEpisode) {
      const dur = currentEpisode.duration || 3600;
      setDuration(dur);
      audio.currentTime = currentEpisode.startTime || 0;
      setCurrentTime(currentEpisode.startTime || 0);
    }

    // HLS loading
    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      console.log('[Player] Using HLS');
      const hls = new Hls(isLive ? {} : { startPosition: currentEpisode?.startTime || 0 });
      hlsRef.current = hls;
      hls.attachMedia(audio);
      hls.loadSource(streamUrl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.log('[Player] Manifest parsed, levels:', data.levels.length);
        
        // Get duration from HLS levels
        if (data.levels && data.levels.length > 0) {
          const level = data.levels[0];
          if (level.details && level.duration) {
            const dur = level.duration;
            console.log('[Player] HLS duration:', dur);
            setDuration(dur);
          }
        }
        
        if (!isLive && currentEpisode) {
          audio.currentTime = currentEpisode.startTime || 0;
        }
        audio.play().then(() => {
          console.log('[Player] Auto-play success');
        }).catch(err => {
          console.log('[Player] Auto-play failed:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.log('[Player] HLS error:', data.type, data.fatal);
        if (data.fatal) {
          console.log('[Player] Fatal error, restart');
          hls.startLoad();
        }
      });
    } else {
      console.log('[Player] Native audio');
      audio.src = streamUrl;
      audio.load();
      audio.oncanplay = () => {
        if (!isLive && currentEpisode) {
          audio.currentTime = currentEpisode.startTime || 0;
        }
        audio.play().then(() => {
          console.log('[Player] Native auto-play success');
        }).catch(err => {
          console.log('[Player] Native auto-play failed:', err);
        });
      };
    }
  }, [currentEpisode, currentChannel]);

  // Reset when nothing playing
  useEffect(() => {
    if (!currentChannel && !currentEpisode) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentChannel, currentEpisode]);

  if (!currentChannel && !currentEpisode) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: isExpanded ? 'white' : 'transparent', zIndex: 50, height: isExpanded ? (isLive ? '50px' : '80px') : '5px' }}>
      {!isExpanded && (
        <div style={{ position: 'relative', height: '5px' }}>
          <div style={{ height: '5px', background: '#d40000', width: '100%' }} />
          <div onClick={() => setIsExpanded(true)} style={{ position: 'absolute', right: '10px', top: '-22px', width: '40px', height: '25px', background: 'rgba(212, 0, 0, 0.6)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 51 }}>
            <span style={{ color: 'white', fontSize: '10px' }}>▲</span>
          </div>
        </div>
      )}

      {isExpanded && (
        <>
          <div onClick={() => setIsExpanded(false)} style={{ position: 'absolute', top: '-20px', right: '10px', width: '60px', height: '25px', background: 'rgba(212, 0, 0, 0.6)', borderRadius: '15px 15px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 51 }}>
            <span style={{ color: 'white', fontSize: '12px' }}>▼</span>
          </div>

          <div style={{ position: 'absolute', left: '10px', top: isLive ? '12px' : '8px', width: 'calc(100% - 50px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEpisode?.title || currentChannel?.name || '未知'}</div>
            <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEpisode?.publishDate || currentChannel?.description || ''}</div>
          </div>

          {/* Play button - 25px red circle */}
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <button onClick={handlePlayPause} style={{ width: '25px', height: '25px', borderRadius: '50%', background: '#d40000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <span style={{ color: 'white', fontSize: '10px' }}>{isPlaying ? '⏸' : '▶'}</span>
            </button>
          </div>

          {/* Timeline */}
          {!isLive && (
            <div style={{ position: 'absolute', bottom: '6px', left: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#666', minWidth: '40px' }}>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={Math.max(duration, 1)} value={currentTime} onChange={handleSeek} style={{ flex: 1, height: '4px', cursor: 'pointer' }} />
              <span style={{ fontSize: '11px', color: '#666', minWidth: '45px', textAlign: 'right' }}>{formatTime(duration)}</span>
            </div>
          )}
        </>
      )}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
