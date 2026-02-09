import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/live', label: '直播', icon: '📻' },
    { path: '/programs', label: '节目', icon: '📋' },
    { path: '/favorites', label: '收藏', icon: '⭐' },
    { path: '/profile', label: '我的', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-rthk-red text-white py-3 px-4 sticky top-0 z-40">
        <h1 className="text-lg font-bold">香港电台CF版</h1>
      </header>

      <main className="pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col items-center px-3 py-1 rounded-lg transition-colors',
                location.pathname === item.path
                  ? 'text-rthk-red'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
