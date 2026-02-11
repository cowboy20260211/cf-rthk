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
  const lastEpisodeIdRef = useRef<string>('');
  const isSeekingRef = useRef(false);

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
          const oldHls = hlsRef.current;
          if (oldHls) {
            (oldHls as Hls).destroy();
          }
          const hls = new Hls();
          hlsRef.current = hls;
          (hls as any).media = audio; // Direct media assignment

          hls.loadSource(streamUrl);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            const duration = hls.media?.duration;
            if (duration && isFinite(duration) && duration > 0) {
              setHlsDuration(duration);
            }
            audio.muted = false;
            audio.volume = volume;

            audio.play().catch(err => {
              console.log('Play failed:', err);
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
          // Fallback: try direct URL
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
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>底部播放器區域</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        padding: '16px',
        borderTop: '2px solid #d40000',
        zIndex: 50,
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>{getDisplayName()}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{getDisplayDesc()}</div>
            <div style={{ fontSize: '12px', color: '#d40000' }}>{status}</div>
            {errorMsg && <div style={{ fontSize: '10px', color: '#999' }}>{errorMsg}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>
              {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </span>
            <input
              type='range'
              min='0'
              max='1'
              step='0.1'
              value={volume}
              onChange={e => {
                const newVolume = parseFloat(e.target.value);
                if (audioRef.current) {
                  audioRef.current.volume = newVolume;
                  audioRef.current.muted = false;
                }
              }}
              style={{ width: '60px', cursor: 'pointer' }}
            />
            <button
              onClick={handlePlay}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#d40000',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
          </div>
        </div>

        {currentEpisode && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
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
          </div>
        )}

        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
