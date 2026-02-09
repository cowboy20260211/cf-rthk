import { Link } from 'react-router-dom';
import { usePlayerStore } from '../../stores/playerStore';

export default function Home() {
  const { currentChannel } = usePlayerStore();

  const liveChannels = [
    { id: 'radio1', name: '第一台', desc: '新闻、财经、时事', color: 'bg-red-600' },
    { id: 'radio2', name: '第二台', desc: '流行音乐、青年节目', color: 'bg-blue-600' },
    { id: 'radio5', name: '第五台', desc: '文化、教育、社区', color: 'bg-green-600' },
  ];

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📻</span> 直播频道
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {liveChannels.map((channel) => (
            <Link
              key={channel.id}
              to="/live"
              className="card hover:shadow-lg transition-shadow"
            >
              <div className={`w-full h-24 ${channel.color} rounded-lg mb-3 flex items-center justify-center`}>
                <span className="text-white text-2xl font-bold">{channel.name}</span>
              </div>
              <h3 className="font-bold">{channel.name}</h3>
              <p className="text-sm text-gray-500">{channel.desc}</p>
              {currentChannel?.id === channel.id && (
                <span className="inline-block mt-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                  🔴 正在播放
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📋</span> 热门节目
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Link key={i} to="/programs" className="card flex gap-4 hover:bg-gray-50">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">节目名称 {i}</h3>
                <p className="text-sm text-gray-500 mt-1">节目简介...</p>
                <p className="text-xs text-gray-400 mt-2">香港电台第{i}台</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⭐</span> 我的收藏
        </h2>
        <Link to="/favorites" className="card block text-center py-8 hover:bg-gray-50">
          <p className="text-gray-500">还没有收藏节目</p>
          <p className="text-sm text-gray-400 mt-2">点击添加收藏</p>
        </Link>
      </section>
    </div>
  );
}
