import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserInfo {
  type: string;
  typeLabel: string;
  socialUid: string;
  nickname: string;
  faceimg: string;
  gender: string;
  location: string;
  loginAt: string;
}

export const LOGIN_METHODS = [
  { type: 'qq', label: 'QQ', color: '#12B7F5', icon: '🐧' },
  { type: 'wx', label: '微信', color: '#07C160', icon: '💬' },
  { type: 'alipay', label: '支付宝', color: '#1677FF', icon: '💰' },
  { type: 'sina', label: '微博', color: '#E6162D', icon: '🌐' },
  { type: 'baidu', label: '百度', color: '#2932E1', icon: '🔍' },
  { type: 'douyin', label: '抖音', color: '#000', icon: '🎵' },
  { type: 'bilibili', label: '哔哩哔哩', color: '#FB7299', icon: '📺' },
  { type: 'dingtalk', label: '钉钉', color: '#1677FF', icon: '📌' },
  { type: 'huawei', label: '华为', color: '#CF0A2C', icon: '📱' },
  { type: 'xiaomi', label: '小米', color: '#FF6900', icon: '⭕' },
];

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (type: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/user', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = (type: string) => {
    // 跳转到服务器端 /api/auth/login?type=xxx
    // 服务器返回JSON包含跳转URL，客户端手动跳转
    (async () => {
      try {
        const res = await fetch(`/api/auth/login?type=${type}`);
        const data = await res.json();
        if (data.ok && data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || '登录服务未配置');
        }
      } catch (e: any) {
        alert('登录失败: ' + (e.message || ''));
      }
    })();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
