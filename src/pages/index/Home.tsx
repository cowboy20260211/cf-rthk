import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../../stores/PlayerContext';
import { useFavorite } from '../../stores/FavoriteContext';
import { RTHK_LIVE_STREAMS } from '../../services/rthk';
import { fetchPopularPrograms, fetchCurrentPlaying, type Program } from '../../services/rthkApi';

interface LiveProgramInfo {
  program: string;
  host: string;
}

export default function Home() {
  const { currentChannel, setChannel } = usePlayer();
  const { favorites } = useFavorite();
  const [popularPrograms, setPopularPrograms] = useState<Program[]>([]);
  const [liveProgramInfo, setLiveProgramInfo] = useState<Record<string, LiveProgramInfo>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [networkError, setNetworkError] = useState(false);

  const updateLiveProgramInfo = useCallback(() => {
    const channels = ['radio1', 'radio2', 'radio5'];
    Promise.allSettled(
      channels.map(channelId =>
        fetchCurrentPlaying(channelId).then(info => {
          if (info) {
            setLiveProgramInfo(prev => ({
              ...prev,
              [channelId]: { program: info.program, host: info.host },
            }));
          }
        })
      )
    ).then(() => {
      setLastUpdate(new Date());
    });
  }, []);

  useEffect(() => {
    fetchPopularPrograms()
      .then(programs => {
        setPopularPrograms(programs.slice(0, 4));
        setNetworkError(false);
      })
      .catch(() => {
        setNetworkError(true);
      });
  }, []);

  useEffect(() => {
    updateLiveProgramInfo();
    const timer = setInterval(updateLiveProgramInfo, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [updateLiveProgramInfo]);

  const liveChannels = [
    {
      id: 'radio1',
      name: '第一台',
      nameEn: 'Radio 1',
      desc: '新聞、財經、時事',
      frequency: 'FM 92.6MHz',
      color: 'bg-red-600',
    },
    {
      id: 'radio2',
      name: '第二台',
      nameEn: 'Radio 2',
      desc: '流行音樂、青年節目',
      frequency: 'FM 94.8MHz',
      color: 'bg-blue-600',
    },
    {
      id: 'radio5',
      name: '第五台',
      nameEn: 'Radio 5',
      desc: '文化、教育、社區',
      frequency: 'AM 783kHz',
      color: 'bg-green-600',
    },
  ];

  const playChannel = (channel: (typeof liveChannels)[0]) => {
    const channelData = {
      id: channel.id,
      name: channel.name,
      nameEn: channel.nameEn,
      streamUrl: RTHK_LIVE_STREAMS[channel.id] || '',
      logo: '',
      description: channel.desc,
    };
    setChannel(channelData);
  };

  const getChannelName = (channelId: string): string => {
    const channel = liveChannels.find(c => c.id === channelId);
    return channel?.name || channelId;
  };

  return (
    <div className='p-4 space-y-6'>
      <section>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold flex items-center gap-2'>
            <span>📻</span> 直播頻道
          </h2>
          {lastUpdate && (
            <span className='text-xs text-gray-400'>
              更新: {lastUpdate.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {liveChannels.map(channel => (
            <div key={channel.id} className='card'>
              <div
                className={`w-full h-20 ${channel.color} rounded-lg mb-3 flex items-center justify-center`}
              >
                <span className='text-white text-2xl font-bold'>{channel.name}</span>
              </div>
              <h3 className='font-bold'>{channel.name}</h3>
              <p className='text-sm text-gray-500'>{channel.desc}</p>
              <p className='text-xs text-gray-400 mt-1'>{channel.frequency}</p>
              <button
                onClick={() => playChannel(channel)}
                className={`mt-3 w-full py-2 rounded-lg font-medium ${
                  currentChannel?.id === channel.id
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-rthk-red text-white'
                }`}
              >
                {currentChannel?.id === channel.id ? '✅ 正在收聽' : '▶ 開始收聽'}
              </button>
              {liveProgramInfo[channel.id] && (
                <p className='text-xs text-rthk-red mt-2 font-medium'>
                  現正播放: {liveProgramInfo[channel.id].program}
                  {liveProgramInfo[channel.id].host && ` - ${liveProgramInfo[channel.id].host}`}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold flex items-center gap-2'>
            <span>📋</span> 熱門節目
          </h2>
          <Link to='/programs' className='text-sm text-rthk-red hover:underline'>
            查看全部 →
          </Link>
        </div>
        {networkError || popularPrograms.length === 0 ? (
          <div className='card text-center py-8 text-gray-500'>
            <p>無法獲取熱門節目資訊</p>
            <p className='text-sm text-gray-400 mt-2'>請檢查網絡連接或稍後再試</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {popularPrograms.map((program: Program) => (
              <Link
                key={program.id}
                to={`/programs/${program.channelId}/${program.id}`}
                className='card flex gap-4 hover:bg-gray-50'
              >
                <div className='w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center'>
                  <span className='text-2xl'>📻</span>
                </div>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-bold truncate'>{program.title}</h3>
                  <p className='text-sm text-gray-500 mt-1'>{program.description}</p>
                  <p className='text-xs text-gray-400 mt-2'>
                    {getChannelName(program.channelId)} | {program.episodeCount || 0} 集
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold flex items-center gap-2'>
            <span>⭐</span> 我的收藏
          </h2>
          <Link to='/favorites' className='text-sm text-rthk-red hover:underline'>
            管理 →
          </Link>
        </div>
        {favorites.length === 0 ? (
          <Link to='/favorites' className='card block text-center py-8 hover:bg-gray-50'>
            <p className='text-gray-500'>還沒有收藏節目</p>
            <p className='text-sm text-gray-400 mt-2'>點擊添加收藏</p>
          </Link>
        ) : (
          <Link to='/favorites' className='card block hover:bg-gray-50'>
            <div className='flex items-center justify-between py-4'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-full bg-rthk-red text-white flex items-center justify-center text-xl'>
                  ⭐
                </div>
                <div>
                  <h3 className='font-bold'>已收藏 {favorites.length} 個節目</h3>
                  <p className='text-sm text-gray-500'>點擊查看和管理</p>
                </div>
              </div>
              <span className='text-rthk-red'>→</span>
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}
