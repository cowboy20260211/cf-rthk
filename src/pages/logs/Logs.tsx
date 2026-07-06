import { useState, useEffect } from 'react';
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
}

interface DateCount {
  date: string;
  count: number;
}

const Logs = () => {
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

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h1>📊 访问日志</h1>
        <p className="logs-subtitle">记录最近30天的访问数据</p>
      </div>

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
                    <th>指纹</th>
                    <th>页面</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i}>
                      <td className="cell-time">{formatDate(log.timestamp)}</td>
                      <td className="cell-ip">{log.ip}</td>
                      <td>{log.country} {log.city}</td>
                      <td>{log.device}</td>
                      <td>{log.os}</td>
                      <td>{log.browser}</td>
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
