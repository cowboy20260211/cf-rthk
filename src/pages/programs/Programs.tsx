import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { rthkApi, fetchAllProgramsFromArchive, type Program } from '../../services/rthkApi';
import { useFavorite } from '../../stores/FavoriteContext';

const channels = [
  { id: 'radio1', name: '第一台' },
  { id: 'radio2', name: '第二台' },
  { id: 'radio3', name: '第三台' },
  { id: 'radio4', name: '第四台' },
  { id: 'radio5', name: '第五台' },
  { id: 'pth', name: '普通話台' },
];

const PAGE_SIZE = 20;

export default function Programs() {
  const [selectedChannel, setSelectedChannel] = useState<string>('radio2');
  const [searchQuery, setSearchQuery] = useState('');
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { favorites, addFavorite, removeFavorite } = useFavorite();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setAllPrograms([]);
    setPage(1);

    fetchAllProgramsFromArchive(selectedChannel)
      .then(scrapedPrograms => {
        setAllPrograms(scrapedPrograms);
        setHasMore(scrapedPrograms.length > PAGE_SIZE);
      })
      .catch(() => {
        rthkApi.getAllProgramsPaged(selectedChannel, 1, 100).then(result => {
          setAllPrograms(result.programs);
          setHasMore(result.hasMore);
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedChannel]);

  const displayedPrograms = useMemo(() => {
    return allPrograms.slice(0, page * PAGE_SIZE);
  }, [allPrograms, page]);

  const filteredPrograms = useMemo(() => {
    return displayedPrograms.filter(
      (p: Program) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [displayedPrograms, searchQuery]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    setHasMore(allPrograms.length > page * PAGE_SIZE);
  }, [page, allPrograms]);

  const getChannelColor = (channelId: string): string => {
    const colors: Record<string, string> = {
      radio1: 'bg-red-600',
      radio2: 'bg-blue-600',
      radio3: 'bg-purple-600',
      radio4: 'bg-yellow-600',
      radio5: 'bg-green-600',
      pth: 'bg-orange-600',
    };
    return colors[channelId] || 'bg-gray-600';
  };

  const isProgramFavorited = (programId: string) => {
    return favorites.some(f => f.programId === programId);
  };

  const toggleFavorite = (e: React.MouseEvent, program: Program) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProgramFavorited(program.id)) {
      const fav = favorites.find(f => f.programId === program.id);
      if (fav) {
        removeFavorite(fav.id);
      }
    } else {
      const channelName = channels.find(c => c.id === program.channelId)?.name || '第一台';
      addFavorite({
        episodeId: program.id,
        programId: program.id,
        title: program.title,
        channel: channelName,
      });
    }
  };

  return (
    <div className='p-4 pb-24'>
      <div className='flex items-center justify-between mb-4'>
        <Link to='/' className='text-gray-500'>
          ← 返回首頁
        </Link>
        <h1 className='text-2xl font-bold'>節目重溫</h1>
        <div className='w-16'></div>
      </div>

      <div className='flex gap-2 mb-4 overflow-x-auto pb-2 items-center'>
        {channels.map(channel => (
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
        type='search'
        placeholder='搜索節目...'
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className='w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-rthk-red'
      />

      {loading ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-rthk-red'></div>
          <p className='mt-4 text-gray-500'>正在获取重温列表...</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {filteredPrograms.map(program => (
            <div key={program.id} className='card flex gap-4 hover:bg-gray-50'>
              <Link
                to={`/programs/${program.channelId}/${program.id}`}
                className='flex gap-4 flex-1 min-w-0'
              >
                <div
                  className={`w-16 h-16 ${getChannelColor(program.channelId)} rounded-lg flex-shrink-0 flex items-center justify-center`}
                >
                  <span className='text-white text-xl font-bold'>
                    {program.channelId === 'radio1'
                      ? '1'
                      : program.channelId === 'radio2'
                        ? '2'
                        : program.channelId === 'radio3'
                          ? '3'
                          : program.channelId === 'radio4'
                            ? '4'
                            : program.channelId === 'radio5'
                              ? '5'
                              : 'PT'}
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <h3 className='font-bold truncate'>{program.title}</h3>
                    {program.isPopular && (
                      <span className='bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0'>
                        热门
                      </span>
                    )}
                  </div>
                  {program.schedule && (
                    <p className='text-xs text-gray-400 mt-1'>
                      {channels.find(c => c.id === program.channelId)?.name} | {program.schedule}
                    </p>
                  )}
                  {!program.schedule && (
                    <p className='text-xs text-gray-400 mt-1'>
                      {channels.find(c => c.id === program.channelId)?.name}
                    </p>
                  )}
                  <p className='text-xs text-gray-400 mt-1'>{program.episodeCount || 30} 集</p>
                </div>
              </Link>
              <button
                onClick={e => toggleFavorite(e, program)}
                className='text-2xl flex-shrink-0 cursor-pointer'
              >
                {isProgramFavorited(program.id) ? '⭐' : '☆'}
              </button>
              <svg
                className='w-5 h-5 text-gray-400 flex-shrink-0 self-center'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </div>
          ))}
          <div ref={loadMoreRef} className='h-4' />
        </div>
      )}
    </div>
  );
}
