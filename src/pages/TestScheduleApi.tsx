import { useState, useEffect } from 'react';
import {
  fetchRadioSchedule,
  fetchCurrentPlaying,
  type RadioScheduleItem,
  type CurrentPlayingItem,
} from '../services/rthkApi';

export default function TestScheduleApi() {
  const [schedule, setSchedule] = useState<RadioScheduleItem[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<CurrentPlayingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelId, setChannelId] = useState('radio2');

  useEffect(() => {
    setLoading(true);

    Promise.all([fetchRadioSchedule(channelId), fetchCurrentPlaying(channelId)])
      .then(([scheduleData, playingData]) => {
        setSchedule(scheduleData);
        setCurrentPlaying(playingData);

        console.log('========== 节目表JSON数组 ==========');
        console.log(JSON.stringify(scheduleData, null, 2));
        console.log('========== 共 ' + scheduleData.length + ' 个节目 ==========');

        if (playingData) {
          console.log('========== 正在直播 (独立API) ==========');
          console.log(JSON.stringify(playingData, null, 2));
        }
      })
      .catch(err => {
        console.error('获取节目表失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [channelId]);

  return (
    <div className='p-4 pb-24'>
      <div className='flex items-center justify-between mb-4'>
        <a href='/' className='text-gray-500'>
          ← 返回首頁
        </a>
        <h1 className='text-2xl font-bold'>電台節目表</h1>
        <div className='w-16'></div>
      </div>

      {currentPlaying && (
        <div className='mb-6 p-4 bg-gradient-to-r from-rthk-red to-red-600 rounded-lg text-white'>
          <div className='flex items-center gap-2 mb-2'>
            <span className='bg-white text-rthk-red text-xs px-2 py-1 rounded-full font-bold'>
              LIVE
            </span>
            <span className='text-sm opacity-90'>正在直播</span>
          </div>
          <h2 className='text-xl font-bold mb-1'>{currentPlaying.program}</h2>
          <p className='text-sm opacity-90'>{currentPlaying.host || '詳情請查看電台官網'}</p>
        </div>
      )}

      <div className='flex gap-2 mb-4 flex-wrap'>
        {['radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'pth'].map(ch => (
          <button
            key={ch}
            onClick={() => setChannelId(ch)}
            className={`px-4 py-2 rounded-full text-sm ${
              channelId === ch ? 'bg-rthk-red text-white' : 'bg-gray-200'
            }`}
          >
            {ch === 'radio1'
              ? '第一台'
              : ch === 'radio2'
                ? '第二台'
                : ch === 'radio3'
                  ? '第三台'
                  : ch === 'radio4'
                    ? '第四台'
                    : ch === 'radio5'
                      ? '第五台'
                      : '普通話台'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className='text-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-rthk-red mx-auto'></div>
          <p className='mt-4 text-gray-500'>正在加载...</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {schedule.map((item, index) => (
            <div
              key={index}
              className={`card p-4 ${currentPlaying && currentPlaying.program === item.program ? 'bg-red-50 border-2 border-rthk-red' : ''}`}
            >
              <div className='flex items-center gap-4'>
                <span className='text-lg font-bold text-gray-500 w-24'>{item.time}</span>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <h3 className='font-bold'>{item.program}</h3>
                    {currentPlaying && currentPlaying.program === item.program && (
                      <span className='bg-rthk-red text-white text-xs px-2 py-0.5 rounded-full'>
                        正在播放
                      </span>
                    )}
                  </div>
                  {item.host && <p className='text-sm text-gray-500'>{item.host}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-8 p-4 bg-gray-100 rounded-lg'>
        <h3 className='font-bold mb-2'>JSON输出 (查看Console)</h3>
        <p className='text-sm text-gray-500'>请打开浏览器开发者工具的Console查看完整JSON数组</p>
      </div>
    </div>
  );
}
