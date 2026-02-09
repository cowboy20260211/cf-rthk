import { useState } from 'react';
import { Link } from 'react-router-dom';

const channels = [
  { id: 'radio1', name: '第一台' },
  { id: 'radio2', name: '第二台' },
  { id: 'radio5', name: '第五台' },
];

const programs = [
  { id: '1', title: '新闻时空', channel: 'radio1', date: '2026-02-08' },
  { id: '2', title: '财经即时通', channel: 'radio1', date: '2026-02-08' },
  { id: '3', title: '讲东讲西', channel: 'radio2', date: '2026-02-08' },
  { id: '4', title: '音乐少年', channel: 'radio2', date: '2026-02-08' },
  { id: '5', title: '文化星空', channel: 'radio5', date: '2026-02-08' },
  { id: '6', title: '教育新天地', channel: 'radio5', date: '2026-02-08' },
];

export default function Programs() {
  const [selectedChannel, setSelectedChannel] = useState<string>('radio1');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrograms = programs.filter(
    (p) =>
      p.channel === selectedChannel &&
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || true)
  );

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">节目重温</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => setSelectedChannel(channel.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              selectedChannel === channel.id
                ? 'bg-rthk-red text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {channel.name}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="搜索节目..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-rthk-red"
      />

      <div className="space-y-3">
        {filteredPrograms.map((program) => (
          <Link
            key={program.id}
            to={`/programs/${program.channel}/${program.id}`}
            className="card flex gap-4 hover:bg-gray-50"
          >
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
              <span className="text-2xl">📻</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{program.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                更新日期: {program.date}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {channels.find((c) => c.id === program.channel)?.name}
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0 self-center"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
