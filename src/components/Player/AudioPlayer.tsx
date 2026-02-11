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

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.volume = 1;

    const audio = audioRef.current;
    let isMounted = true;

    const handlePlay = () => { if (isMounted) setIsPlaying(true); };
    const handlePause = () => { if (isMounted) setIsPlaying(false); };
    const handleTimeUpdate = () => { if (isMounted && audio) setCurrentTime(audio.currentTime); };
    const handleLoadedMetadata = () => { 
      if (isMounted && audio) {
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) setDuration(dur);
      }
    };
    const handleEnded = () => { if (isMounted) { setIsPlaying(false); setCurrentTime(0); } };
    const handleError = () => { if (isMounted) { console.log('Audio error:', audio.error); setIsPlaying(false); } };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      isMounted = false;
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);

      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.log('Play failed:', err));
    }
  }, [isPlaying]);

  // Handle seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Format time as HH:MM:SS
  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Load stream
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const streamUrl = currentEpisode?.audioUrl || 
      (currentEpisode ? RTHK_LIVE_STREAMS[currentEpisode.channelId as keyof typeof RTHK_LIVE_STREAMS] || RTHK_LIVE_STREAMS.radio1 : '') ||
      currentChannel?.streamUrl || '';

    if (!streamUrl) return;

    const isEpisode = !!currentEpisode;
    const isChannel = !currentEpisode && !!currentChannel;

    if (isChannel) {
      const lastId = lastEpisodeIdRef.current;
      const currentId = `live-${currentChannel.id}`;
      if (lastId === currentId) return;
      lastEpisodeIdRef.current = currentId;

      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);

      if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.attachMedia(audio);
        hls.loadSource(streamUrl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { audio.muted = false; audio.volume = 1; audio.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) hls.startLoad(); });
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
    } else if (isEpisode && currentEpisode) {
      const lastId = lastEpisodeIdRef.current;
      const currentId = currentEpisode.id;
      if (lastId === currentId) return;
      lastEpisodeIdRef.current = currentId;

      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      audio.pause();
      const start = currentEpisode.startTime || 0;
      audio.currentTime = start;
      setCurrentTime(start);
      setDuration(currentEpisode.duration || 0);

      if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls({ startPosition: start });
        hlsRef.current = hls;
        hls.attachMedia(audio);
        hls.loadSource(streamUrl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const dur = audio.duration;
          if (dur && isFinite(dur) && dur > 0) setDuration(dur);
          audio.currentTime = start;
          audio.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) hls.startLoad(); });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = streamUrl;
        audio.load();
        audio.oncanplay = () => { audio.currentTime = start; audio.play().catch(() => {}); };
      } else {
        audio.src = streamUrl;
        audio.crossOrigin = 'anonymous';
        audio.load();
        audio.oncanplay = () => audio.play().catch(() => {});
      }
    }
  }, [currentEpisode, currentChannel]);

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

          <div style={{ position: 'absolute', left: '10px', top: isLive ? '12px' : '8px', width: 'calc(100% - 80px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEpisode?.title || currentChannel?.name || '未知频道'}</div>
            <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEpisode?.publishDate || currentChannel?.description || ''}</div>
          </div>

          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <button onClick={togglePlay} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>{isPlaying ? '⏸' : '▶'}</button>
          </div>

          {!isLive && (
            <div style={{ position: 'absolute', bottom: '6px', left: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#666', minWidth: '55px' }}>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={Math.max(duration, 1)} value={currentTime} onChange={handleSeek} style={{ flex: 1, height: '4px', cursor: 'pointer' }} />
              <span style={{ fontSize: '11px', color: '#666', minWidth: '55px', textAlign: 'right' }}>{formatTime(duration)}</span>
            </div>
          )}
        </>
      )}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
