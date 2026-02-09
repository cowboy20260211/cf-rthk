import { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import AudioPlayer from '../../components/Player/AudioPlayer';

const channels = [
  {
    id: 'radio1',
    name: '第一台',
    nameEn: 'Radio 1',
    description: '新闻、财经、时事',
    color: 'bg-red-600',
    frequency: 'FM 92.6MHz',
  },
  {
    id: 'radio2',
    name: '第二台',
    nameEn: 'Radio 2',
    description: '流行音乐、青年节目',
    color: 'bg-blue-600',
    frequency: 'FM 94.8MHz',
  },
  {
    id: 'radio5',
    name: '第五台',
    nameEn: 'Radio 5',
    description: '文化、教育、社区',
    color: 'bg-green-600',
    frequency: 'AM 783kHz',
  },
];

export default function Live() {
  const { currentChannel, setChannel, setEpisode } = usePlayerStore();

  const playChannel = (channel: typeof channels[0]) => {
    setChannel({
      id: channel.id,
      name: channel.name,
      nameEn: channel.nameEn,
      streamUrl: `https://stream.rthk.hk/${channel.id}live`,
      logo: '',
      description: channel.description,
    });
    setEpisode(null);
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">直播频道</h1>

      <div className="space-y-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`card ${currentChannel?.id === channel.id ? 'ring-2 ring-rthk-red' : ''}`}
          >
            <div className="flex gap-4">
              <div
                className={`w-20 h-20 ${channel.color} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white text-2xl font-bold">{channel.name}</span>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{channel.name}</h2>
                    <p className="text-sm text-gray-500">{channel.nameEn}</p>
                  </div>
                  {currentChannel?.id === channel.id && (
                    <span className="flex items-center gap-1 text-red-600">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mt-2">{channel.description}</p>
                <p className="text-xs text-gray-400 mt-1">{channel.frequency}</p>

                <button
                  onClick={() => playChannel(channel)}
                  className={`mt-3 px-6 py-2 rounded-full font-medium transition-colors ${
                    currentChannel?.id === channel.id
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-rthk-red text-white hover:bg-red-700'
                  }`}
                >
                  {currentChannel?.id === channel.id ? '正在收听' : '开始收听'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AudioPlayer />
    </div>
  );
}
