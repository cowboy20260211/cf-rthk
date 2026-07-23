import { useState, useEffect } from 'react';
import { useAuth, LOGIN_METHODS } from '../../stores/AuthContext';
import './Logs.css';

interface LogEntry {
  timestamp: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  asn: string;
  ua: string;
  browser: string;
  os: string;
  device: string;
  fingerprint: string;
  screen: string;
  lang: string;
  path: string;
  referrer: string;
  loginMethod?: string;
  loginMethodLabel?: string;
  socialUid?: string;
  nickname?: string;
  loginEvent?: boolean;
}

interface DateCount {
  date: string;
  count: number;
}

const Logs = () => {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [dates, setDates] = useState<DateCount[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    fetchDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setPage(0);
      fetchLogs(selectedDate, 0);
    }
  }, [selectedDate]);

  // 检查登录回调（URL中带 ?login=success&type=qq&nickname=xxx）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      // 清理URL参数
      window.history.replaceState({}, '', '/logs');
      setTimeout(() => window.location.reload(), 500);
    }
    if (params.get('error')) {
      const err = params.get('error');
      window.history.replaceState({}, '', '/logs');
      alert('登录失败: ' + err);
    }
  }, []);

  const fetchDates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.ok) {
        setDates(data.dates || []);
      }
    } catch (e) {}
    setLoading(false);
  };

  const fetchLogs = async (date: string, offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?date=${date}&offset=${offset}&limit=${pageSize}`);
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {}
    setLoading(false);
  };

  const formatDate = (ts: string) => {
    return ts.slice(0, 19).replace('T', ' ');
  };

  const uniqueIPs = new Set(logs.map(l => l.ip)).size;
  const loggedVisits = logs.filter(l => l.loginMethod).length;

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h1>📊 访问日志</h1>
        <p className="logs-subtitle">记录最近30天的访问数据 · 登录后查看完整信息</p>
      </div>

      {/* 彩虹聚合登录区 */}
      <section className="auth-section">
        {authLoading ? (
          <div className="auth-loading">加载中...</div>
        ) : user ? (
          <div className="user-card">
            <div className="user-avatar-wrap">
              {user.faceimg ? (
                <img src={user.faceimg} alt={user.nickname} className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">
                  {user.nickname.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="user-info">
              <div className="user-name-row">
                <strong className="user-name">{user.nickname}</strong>
                <span
                  className="user-badge"
                  style={{ background: (LOGIN_METHODS.find(m => m.type === user.type) || {}).color || '#666' }}
                >
                  {user.typeLabel}
                </span>
              </div>
              <div className="user-meta">
                {user.location && <span>📍 {user.location} · </span>}
                {user.gender && <span>{user.gender} · </span>}
                <span>登录于 {formatDate(user.loginAt)}</span>
              </div>
              <code className="user-uid">social_uid: {user.socialUid.slice(0, 20)}...</code>
            </div>
            <button className="logout-btn" onClick={logout}>退出</button>
          </div>
        ) : (
          <div className="login-panel">
            <h3 className="login-title">🌈 彩虹聚合登录</h3>
            <p className="login-hint">登录后可记录访问身份信息</p>
            <div className="login-buttons">
              {LOGIN_METHODS.map(m => (
                <button
                  key={m.type}
                  className="login-btn"
                  style={{ borderColor: m.color, color: m.color }}
                  onClick={() => login(m.type)}
                  title={`使用${m.label}登录`}
                >
                  <span className="login-icon">{m.icon}</span>
                  <span className="login-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="logs-stats">
        <div className="stat-card">
          <span className="stat-value">{dates.reduce((s, d) => s + d.count, 0)}</span>
          <span className="stat-label">总访问量</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{uniqueIPs || '-'}</span>
          <span className="stat-label">独立IP数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dates.length}</span>
          <span className="stat-label">活跃天数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{loggedVisits || '-'}</span>
          <span className="stat-label">已登录访问</span>
        </div>
      </div>

      <div className="logs-date-list">
        <div className="date-header">
          <h3>按日期查看</h3>
          {selectedDate && (
            <button className="clear-btn" onClick={() => { setSelectedDate(''); setLogs([]); setTotal(0); }}>
              返回日期列表
            </button>
          )}
        </div>
        {!selectedDate ? (
          <div className="date-grid">
            {dates.map(d => (
              <button
                key={d.date}
                className="date-btn"
                onClick={() => setSelectedDate(d.date)}
              >
                <span className="date-text">{d.date}</span>
                <span className="date-count">{d.count} 次</span>
              </button>
            ))}
            {dates.length === 0 && !loading && (
              <div className="no-data">暂无访问记录</div>
            )}
          </div>
        ) : (
          <>
            <div className="logs-table-header">
              <span className="logs-info">
                <strong>{selectedDate}</strong> — 共 {total} 条记录
                {total > pageSize && ` (第 ${page + 1}/${Math.ceil(total / pageSize)} 页)`}
              </span>
            </div>

            <div className="logs-table-wrap">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>IP</th>
                    <th>地区</th>
                    <th>设备</th>
                    <th>系统</th>
                    <th>浏览器</th>
                    <th>登录方式</th>
                    <th>用户昵称</th>
                    <th>指纹</th>
                    <th>页面</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className={log.loginEvent ? 'row-login-event' : ''}>
                      <td className="cell-time">{formatDate(log.timestamp)}</td>
                      <td className="cell-ip">{log.ip}</td>
                      <td>{log.country} {log.city}</td>
                      <td>{log.device}</td>
                      <td>{log.os}</td>
                      <td>{log.browser}</td>
                      <td>
                        {log.loginMethod ? (
                          <span className="login-method-badge">{log.loginMethodLabel || log.loginMethod}</span>
                        ) : (
                          <span className="cell-empty">-</span>
                        )}
                      </td>
                      <td className={log.nickname ? 'cell-nick' : 'cell-empty'}>
                        {log.nickname || '-'}
                      </td>
                      <td className="cell-fp" title={log.fingerprint}>{log.fingerprint}</td>
                      <td className="cell-path">{log.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="logs-pagination">
                <button
                  className="page-btn"
                  disabled={page === 0}
                  onClick={() => { setPage(p => p - 1); fetchLogs(selectedDate, (page - 1) * pageSize); }}
                >
                  上一页
                </button>
                <span className="page-info">{page + 1} / {Math.ceil(total / pageSize)}</span>
                <button
                  className="page-btn"
                  disabled={(page + 1) * pageSize >= total}
                  onClick={() => { setPage(p => p + 1); fetchLogs(selectedDate, (page + 1) * pageSize); }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Logs;
