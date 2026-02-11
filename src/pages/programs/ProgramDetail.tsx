import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlayer } from '../../stores/PlayerContext';
import { useFavorite } from '../../stores/FavoriteContext';
import {
  rthkApi,
  fetchEpisodesWithActualDuration,
  type Program,
  type Episode,
} from '../../services/rthkApi';

export default function ProgramDetail() {
  const { channel, id } = useParams<{ channel: string; id: string }>();
  const { currentEpisode, setEpisode } = usePlayer();
  const { favorites, addFavorite, removeFavorite } = useFavorite();
  const [data, setData] = useState<{ program: Program; episodes: Episode[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const channelName = channel === 'radio1' ? '第一台' : channel === 'radio2' ? '第二台' : '第五台';

  const isProgramFavorited = data ? favorites.some(f => f.programId === data.program.id) : false;

  const playEpisode = (ep: Episode) => {
    console.log('Playing episode:', ep);
    console.log('Episode duration:', ep.duration, 'seconds');
    const episodeDuration = ep.duration || 3600;
    setEpisode({
      id: ep.id,
      programId: ep.programId,
      channelId: ep.channelId,
      title: ep.title,
      description: ep.description || '',
      publishDate: ep.publishDate,
      duration: episodeDuration,
      audioUrl: ep.audioUrl || '',
      startTime: 0,
      endTime: episodeDuration,
    });
  };

  const toggleProgramFavorite = () => {
    if (!data) return;

    if (isProgramFavorited) {
      const fav = favorites.find(f => f.programId === data.program.id);
      if (fav) {
        removeFavorite(fav.id);
      }
    } else {
      addFavorite({
        episodeId: data.program.id,
        programId: data.program.id,
        title: data.program.title,
        channel: channelName,
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (channel && id) {
        setLoading(true);

        const result = await rthkApi.getProgramDetail(channel, id);

        if (result) {
          // Try to fetch actual duration from m3u8
          const { episodes } = await fetchEpisodesWithActualDuration(channel, id);

          const combinedResult = {
            ...result,
            episodes: episodes.length > 0 ? episodes : result.episodes,
          };

          setData(combinedResult);
          setLoading(false);

          if (combinedResult.episodes.length > 0) {
            const latestEpisode = combinedResult.episodes[0];
            console.log('Playing episode with duration:', latestEpisode.duration, 'seconds');
            playEpisode(latestEpisode);
          }
        } else {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [channel, id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    return `${month}月${day}日 (${weekday})`;
  };

  const isCurrentEpisode = (episodeId: string) => {
    return currentEpisode?.id === episodeId;
  };

  if (loading) {
    return (
      <div className='p-4 pb-28 text-center'>
        <p className='text-gray-500'>載入中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='p-4 pb-28 text-center'>
        <p className='text-gray-500'>節目不存在</p>
        <Link to='/programs' className='text-rthk-red mt-4 inline-block'>
          返回節目列表
        </Link>
      </div>
    );
  }

  const { program, episodes } = data;

  return (
    <div className='p-4 pb-28'>
      <div className='flex items-center justify-between mb-4'>
        <Link to='/programs' className='text-gray-500'>
          ← 返回
        </Link>
        <Link to='/' className='text-gray-500'>
          首頁 →
        </Link>
      </div>

      <div className='card mb-6'>
        <div
          className={`w-full h-24 ${channel === 'radio1' ? 'bg-red-600' : channel === 'radio2' ? 'bg-blue-600' : 'bg-green-600'} rounded-lg mb-3 flex items-center justify-center`}
        >
          <span className='text-white text-3xl font-bold'>
            {channel === 'radio1' ? '1' : channel === 'radio2' ? '2' : '5'}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-bold'>{program.title}</h1>
          <button onClick={toggleProgramFavorite} className='text-2xl cursor-pointer'>
            {isProgramFavorited ? '⭐' : '☆'}
          </button>
        </div>
        <p className='text-sm text-gray-500 mt-1'>{channelName}</p>
        <p className='text-sm text-gray-600 mt-2'>{program.description}</p>
        <p className='text-xs text-gray-400 mt-2'>播出時間: {program.schedule}</p>
        <p className='text-xs text-gray-400 mt-1'>共 {episodes.length} 集</p>
      </div>

      <h2 className='text-lg font-bold mb-3'>選擇收聽時段</h2>

      <div className='space-y-2'>
        {episodes.map(episode => (
          <div
            key={episode.id}
            onClick={() => playEpisode(episode)}
            className={`card flex items-center gap-3 cursor-pointer ${
              isCurrentEpisode(episode.id)
                ? 'border-2 border-rthk-red bg-red-50'
                : 'border border-transparent hover:bg-gray-50'
            }`}
          >
            <div className='w-10 h-10 rounded-full bg-rthk-red text-white flex items-center justify-center flex-shrink-0'>
              {isCurrentEpisode(episode.id) ? '🔊' : '▶'}
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <span
                  className={`font-medium truncate ${isCurrentEpisode(episode.id) ? 'text-rthk-red' : ''}`}
                >
                  {formatDate(episode.publishDate)}
                </span>
                {isCurrentEpisode(episode.id) && (
                  <span className='text-xs bg-rthk-red text-white px-2 py-0.5 rounded-full'>
                    正在播放
                  </span>
                )}
              </div>
              <p className='text-xs text-gray-500 truncate'>
                {program.title} - {episode.publishDate} 足本重溫
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
