import { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';

export default function Profile() {
  const { volume } = usePlayerStore();
  const [settings, setSettings] = useState({
    autoPlay: true,
    rememberProgress: true,
    defaultQuality: 'high' as const,
    notifications: false,
  });

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">🎧 播放设置</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>自动播放</span>
            <button
              onClick={() => setSettings({ ...settings, autoPlay: !settings.autoPlay })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.autoPlay ? 'bg-rthk-red' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.autoPlay ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span>记住播放进度</span>
            <button
              onClick={() => setSettings({ ...settings, rememberProgress: !settings.rememberProgress })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.rememberProgress ? 'bg-rthk-red' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.rememberProgress ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <span className="block mb-2">音量</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              className="w-full"
            />
          </div>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">🔔 通知设置</h2>
        <div className="flex items-center justify-between">
          <span>节目更新提醒</span>
          <button
            onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.notifications ? 'bg-rthk-red' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">📱 关于</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>版本: 1.0.0</p>
          <p>香港电台CF版</p>
          <p className="text-gray-400 mt-4">
            本应用仅供学习交流使用，所有内容版权归香港电台所有。
          </p>
        </div>
      </section>

      <section className="card">
        <button className="w-full py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50">
          清除缓存
        </button>
      </section>
    </div>
  );
}
