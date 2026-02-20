import { useState } from 'react';
import { fetchAllProgramsFromArchive, type Program } from '../services/rthkApi';

const channels = [
  { id: 'radio1', name: '第一台' },
  { id: 'radio2', name: '第二台' },
  { id: 'radio3', name: '第三台' },
  { id: 'radio4', name: '第四台' },
  { id: 'radio5', name: '第五台' },
  { id: 'pth', name: '普通話台' },
];

export default function TestArchiveApi() {
  const [selectedChannel, setSelectedChannel] = useState<string>('radio1');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannel(channelId);
    setLoading(true);
    setPrograms([]);

    const data = await fetchAllProgramsFromArchive(channelId);
    setPrograms(data);
    setLoading(false);
  };

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-2xl font-bold mb-6'>重温API测试页面</h1>

        <div className='bg-white rounded-lg shadow p-6 mb-6'>
          <h2 className='text-lg font-semibold mb-4'>选择电台</h2>

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
            <p className='mt-4 text-gray-500'>正在获取重温列表...</p>
          </div>
        )}

        {!loading && programs.length > 0 && (
          <div className='bg-white rounded-lg shadow p-6'>
            <h2 className='text-lg font-semibold mb-4'>
              {channels.find(c => c.id === selectedChannel)?.name} - 共 {programs.length} 个节目
            </h2>

            <div className='space-y-2'>
              {programs.map((program, index) => (
                <div key={program.id} className='border-b py-2'>
                  <div className='font-medium'>
                    {index + 1}. {program.title}
                    {program.isPopular && <span className='text-orange-500 ml-2'>[热门]</span>}
                  </div>
                  <div className='text-sm text-gray-500'>ID: {program.id}</div>
                  <div className='text-sm text-gray-500'>URL: {program.archiveUrl}</div>
                </div>
              ))}
            </div>

            <div className='mt-4 p-4 bg-gray-100 rounded'>
              <h3 className='font-semibold mb-2'>JSON输出 (Console)</h3>
              <p className='text-sm text-gray-500'>请打开浏览器开发者工具查看完整JSON</p>
            </div>
          </div>
        )}

        {!loading && programs.length === 0 && selectedChannel && (
          <div className='bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded'>
            <p>未找到节目，请查看Console输出调试信息</p>
          </div>
        )}
      </div>
    </div>
  );
}
