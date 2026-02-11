import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { usePlayer } from '../../stores/PlayerContext';
import { useFavorite } from '../../stores/FavoriteContext';
import { RTHK_LIVE_STREAMS } from '../../services/rthk';

export default function AudioPlayer() {
  const { currentChannel, currentEpisode } = usePlayer();
  const { favorites, addFavorite, removeFavorite } = useFavorite();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastEpisodeIdRef = useRef<string>('');

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.volume = 1;
    audioRef.current.muted = false;

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

  const toggleFavorite = () => {
    if (!currentEpisode) return;
    
    const isFav = favorites.some(f => f.programId === currentEpisode.programId);
    if (isFav) {
      const fav = favorites.find(f => f.programId === currentEpisode.programId);
      if (fav) removeFavorite(fav.id);
    } else {
      addFavorite({
        episodeId: currentEpisode.id,
        programId: currentEpisode.programId,
        title: currentEpisode.title,
        channel: currentChannel?.name || '第一台',
      });
    }
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
        background: 'transparent',
        zIndex: 50,
      }}
    >
      {/* 展开/收起按钮 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          top: isExpanded ? '-15px' : '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: isExpanded ? '30px' : '50px',
          background: '#d40000',
          borderRadius: '15px 15px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 51,
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{ color: 'white', fontSize: '12px' }}>
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* 展开状态：只显示收藏按钮 */}
      {isExpanded && (
        <div
          style={{
            background: 'white',
            borderTop: '2px solid #d40000',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <button
            onClick={toggleFavorite}
            style={{
              fontSize: '32px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {currentEpisode && favorites.some(f => f.programId === currentEpisode.programId) 
              ? '⭐' 
              : '☆'}
          </button>
        </div>
      )}

      {/* 收起状态：只显示细条 */}
      {!isExpanded && (
        <div
          style={{
            height: '8px',
            background: '#d40000',
            width: '100%',
          }}
        />
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
