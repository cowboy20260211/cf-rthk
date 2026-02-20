import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayer } from '../../stores/PlayerContext';
import { RTHK_LIVE_STREAMS, getLiveStreamFallbackUrls } from '../../services/rthk';
import { getFallbackUrls, fetchCurrentLiveProgram } from '../../services/rthkApi';

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
  programTitle?: string;
}

export default function AudioPlayer() {
  const { currentChannel, currentEpisode } = usePlayer() as {
    currentChannel: { id: string; name: string; description?: string; streamUrl?: string } | null;
    currentEpisode: Episode | null;
  };

  // Use refs for audio state to avoid stale closures
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const pollingTimerRef = useRef<number | null>(null);
  const fallbackIndexRef = useRef(0);

  const [isExpanded, setIsExpanded] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveProgramInfo, setLiveProgramInfo] = useState<{
    program: string;
    host: string;
    time: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const lastEpisodeIdRef = useRef<string>('');
  const isLive = !currentEpisode && currentChannel;

  useEffect(() => {
    if (currentChannel?.id) {
      fetchCurrentLiveProgram(currentChannel.id)
        .then(info => {
          setLiveProgramInfo(info);
        })
        .catch(() => {
          setLiveProgramInfo(null);
        });
    } else {
      setLiveProgramInfo(null);
    }
  }, [currentChannel?.id]);

  // Start polling for timeline update
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    pollingTimerRef.current = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio) {
        const time = audio.currentTime;
        const paused = audio.paused;
        if (!paused && !isSeekingRef.current) {
          setCurrentTime(time);
        }
      }
    }, 100);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Create audio element once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.volume = 1;
    audioRef.current = audio;

    // Time update - fires every ~250ms during playback
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        const paused = audioRef.current.paused;
        const current = audioRef.current.currentTime;
        if (!paused) {
          setCurrentTime(current);
        }
      }
    };

    const handlePlay = () => {
      isPlayingRef.current = true;
      setIsPlaying(true);
      startPolling();
    };

    const handlePause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      stopPolling();
    };

    const handleEnded = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      stopPolling();
      setCurrentTime(0);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      const time = audio.currentTime;
      setCurrentTime(time);
    };

    const handleError = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Play/Pause toggle
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      isPlayingRef.current = true;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          startPolling();
        })
        .catch(() => {
          isPlayingRef.current = false;
          setIsPlaying(false);
        });
    } else {
      isPlayingRef.current = false;
      setIsPlaying(false);
      stopPolling();
      audio.pause();
    }
  }, [startPolling, stopPolling]);

  // Seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    isSeekingRef.current = true;
    audio.currentTime = time;

    // Reset seeking flag after a short delay
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 100);
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

  // Load media when channel/episode changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let streamUrl = '';
    if (currentEpisode?.audioUrl) {
      streamUrl = currentEpisode.audioUrl;
    } else if (currentEpisode) {
      streamUrl =
        RTHK_LIVE_STREAMS[currentEpisode.channelId as keyof typeof RTHK_LIVE_STREAMS] ||
        RTHK_LIVE_STREAMS.radio1;
    } else if (currentChannel?.streamUrl) {
      streamUrl = currentChannel.streamUrl;
    }

    if (!streamUrl) {
      return;
    }

    const episodeId = currentEpisode?.id || `live-${currentChannel?.id || ''}`;

    // Don't reload if same content
    if (lastEpisodeIdRef.current === episodeId && audio.src === streamUrl) {
      return;
    }
    lastEpisodeIdRef.current = episodeId;
    fallbackIndexRef.current = 0;

    // Cleanup old HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Stop current playback
    audio.pause();
    isPlayingRef.current = false;

    // Set initial duration from episode data (fallback)
    if (!isLive && currentEpisode) {
      const dur = currentEpisode.duration || 3600;
      setDuration(dur);
      const start = currentEpisode.startTime || 0;
      audio.currentTime = start;
    } else {
      setDuration(0);
    }

    // Load stream
    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls(
        isLive
          ? {
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
            }
          : { startPosition: currentEpisode?.startTime || 0 }
      );
      hlsRef.current = hls;
      hls.attachMedia(audio);
      hls.loadSource(streamUrl);
      setError(null);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setError(null);
        setRetryCount(0);
        // Extract duration from HLS levels - 使用 totalduration 获取节目总时长
        let hlsDuration = 0;
        if (hls.levels && hls.levels.length > 0) {
          const level = hls.levels[0];
          if (level.details) {
            const details = level.details as any;
            // totalduration 是所有片段的总时长（以秒为单位）
            if (typeof details.totalduration === 'number' && details.totalduration > 0) {
              hlsDuration = details.totalduration;
            }
            // 备选：使用 duration 属性
            else if (typeof details.duration === 'number' && details.duration > 0) {
              hlsDuration = details.duration;
            }
          }
        }

        // Set duration from HLS metadata
        if (hlsDuration > 0) {
          setDuration(hlsDuration);
        }

        if (!isLive && currentEpisode) {
          audio.currentTime = currentEpisode.startTime || 0;
        }
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            startPolling();
          })
          .catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (isLive) {
                const channelId = currentChannel?.id || 'radio2';
                const fallbackLiveUrls = getLiveStreamFallbackUrls(channelId);

                const currentUrl = hls.url || streamUrl;
                const currentIndex = fallbackLiveUrls.indexOf(currentUrl);

                if (currentIndex >= 0 && currentIndex < fallbackLiveUrls.length - 1) {
                  const nextUrl = fallbackLiveUrls[currentIndex + 1];
                  setRetryCount(0);
                  setError(`主线路连接失败，正在切换备用线路...`);
                  setTimeout(() => {
                    hls.loadSource(nextUrl);
                    hls.startLoad();
                  }, 500);
                } else {
                  const maxRetries = 2;
                  if (retryCount < maxRetries) {
                    setRetryCount(prev => prev + 1);
                    setError(`连接中断，正在重试 (${retryCount + 1}/${maxRetries})...`);
                    setTimeout(
                      () => {
                        hls.loadSource(fallbackLiveUrls[0]);
                        hls.startLoad();
                      },
                      1000 * (retryCount + 1)
                    );
                  } else {
                    setError('直播连接失败，请检查网络后重试');
                    hls.destroy();
                  }
                }
              } else if (
                currentEpisode?.audioUrl &&
                currentEpisode.channelId &&
                currentEpisode.programId &&
                currentEpisode.publishDate
              ) {
                const fallbackUrls = getFallbackUrls(
                  currentEpisode.channelId,
                  currentEpisode.programId,
                  currentEpisode.publishDate
                );

                const currentUrl = hls.url || streamUrl;
                const currentIndex = fallbackUrls.indexOf(currentUrl);

                if (currentIndex >= 0 && currentIndex < fallbackUrls.length - 1) {
                  fallbackIndexRef.current = currentIndex + 1;
                } else {
                  fallbackIndexRef.current = 0;
                }

                if (fallbackIndexRef.current < fallbackUrls.length) {
                  const nextUrl = fallbackUrls[fallbackIndexRef.current];
                  if (nextUrl !== streamUrl) {
                    hls.loadSource(nextUrl);
                    hls.startLoad();
                  }
                }
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else {
      audio.src = streamUrl;
      audio.load();
      audio.oncanplay = () => {
        if (!isLive && currentEpisode) {
          audio.currentTime = currentEpisode.startTime || 0;
        }
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            startPolling();
          })
          .catch(() => {});
      };
    }
  }, [currentEpisode, currentChannel, retryCount]);

  useEffect(() => {
    if (!currentChannel && !currentEpisode) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setDuration(0);
    }
  }, [currentChannel, currentEpisode]);

  if (!currentChannel && !currentEpisode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: isExpanded ? 'white' : 'transparent',
        zIndex: 50,
        height: isExpanded ? (isLive ? '50px' : '80px') : '5px',
      }}
    >
      {/* Collapsed */}
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

      {/* Expanded */}
      {isExpanded && (
        <>
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

          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: isLive ? '8px' : '4px',
              width: 'calc(100% - 60px)',
            }}
          >
            {/* Live indicator */}
            {isLive && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '2px',
                }}
              >
                <span
                  style={{
                    background: '#d40000',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  LIVE
                </span>
                <span style={{ fontSize: '9px', color: '#d40000', fontWeight: 'bold' }}>
                  现正播放
                </span>
              </div>
            )}

            <div
              style={{
                fontSize: isLive ? '13px' : '14px',
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentEpisode
                ? currentEpisode.programTitle || currentEpisode.title
                : isLive
                  ? `${currentChannel?.name || ''} - ${liveProgramInfo?.program || '未知'}`
                  : liveProgramInfo?.program || currentChannel?.name || '未知'}
            </div>

            {/* Second line: host or description */}
            <div
              style={{
                fontSize: '11px',
                color: '#666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {error ? (
                <span style={{ color: '#d40000' }}>{error}</span>
              ) : isLive ? (
                <span>
                  {liveProgramInfo?.host && (
                    <span style={{ marginRight: '8px' }}>主持: {liveProgramInfo.host}</span>
                  )}
                  {liveProgramInfo?.time && (
                    <span style={{ color: '#999' }}>{liveProgramInfo.time}</span>
                  )}
                </span>
              ) : currentEpisode ? (
                <span>
                  {currentEpisode.programTitle && <span>{currentEpisode.programTitle} - </span>}
                  {currentEpisode.publishDate || currentEpisode.description || ''}
                </span>
              ) : (
                currentChannel?.description || ''
              )}
            </div>
          </div>

          {/* Play button - 25px red circle */}
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <button
              onClick={handlePlayPause}
              style={{
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: '#d40000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ color: 'white', fontSize: '10px' }}>{isPlaying ? '⏸' : '▶'}</span>
            </button>
          </div>

          {/* Timeline */}
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
              <span style={{ fontSize: '11px', color: '#666', minWidth: '40px' }}>
                {formatTime(currentTime)}
              </span>
              <input
                type='range'
                min={0}
                max={Math.max(duration, 1)}
                value={currentTime}
                onChange={handleSeek}
                style={{ flex: 1, height: '4px', cursor: 'pointer' }}
              />
              <span
                style={{ fontSize: '11px', color: '#666', minWidth: '45px', textAlign: 'right' }}
              >
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
