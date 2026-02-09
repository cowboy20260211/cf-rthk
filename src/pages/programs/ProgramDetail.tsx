import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlayerStore } from '../../stores/playerStore';
import { useFavoriteStore } from '../../stores/favoriteStore';
import AudioPlayer from '../../components/Player/AudioPlayer';

const episodes = [
  { id: 'e1', title: '第一節', startTime: 0, duration: 1800, publishDate: '2026-02-08' },
  { id: 'e2', title: '第二節', startTime: 1800, duration: 1800, publishDate: '2026-02-08' },
  { id: 'e3', title: '第三節', startTime: 3600, duration: 1800, publishDate: '2026-02-08' },
  { id: 'e4', title: '第四節', startTime: 5400, duration: 1800, publishDate: '2026-02-08' },
];

export default function ProgramDetail() {
  const { channel, id } = useParams<{ channel: string; id: string }>();
  const { setEpisode } = usePlayerStore();
  const { favorites, addFavorite, removeFavorite } = useFavoriteStore();
  const [selectedTime, setSelectedTime] = useState(0);

  const channelName = channel === 'radio1' ? '第一台' : channel === 'radio2' ? '第二台' : '第五台';

  const isFavorite = (episodeId: string) => favorites.some((f) => f.episodeId === episodeId);

  const playEpisode = (episode: typeof episodes[0], startOffset: number) => {
    setEpisode({
      id: episode.id,
      programId: id || '',
      title: `${channelName} - ${episode.title}`,
      description: '',
      publishDate: episode.publishDate,
      duration: episode.duration,
      audioUrl: `https://stream.rthk.hk/${channel}archive/${id}`,
      startTime: episode.startTime + startOffset,
      endTime: episode.startTime + episode.duration,
    });
  };

  const toggleFavorite = (episode: typeof episodes[0]) => {
    const fav = favorites.find((f) => f.episodeId === episode.id);
    if (fav) {
      removeFavorite(fav.id);
    } else {
      addFavorite({
        episodeId: episode.id,
        programId: id || '',
        title: `${channelName} - ${episode.title}`,
        channel: channelName,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/programs" className="text-gray-500">
          ← 返回
        </Link>
      </div>

      <div className="card mb-6">
        <h1 className="text-xl font-bold">节目名称 {id}</h1>
        <p className="text-sm text-gray-500 mt-1">{channelName}</p>
        <p className="text-sm text-gray-600 mt-2">节目描述...</p>
      </div>

      <h2 className="text-lg font-bold mb-3">选择收听时段</h2>

      <div className="space-y-2 mb-6">
        {episodes.map((episode) => (
          <div key={episode.id} className="card flex items-center gap-3">
            <button
              onClick={() => playEpisode(episode, 0)}
              className="w-10 h-10 rounded-full bg-rthk-red text-white flex items-center justify-center flex-shrink-0"
            >
              ▶
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{episode.title}</span>
                {isFavorite(episode.id) && <span>⭐</span>}
              </div>
              <p className="text-xs text-gray-500">
                {formatTime(episode.duration)} • {episode.publishDate}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleFavorite(episode)}
                className="p-2 text-gray-400 hover:text-yellow-500"
              >
                {isFavorite(episode.id) ? '★' : '☆'}
              </button>
              <button
                onClick={() => playEpisode(episode, 300)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                +5分
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-3">时间轴选择</h2>
      <div className="card">
        <input
          type="range"
          min="0"
          max="7200"
          value={selectedTime}
          onChange={(e) => setSelectedTime(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>00:00</span>
          <span>{formatTime(selectedTime)}</span>
          <span>02:00</span>
        </div>
        <button
          onClick={() => {
            const episode = { ...episodes[0], startTime: selectedTime };
            playEpisode(episode, selectedTime);
          }}
          className="w-full mt-4 btn-primary"
        >
          从 {formatTime(selectedTime)} 开始播放
        </button>
      </div>

      <AudioPlayer />
    </div>
  );
}
