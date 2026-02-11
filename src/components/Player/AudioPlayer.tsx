import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { usePlayer } from '../../stores/PlayerContext';
import { RTHK_LIVE_STREAMS } from '../../services/rthk';

export default function AudioPlayer() {
  const { currentChannel, currentEpisode, volume } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState('等待中');
  const [isPaused, setIsPaused] = useState(true);
  const [startOffset, setStartOffset] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [hlsDuration, setHlsDuration] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastEpisodeIdRef = useRef<string>('');
  const isSeekingRef = useRef(false);

  // 默认最大音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 1;
      audioRef.current.muted = false;
    }
  }, []);

  const getStreamUrl = () => {
    if (currentEpisode && currentEpisode.audioUrl) {
      return currentEpisode.audioUrl;
    }
    if (currentEpisode) {
      const channelId = currentEpisode.channelId || 'radio1';
      return (
        RTHK_LIVE_STREAMS[channelId as keyof typeof RTHK_LIVE_STREAMS] || RTHK_LIVE_STREAMS.radio1
      );
    }
    return currentChannel?.streamUrl || '';
  };

  const getDisplayName = () => {
    if (currentEpisode) return currentEpisode.title;
    return currentChannel?.name || '未知';
  };

  const getDisplayDesc = () => {
    if (currentEpisode) {
      return currentEpisode.publishDate;
    }
    return currentChannel?.description || '';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.volume = volume;
    audioRef.current.muted = false;
    audioRef.current.addEventListener('play', () => console.log('Audio play event'));
    audioRef.current.addEventListener('error', e => console.log('Audio error:', e));
  }, []);

  // Sync volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = false;
    }
  }, [volume]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && !isSeekingRef.current) {
        setIsPaused(audioRef.current.paused);
        if (!audioRef.current.paused) {
          setStartOffset(audioRef.current.currentTime);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const streamUrl = getStreamUrl();

    if (!audio || !streamUrl) return;

    // Check if this is a live stream (no episode, but has channel)
    const isLiveStream = !currentEpisode && currentChannel;
    const isEpisodePlayback = currentEpisode;

    if (isLiveStream) {
      // Live stream mode
      const lastChannelId =
        lastEpisodeIdRef.current.split('-')[0] === 'live'
          ? lastEpisodeIdRef.current.replace('live-', '')
          : '';
      const channelChanged = currentChannel?.id !== lastChannelId;

      if (!channelChanged && lastEpisodeIdRef.current.startsWith('live-')) return;

      lastEpisodeIdRef.current = `live-${currentChannel?.id || ''}`;

      console.log('Loading live stream:', streamUrl);
      setStatus('加載中...');

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      audio.pause();
      audio.currentTime = 0;

      if (streamUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
          // Create new Hls instance each time
          const oldHls = hlsRef.current;
          if (oldHls) {
            try {
              (oldHls as unknown as { destroy: () => void }).destroy();
            } catch (e) {
              console.log('HLS destroy error:', e);
            }
          }

          const hls = new Hls();
          hlsRef.current = hls;

          // Use attachMedia but handle the message channel error
          try {
            hls.attachMedia(audio);
          } catch (e) {
            console.log('attachMedia error:', e);
            // Fallback: just load source directly
          }

          hls.loadSource(streamUrl);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            const duration = hls.media?.duration;
            if (duration && isFinite(duration) && duration > 0) {
              setHlsDuration(duration);
            }
            audio.muted = false;
            audio.volume = volume;

            audio.play().catch(() => {
              setStatus('點擊播放');
            });
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setErrorMsg('網絡錯誤，請檢查連線 (可能需要香港IP)');
                  setStatus('網絡錯誤');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setErrorMsg('媒體錯誤，請嘗試其他節目');
                  setStatus('媒體錯誤');
                  break;
                default:
                  setErrorMsg('加載失敗');
                  setStatus('加載錯誤');
                  break;
              }
            }
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          audio.src = streamUrl;
          audio.muted = false;
          audio.volume = volume;
          audio.play().catch(() => setStatus('點擊播放'));
        } else {
          // Try direct URL as fallback
          audio.src = streamUrl;
          audio.muted = false;
          audio.volume = volume;
          audio.play().catch(() => setStatus('點擊播放'));
        }
      } else {
        audio.src = streamUrl;
        audio.muted = false;
        audio.volume = volume;
        audio.play().catch(() => setStatus('點擊播放'));
      }

      audio.onwaiting = () => setStatus('緩衝中...');
      audio.onplaying = () => setStatus('播放中');
      audio.onended = () => setStatus('播放結束');
      audio.onerror = () => {
        setErrorMsg(`錯誤: ${audio.error?.message || '未知錯誤'}`);
        setStatus('播放錯誤');
      };

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    // Episode playback mode
    if (!isEpisodePlayback) return;

    const episodeChanged = currentEpisode.id !== lastEpisodeIdRef.current;
    lastEpisodeIdRef.current = currentEpisode.id;

    if (!episodeChanged) return;

    console.log('Loading episode:', streamUrl);
    setStatus('加載中...');
    setStartOffset(currentEpisode.startTime || 0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    audio.pause();
    audio.currentTime = currentEpisode.startTime || 0;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        // HLS.js with CORS support
        const hls = new Hls({
          startPosition: currentEpisode.startTime || 0,
          // Increase timeouts for slow connections
          loader: Hls.DefaultConfig.loader,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const duration = hls.media?.duration;
          if (duration && isFinite(duration) && duration > 0) {
            setHlsDuration(duration);
            console.log('Episode HLS duration:', duration);
          }
          audio.currentTime = currentEpisode.startTime || 0;
          audio
            .play()
            .then(() => {
              setStatus('播放中');
              setErrorMsg('');
            })
            .catch(() => setStatus('點擊播放'));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setErrorMsg('網絡錯誤，請檢查連線 (可能需要香港IP)');
                setStatus('網絡錯誤');
                // Try to recover
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setErrorMsg('媒體錯誤，請嘗試其他節目');
                setStatus('媒體錯誤');
                break;
              default:
                setErrorMsg(`加載失敗: ${data.type}`);
                setStatus('加載錯誤');
                break;
            }
          }
        });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = streamUrl;
        audio.load();
        audio.oncanplay = () => {
          audio.currentTime = currentEpisode.startTime || 0;
          audio
            .play()
            .then(() => setStatus('播放中'))
            .catch(() => setStatus('點擊播放'));
        };
      }
    } else {
      audio.src = streamUrl;
      audio.crossOrigin = 'anonymous';
      audio.load();
      audio.oncanplay = () => {
        audio
          .play()
          .then(() => {
            setStatus('播放中');
            setErrorMsg('');
          })
          .catch(() => setStatus('點擊播放'));
      };
    }

    audio.onwaiting = () => setStatus('緩衝中...');
    audio.onplaying = () => setStatus('播放中');
    audio.onended = () => setStatus('播放結束');
    audio.onerror = () => {
      setErrorMsg(`錯誤: ${audio.error?.message || '未知錯誤'}`);
      setStatus('播放錯誤');
    };

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentEpisode?.id, currentEpisode?.audioUrl, currentChannel?.id, currentChannel?.streamUrl]);

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setStatus('已暫停');
    } else {
      audio
        .play()
        .then(() => setStatus('播放中'))
        .catch(() => setStatus('播放失敗'));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOffset = Number(e.target.value);
    isSeekingRef.current = true;
    setStartOffset(newOffset);
    if (audioRef.current) {
      audioRef.current.currentTime = newOffset;
    }
  };

  const handleTimeChangeEnd = () => {
    isSeekingRef.current = false;
  };

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
        background: 'white',
        borderTop: '2px solid #d40000',
        zIndex: 50,
      }}
    >
      {/* 顶部红色横线中间的展开/收起按钮 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          top: '-15px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '30px',
          background: '#d40000',
          borderRadius: '15px 15px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 51,
        }}
      >
        <span style={{ color: 'white', fontSize: '12px' }}>{isExpanded ? '▼' : '▲'}</span>
      </div>

      {/* 收起状态：只显示红色播放按钮 */}
      {!isExpanded && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '8px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={handlePlay}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#d40000',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      )}

      {/* 展开状态：显示完整播放器 */}
      {isExpanded && (
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
          }}
        >
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{getDisplayName()}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{getDisplayDesc()}</div>
            <div style={{ fontSize: '12px', color: '#d40000', marginTop: '4px' }}>{status}</div>
            {errorMsg && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{errorMsg}</div>
            )}
          </div>

          {/* 播放按钮 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <button
              onClick={handlePlay}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#d40000',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
          </div>

          {/* 进度条 */}
          {currentEpisode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>
                {formatTime(startOffset)}
              </span>
              <input
                type='range'
                min='0'
                max={hlsDuration || currentEpisode.duration || 3600}
                value={startOffset}
                onChange={handleTimeChange}
                onMouseUp={handleTimeChangeEnd}
                onTouchEnd={handleTimeChangeEnd}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span
                style={{ fontSize: '12px', color: '#666', minWidth: '40px', textAlign: 'right' }}
              >
                {formatTime(hlsDuration || currentEpisode.duration || 3600)}
              </span>
            </div>
          )}
        </div>
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
