import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { rthkApi, type Program } from '../../services/rthkApi';
import { useFavorite } from '../../stores/FavoriteContext';

const channels = [
  { id: 'radio1', name: '第一台' },
  { id: 'radio2', name: '第二台' },
  { id: 'radio5', name: '第五台' },
];

const PAGE_SIZE = 20;

export default function Programs() {
  const [selectedChannel, setSelectedChannel] = useState<string>('radio2');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'popular' | 'all'>('popular');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { favorites, addFavorite, removeFavorite } = useFavorite();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load programs based on view mode
  useEffect(() => {
    setLoading(true);
    setPage(1);

    if (viewMode === 'popular') {
      const allPrograms = rthkApi.getProgramsByChannel(selectedChannel);
      const popular = allPrograms.slice(0, 4);
      setPrograms(popular);
      setHasMore(false);
    } else {
      // Load all programs paged
      rthkApi.getAllProgramsPaged(selectedChannel, 1, PAGE_SIZE).then(result => {
        setPrograms(result.programs);
        setHasMore(result.hasMore);
        setLoading(false);
      });
    }
  }, [selectedChannel, viewMode]);

  // Load more when scrolling
  useEffect(() => {
    if (viewMode !== 'all' || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [viewMode, hasMore, loading, page]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const result = await rthkApi.getAllProgramsPaged(selectedChannel, nextPage, PAGE_SIZE);
    setPrograms(prev => [...prev, ...result.programs]);
    setPage(nextPage);
    setHasMore(result.hasMore);
    setLoading(false);
  };

  const allPrograms = rthkApi.getProgramsByChannel(selectedChannel);
  const popularPrograms = allPrograms.slice(0, 4);
  const displayedPrograms = viewMode === 'popular' ? popularPrograms : programs;

  const filteredPrograms = displayedPrograms.filter(
    (p: Program) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChannelColor = (channelId: string): string => {
    const colors: Record<string, string> = {
      radio1: 'bg-red-600',
      radio2: 'bg-blue-600',
      radio5: 'bg-green-600',
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
        {/* 频道选择 */}
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
        <div className='flex gap-1 ml-auto flex-shrink-0'>
          <button
            onClick={() => setViewMode('popular')}
            className={`px-3 py-2 rounded-full whitespace-nowrap transition-colors text-sm ${
              viewMode === 'popular'
                ? 'bg-rthk-red text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            热门
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-2 rounded-full whitespace-nowrap transition-colors text-sm ${
              viewMode === 'all'
                ? 'bg-rthk-red text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全部
          </button>
        </div>
      </div>

      <input
        type='search'
        placeholder='搜索節目...'
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className='w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-rthk-red'
      />

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
                      : '5'}
                </span>
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='font-bold truncate'>{program.title}</h3>
                <p className='text-sm text-gray-500 mt-1'>{program.description}</p>
                <p className='text-xs text-gray-400 mt-1'>
                  {channels.find(c => c.id === program.channelId)?.name} | {program.schedule}
                </p>
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
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
            </svg>
          </div>
        ))}

        {/* Load more trigger */}
        {viewMode === 'all' && hasMore && (
          <div ref={loadMoreRef} className='text-center py-4'>
            {loading ? (
              <span className='text-gray-500'>載入中...</span>
            ) : (
              <span className='text-gray-400'>向下滾動載入更多</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
