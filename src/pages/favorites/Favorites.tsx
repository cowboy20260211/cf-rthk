import { Link } from 'react-router-dom';
import { useFavorite } from '../../stores/FavoriteContext';

export default function Favorites() {
  const { favorites, removeFavorite } = useFavorite();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getChannelId = (channelName: string): string => {
    const mapping: Record<string, string> = {
      '香港电台第一台': 'radio1',
      '香港电台第二台': 'radio2',
      '香港电台第三台': 'radio3',
      '香港电台第四台': 'radio4',
      '香港电台第五台': 'radio5',
      '香港电台普通话台': 'pth',
      '亚洲电台粤语台': 'asia',
      '第一台': 'radio1',
      '第二台': 'radio2',
      '第三台': 'radio3',
      '第四台': 'radio4',
      '第五台': 'radio5',
      '普通话台': 'pth',
      '普通話台': 'pth',
    };
    return mapping[channelName] || 'radio1';
  };

  return (
    <div className='p-4 pb-24'>
      {/* 返回按钮 */}
      <div className='mb-4'>
        <Link to='/' className='inline-flex items-center text-gray-600 hover:text-rthk-red'>
          <span style={{ fontSize: '18px', marginRight: '4px' }}>←</span>
          返回
        </Link>
      </div>

      <h1 className='text-2xl font-bold mb-6'>我的收藏</h1>
      {favorites.length === 0 ? (
        <div className='card text-center py-12'>
          <p className='text-gray-500'>还没有收藏节目</p>
          <Link
            to='/programs'
            className='inline-block mt-4 px-6 py-2 bg-rthk-red text-white rounded-full'
          >
            去节目页收藏
          </Link>
        </div>
      ) : (
        <div className='space-y-3'>
          {favorites.map(favorite => (
            <div key={favorite.id} className='card flex items-center gap-3'>
              <div className='w-12 h-12 rounded-full bg-rthk-red text-white flex items-center justify-center flex-shrink-0 text-lg'>
                ▶
              </div>
              <Link
                to={`/programs/${getChannelId(favorite.channel)}/${favorite.programId}`}
                className='flex-1 min-w-0'
              >
                <h3 className='font-bold truncate'>{favorite.title}</h3>
                <p className='text-sm text-gray-500'>{favorite.channel}</p>
                <p className='text-xs text-gray-400 mt-1'>收藏于 {formatDate(favorite.addedAt)}</p>
              </Link>
              <button
                onClick={() => removeFavorite(favorite.id)}
                className='p-2 text-gray-400 hover:text-red-500'
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
