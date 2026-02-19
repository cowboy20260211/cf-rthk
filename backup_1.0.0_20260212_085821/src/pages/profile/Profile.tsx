import { useState } from 'react';

export default function Profile() {
  const [autoPlay, setAutoPlay] = useState(true);
  const [rememberProgress, setRememberProgress] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <div className='p-4 pb-24'>
      <h1 className='text-2xl font-bold mb-6'>个人中心</h1>

      <section className='card mb-6'>
        <h2 className='font-bold mb-4'>播放设置</h2>
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <span>自动播放</span>
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`w-12 h-6 rounded-full ${autoPlay ? 'bg-rthk-red' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow ${autoPlay ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
          <div className='flex items-center justify-between'>
            <span>记住播放进度</span>
            <button
              onClick={() => setRememberProgress(!rememberProgress)}
              className={`w-12 h-6 rounded-full ${rememberProgress ? 'bg-rthk-red' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow ${rememberProgress ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>
      </section>

      <section className='card mb-6'>
        <h2 className='font-bold mb-4'>通知设置</h2>
        <div className='flex items-center justify-between'>
          <span>节目更新提醒</span>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full ${notifications ? 'bg-rthk-red' : 'bg-gray-300'}`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow ${notifications ? 'translate-x-6' : 'translate-x-0.5'}`}
            />
          </button>
        </div>
      </section>

      <section className='card'>
        <h2 className='font-bold mb-4'>关于</h2>
        <p className='text-sm text-gray-600'>版本: 1.0.0</p>
        <p className='text-sm text-gray-600'>香港电台CF版</p>
        <p className='text-sm text-gray-400 mt-4'>本应用仅供学习交流使用</p>
      </section>
    </div>
  );
}
