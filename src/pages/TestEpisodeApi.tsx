import { useState } from 'react';
import {
  fetchAllProgramsFromArchive,
  fetchEpisodesFromRTHK,
  type Program,
  type Episode,
} from '../services/rthkApi';

const channels = [
  { id: 'radio1', name: '第一台' },
  { id: 'radio2', name: '第二台' },
  { id: 'radio3', name: '第三台' },
  { id: 'radio4', name: '第四台' },
  { id: 'radio5', name: '第五台' },
  { id: 'pth', name: '普通話台' },
];

export default function TestEpisodeApi() {
  const [selectedChannel, setSelectedChannel] = useState<string>('radio1');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedProgram(null);
    setEpisodes([]);
    setLoading(true);

    const data = await fetchAllProgramsFromArchive(channelId);
    setPrograms(data);
    setLoading(false);
  };

  const handleProgramSelect = async (program: Program) => {
    setSelectedProgram(program);
    setLoading(true);
    setEpisodes([]);

    const data = await fetchEpisodesFromRTHK(program.channelId, program.id);
    setEpisodes(data);
    setLoading(false);
  };

  const getChannelName = (id: string) => channels.find(c => c.id === id)?.name || id;

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-2xl font-bold mb-6'>重温时间列表测试</h1>

        <div className='bg-white rounded-lg shadow p-6 mb-6'>
          <h2 className='text-lg font-semibold mb-4'>1. 选择电台</h2>
          <div className='flex gap-2 flex-wrap'>
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => handleChannelSelect(channel.id)}
                className={`px-4 py-2 rounded-lg ${
                  selectedChannel === channel.id
                    ? 'bg-rthk-red text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {channel.name}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className='flex flex-col items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-rthk-red'></div>
            <p className='mt-4 text-gray-500'>加载中...</p>
          </div>
        )}

        {!loading && programs.length > 0 && !selectedProgram && (
          <div className='bg-white rounded-lg shadow p-6'>
            <h2 className='text-lg font-semibold mb-4'>2. 选择节目 (共 {programs.length} 个)</h2>
            <div className='space-y-2 max-h-96 overflow-y-auto'>
              {programs.map(program => (
                <div
                  key={program.id}
                  onClick={() => handleProgramSelect(program)}
                  className='border-b py-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center'
                >
                  <div>
                    <div className='font-medium'>{program.title}</div>
                    <div className='text-sm text-gray-500'>ID: {program.id}</div>
                  </div>
                  <span className='text-gray-400'>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProgram && !loading && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center gap-4 mb-4'>
              <button
                onClick={() => setSelectedProgram(null)}
                className='text-gray-500 hover:text-gray-700'
              >
                ← 返回
              </button>
              <h2 className='text-lg font-semibold'>{selectedProgram.title}</h2>
              <span className='text-sm text-gray-500'>
                ({getChannelName(selectedProgram.channelId)})
              </span>
            </div>

            <h3 className='font-semibold mb-2'>重温时间列表 (共 {episodes.length} 个)</h3>

            {episodes.length === 0 && (
              <div className='text-yellow-600 p-4 bg-yellow-50 rounded'>
                未找到重温，请查看Console调试信息
              </div>
            )}

            {episodes.length > 0 && (
              <div className='space-y-2 max-h-96 overflow-y-auto'>
                {episodes.map(ep => (
                  <div key={ep.id} className='border p-3 rounded flex justify-between items-center'>
                    <div>
                      <div className='font-medium'>{ep.publishDate}</div>
                      <div className='text-sm text-gray-500'>{ep.title}</div>
                    </div>
                    <div className='text-sm text-blue-600'>
                      {ep.audioUrl ? '✅ 可播放' : '❌ 无音频'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {episodes.length > 0 && (
              <div className='mt-4 p-4 bg-gray-100 rounded'>
                <h4 className='font-semibold mb-2'>第一个音频URL:</h4>
                <code className='text-sm break-all'>{episodes[0]?.audioUrl}</code>
              </div>
            )}
          </div>
        )}

        {!loading && programs.length === 0 && selectedChannel && (
          <div className='bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded'>
            <p>未找到节目，请查看Console调试信息</p>
          </div>
        )}
      </div>
    </div>
  );
}
