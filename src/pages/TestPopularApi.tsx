import { useState, useEffect } from 'react';
import { fetchPopularPrograms, type Program } from '../services/rthkApi';

const channels = [
  { id: 'radio1', name: '第一台' },
  { id: 'radio2', name: '第二台' },
  { id: 'radio5', name: '第五台' },
];

interface ProgramJson {
  节目名称: string;
  链接: string;
}

export default function TestPopularApi() {
  const [loading, setLoading] = useState(false);
  const [popularPrograms, setPopularPrograms] = useState<Program[]>([]);
  const [jsonOutput, setJsonOutput] = useState<ProgramJson[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testPopularApi = async () => {
    setLoading(true);
    setError(null);
    setPopularPrograms([]);
    setJsonOutput([]);

    try {
      const programs = await fetchPopularPrograms();

      const allProgramsJson: ProgramJson[] = programs.map(program => ({
        节目名称: program.title,
        链接: program.archiveUrl || '',
      }));

      setPopularPrograms(programs);
      setJsonOutput(allProgramsJson);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testPopularApi();
  }, []);

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-2xl font-bold mb-6'>热门节目API测试页面</h1>

        <div className='bg-white rounded-lg shadow p-6 mb-6'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-lg font-semibold'>热门节目测试</h2>
            <button
              onClick={testPopularApi}
              disabled={loading}
              className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
            >
              {loading ? '测试中...' : '重新测试'}
            </button>
          </div>

          <div className='flex gap-4'>
            {loading
              ? channels.map(channel => (
                  <div key={channel.id} className='flex items-center gap-2'>
                    <span className='w-3 h-3 rounded-full bg-yellow-400 animate-pulse'></span>
                    <span className='text-gray-700'>{channel.name}</span>
                  </div>
                ))
              : channels.map(channel => {
                  const channelPrograms = popularPrograms.filter(p => p.channelId === channel.id);
                  return (
                    <div key={channel.id} className='flex items-center gap-2'>
                      <span className='w-3 h-3 rounded-full bg-green-500'></span>
                      <span className='text-gray-700'>
                        {channel.name}: {channelPrograms.length}个
                      </span>
                    </div>
                  );
                })}
          </div>
        </div>

        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6'>
            <p className='font-bold'>错误</p>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className='flex flex-col items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-rthk-red'></div>
            <p className='mt-4 text-gray-500'>正在获取热门节目...</p>
          </div>
        )}

        {!loading && popularPrograms.length > 0 && (
          <div className='bg-white rounded-lg shadow overflow-hidden'>
            <div className='bg-orange-100 px-6 py-3 border-b flex justify-between items-center'>
              <h2 className='font-semibold text-lg'>热门节目列表 ({popularPrograms.length} 个)</h2>
              <span className='text-sm text-gray-600'>来源: RTHK官网热门节目</span>
            </div>

            <div className='divide-y max-h-96 overflow-y-auto'>
              {popularPrograms.map((program, index) => (
                <div key={program.id} className='p-4 hover:bg-gray-50'>
                  <div className='flex items-start gap-4'>
                    <span className='text-2xl font-bold text-orange-400 w-8'>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-bold text-lg'>{program.title}</h3>
                      <a
                        href={program.archiveUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline text-sm mt-2 block truncate'
                      >
                        {program.archiveUrl}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && jsonOutput.length > 0 && (
          <div className='bg-white rounded-lg shadow overflow-hidden mt-8'>
            <div className='bg-purple-100 px-6 py-3 border-b'>
              <h2 className='font-semibold text-lg'>JSON数组输出 ({jsonOutput.length} 条记录)</h2>
            </div>
            <div className='p-4'>
              <pre className='bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs'>
                {JSON.stringify(jsonOutput, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className='mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
          <h3 className='font-bold text-yellow-800 mb-2'>📋 使用说明</h3>
          <ul className='text-sm text-yellow-700 space-y-1'>
            <li>• 打开浏览器开发者工具 (F12)</li>
            <li>• 切换到 Console (控制台) 标签</li>
            <li>• 点击"重新测试"按钮</li>
            <li>• 查看控制台输出的热门节目名称和URL</li>
            <li>• 页面会显示热门节目列表和JSON数组</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
