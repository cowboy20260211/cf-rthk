import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { usePlayer } from '../../stores/PlayerContext';
import { RTHK_LIVE_STREAMS } from '../../services/rthk';

export default function AudioPlayer() {
  const { currentChannel, currentEpisode } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastEpisodeIdRef = useRef<string>('');

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.volume = 1;
    audioRef.current.muted = false;

    audioRef.current.addEventListener('play', () => setIsPlaying(true));
    audioRef.current.addEventListener('pause', () => setIsPlaying(false));
    audioRef.current.addEventListener('timeupdate', () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    });
    audioRef.current.addEventListener('loadedmetadata', () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    });
    audioRef.current.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      audioRef.current = null;
    };
  }, []);

  const getStreamUrl = () => {
    if (currentEpisode && currentEpisode.audioUrl) {
      return currentEpisode.audioUrl;
    }
    if (currentEpisode) {
      const channelId = currentEpisode.channelId || 'radio1';
      return RTHK_LIVE_STREAMS[channelId as keyof typeof RTHK_LIVE_STREAMS] || RTHK_LIVE_STREAMS.radio1;
    }
    return currentChannel?.streamUrl || '';
  };

  const getDisplayName = () => {
    if (currentEpisode) return currentEpisode.title;
    return currentChannel?.name || '未知频道';
  };

  const getDisplayDesc = () => {
    if (currentEpisode) return currentEpisode.publishDate || '';
    return currentChannel?.description || '';
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    const streamUrl = getStreamUrl();

    if (!audio || !streamUrl) return;

    const isLiveStream = !currentEpisode && currentChannel;
    const isEpisodePlayback = currentEpisode;

    if (isLiveStream) {
      const lastChannelId = lastEpisodeIdRef.current.split('-')[0] === 'live' 
        ? lastEpisodeIdRef.current.replace('live-', '') 
        : '';
      const channelChanged = currentChannel?.id !== lastChannelId;

      if (!channelChanged && lastEpisodeIdRef.current.startsWith('live-')) return;

      lastEpisodeIdRef.current = `live-${currentChannel?.id || ''}`;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      audio.pause();
      audio.currentTime = 0;

      if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;

        try {
          hls.attachMedia(audio);
        } catch (e) {
          // ignore
        }

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

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    if (!isEpisodePlayback) return;

    const episodeChanged = currentEpisode.id !== lastEpisodeIdRef.current;
    lastEpisodeIdRef.current = currentEpisode.id;

    if (!episodeChanged) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    audio.pause();
    audio.currentTime = currentEpisode.startTime || 0;

    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        startPosition: currentEpisode.startTime || 0,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.currentTime = currentEpisode.startTime || 0;
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
        audio.currentTime = currentEpisode.startTime || 0;
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

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentEpisode?.id, currentEpisode?.audioUrl, currentEpisode?.startTime, currentChannel?.id, currentChannel?.streamUrl]);

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
        borderTop: isExpanded ? '2px solid #d40000' : 'none',
        zIndex: 50,
        transition: 'all 0.3s ease',
        height: isExpanded ? '80px' : '5px',
      }}
    >
      {/* 收起状态：只显示红色细条 */}
      {!isExpanded && (
        <div
          style={{
            height: '5px',
            background: '#d40000',
            width: '100%',
          }}
        />
      )}

      {/* 展开状态：显示播放器内容（不显示收藏按钮） */}
      {isExpanded && (
        <>
          {/* 展开/收起按钮 */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '25px',
              background: '#d40000',
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

          {/* 左侧：播放信息 */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '8px',
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

          {/* 右侧：播放按钮 */}
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

          {/* 时间轴 */}
          <div
            style={{
              position: 'absolute',
              bottom: '6px',
              left: '10px',
              right: '70px',
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
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              style={{
                flex: 1,
                height: '4px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '11px', color: '#666', minWidth: '35px', textAlign: 'right' }}>
              {formatTime(duration)}
            </span>
          </div>
        </>
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
