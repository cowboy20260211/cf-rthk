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

  // Create audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('[Player] Creating audio element');
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.volume = 1;

    const audio = audioRef.current;

    const onPlay = () => {
      console.log('[Player] Audio play event fired, isPlaying:', true);
      setIsPlaying(true);
    };
    const onPause = () => {
      console.log('[Player] Audio pause event fired, isPlaying:', false);
      setIsPlaying(false);
    };
    const onTimeUpdate = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (audio) {
        const dur = audio.duration;
        console.log('[Player] Metadata loaded, duration:', dur);
        if (dur && isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
      }
    };
    const onEnded = () => {
      console.log('[Player] Playback ended');
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      console.log('[Player] Audio error:', audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      console.log('[Player] Cleaning up audio element');
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);

      if (hlsRef.current) {
        console.log('[Player] Destroying HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.log('[Player] No audio element');
      return;
    }

    console.log('[Player] Toggle play/pause clicked, current isPlaying:', isPlaying);
    console.log('[Player] Audio src:', audio.src || '(empty)');
    console.log('[Player] Audio paused:', audio.paused);

    if (isPlaying) {
      console.log('[Player] Calling audio.pause()');
      audio.pause();
    } else {
      console.log('[Player] Calling audio.play()');
      audio.play().then(() => {
        console.log('[Player] audio.play() succeeded');
      }).catch(err => {
        console.log('[Player] audio.play() failed:', err);
      });
    }
  }, [isPlaying]);

  // Seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    console.log('[Player] Seeking to:', time);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Load media when channel/episode changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let streamUrl = '';
    if (currentEpisode?.audioUrl) {
      streamUrl = currentEpisode.audioUrl;
      console.log('[Player] Loading episode audio:', streamUrl);
    } else if (currentEpisode) {
      streamUrl = RTHK_LIVE_STREAMS[currentEpisode.channelId as keyof typeof RTHK_LIVE_STREAMS] || RTHK_LIVE_STREAMS.radio1;
      console.log('[Player] Using fallback stream for episode:', streamUrl);
    } else if (currentChannel?.streamUrl) {
      streamUrl = currentChannel.streamUrl;
      console.log('[Player] Loading live channel:', streamUrl);
    }

    if (!streamUrl) {
      console.log('[Player] No stream URL');
      return;
    }

    const episodeId = currentEpisode?.id || `live-${currentChannel?.id || ''}`;
    if (lastEpisodeIdRef.current === episodeId && audio.src === streamUrl) {
      console.log('[Player] Same episode, skipping reload');
      return;
    }
    lastEpisodeIdRef.current = episodeId;
    console.log('[Player] New episode ID:', episodeId);

    // Destroy old HLS
    if (hlsRef.current) {
      console.log('[Player] Destroying old HLS');
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    audio.pause();
    
    if (isLive) {
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);
    } else if (currentEpisode) {
      const start = currentEpisode.startTime || 0;
      audio.currentTime = start;
      setCurrentTime(start);
      // Don't set duration from episode data - get from HLS
      setDuration(0);
    }

    // Load stream
    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      console.log('[Player] Loading HLS stream');
      const hls = new Hls(isLive ? {} : { startPosition: currentEpisode?.startTime || 0 });
      hlsRef.current = hls;
      hls.attachMedia(audio);
      hls.loadSource(streamUrl);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[Player] HLS manifest parsed');
        if (!isLive && currentEpisode) {
          audio.currentTime = currentEpisode.startTime || 0;
        }
        console.log('[Player] Calling audio.play() after manifest');
        audio.play().then(() => {
          console.log('[Player] Auto-play succeeded');
        }).catch(err => {
          console.log('[Player] Auto-play failed:', err);
        });
      });
      
      hls.on(Hls.Events.ERROR, (_e, data) => {
        console.log('[Player] HLS error:', data.type, data.fatal);
        if (data.fatal) {
          console.log('[Player] Fatal HLS error, restarting');
          hls.startLoad();
        }
      });
    } else {
      console.log('[Player] Using native audio (non-HLS)');
      audio.src = streamUrl;
      audio.load();
      audio.oncanplay = () => {
        console.log('[Player] Native audio ready');
        if (!isLive && currentEpisode) {
          audio.currentTime = currentEpisode.startTime || 0;
        }
        audio.play().then(() => {
          console.log('[Player] Native play succeeded');
        }).catch(err => {
          console.log('[Player] Native play failed:', err);
        });
      };
    }
  }, [currentEpisode, currentChannel]);

  // Reset when no playback
  useEffect(() => {
    if (!currentChannel && !currentEpisode) {
      console.log('[Player] No channel/episode, resetting');
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentChannel, currentEpisode]);

  if (!currentChannel && !currentEpisode) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: isExpanded ? 'white' : 'transparent', zIndex: 50, height: isExpanded ? (isLive ? '50px' : '80px') : '5px' }}>
      {/* Collapsed */}
      {!isExpanded && (
        <div style={{ position: 'relative', height: '5px' }}>
          <div style={{ height: '5px', background: '#d40000', width: '100%' }} />
          <div onClick={() => setIsExpanded(true)} style={{ position: 'absolute', right: '10px', top: '-22px', width: '40px', height: '25px', background: 'rgba(212, 0, 0, 0.6)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 51 }}>
            <span style={{ color: 'white', fontSize: '10px' }}>▲</span>
          </div>
        </div>
      )}

      {/* Expanded */}
      {isExpanded && (
        <>
          <div onClick={() => setIsExpanded(false)} style={{ position: 'absolute', top: '-20px', right: '10px', width: '60px', height: '25px', background: 'rgba(212, 0, 0, 0.6)', borderRadius: '15px 15px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 51 }}>
            <span style={{ color: 'white', fontSize: '12px' }}>▼</span>
          </div>

          <div style={{ position: 'absolute', left: '10px', top: isLive ? '12px' : '8px', width: 'calc(100% - 50px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEpisode?.title || currentChannel?.name || '未知频道'}</div>
            <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEpisode?.publishDate || currentChannel?.description || ''}</div>
          </div>

          {/* Play button - 25px red circle with shadow */}
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <button onClick={handlePlayPause} style={{ width: '25px', height: '25px', borderRadius: '50%', background: '#d40000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <span style={{ color: 'white', fontSize: '10px' }}>{isPlaying ? '⏸' : '▶'}</span>
            </button>
          </div>

          {/* Timeline - duration from HLS */}
          {!isLive && (
            <div style={{ position: 'absolute', bottom: '6px', left: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#666', minWidth: '50px' }}>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={Math.max(duration, 1)} value={currentTime} onChange={handleSeek} style={{ flex: 1, height: '4px', cursor: 'pointer' }} />
              <span style={{ fontSize: '11px', color: '#666', minWidth: '50px', textAlign: 'right' }}>{formatTime(duration)}</span>
            </div>
          )}
        </>
      )}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
