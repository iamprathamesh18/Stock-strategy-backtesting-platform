import React, { useState, useEffect } from 'react';
import { admin, stocks } from '../utils/api';

export default function AdminPage() {
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('overview');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState('');

  useEffect(() => {
    admin.stats().then(r => setStats(r.data));
    admin.logs().then(r => setLogs(r.data));
    admin.users().then(r => setUsers(r.data));
  }, []);

  const handleIngest = async () => {
    setIngesting(true); setIngestMsg('');
    try {
      const res = await stocks.triggerIngest();
      setIngestMsg(res.data.message);
      admin.logs().then(r => setLogs(r.data));
    } catch (err) { setIngestMsg(err.response?.data?.error || 'Failed'); }
    finally { setIngesting(false); }
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', borderColor: tab === id ? 'var(--accent)' : 'var(--border)', background: tab === id ? 'var(--accent-dim)' : 'transparent', color: tab === id ? 'var(--accent)' : 'var(--text-secondary)' }}>{label}</button>
  );

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>⊕ Admin Panel</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>System management and monitoring</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <TabBtn id="overview" label="Overview" />
        <TabBtn id="users" label="Users" />
        <TabBtn id="logs" label="System Logs" />
        <TabBtn id="data" label="Data Ingestion" />
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'Total Users', value: stats.userCount, color: 'var(--accent)' },
            { label: 'Tracked Tickers', value: stats.stockCount, color: 'var(--yellow)' },
            { label: 'Stock Records', value: stats.recordCount?.toLocaleString(), color: 'var(--green)' },
            { label: 'Backtests Run', value: stats.backtestCount, color: '#60a5fa' },
            { label: 'Strategies', value: stats.strategyCount, color: '#a78bfa' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{m.label}</div>
              <div className="font-mono" style={{ fontSize: '32px', fontWeight: '700', color: m.color }}>{m.value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Registered Users ({users.length})</h3>
          </div>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="font-mono" style={{ fontSize: '12px' }}>#{u.id}</td>
                  <td style={{ fontWeight: '500' }}>{u.username}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>{u.role}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>System Logs</h3>
            <button className="btn-secondary" onClick={() => admin.logs().then(r => setLogs(r.data))} style={{ padding: '6px 14px', fontSize: '12px' }}>Refresh</button>
          </div>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {logs.length === 0 ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No logs yet</div> : (
              <table className="data-table">
                <thead><tr><th>Level</th><th>Message</th><th>Timestamp</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><span className={`badge ${log.level === 'error' ? 'badge-red' : log.level === 'warn' ? 'badge-yellow' : 'badge-green'}`}>{log.level}</span></td>
                      <td style={{ fontSize: '13px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                      <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600' }}>Data Ingestion</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Historical stock data is fetched using the Python ingestion script. Run it via Docker or manually.
          </p>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>MANUAL EXECUTION</div>
            <div className="font-mono" style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: '1.8' }}>
              $ cd data_ingestion/<br/>
              $ pip install -r requirements.txt<br/>
              $ python fetch_stock_data.py<br/>
              <br/>
              # Custom tickers:<br/>
              $ python fetch_stock_data.py --tickers AAPL MSFT GOOGL<br/>
              <br/>
              # With Docker:<br/>
              $ docker-compose up ingestion
            </div>
          </div>

          {ingestMsg && (
            <div style={{ padding: '12px', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent)', marginBottom: '16px' }}>
              {ingestMsg}
            </div>
          )}

          <button className="btn-primary" onClick={handleIngest} disabled={ingesting}>
            {ingesting ? 'Processing...' : '⊕ Log Ingestion Trigger'}
          </button>
        </div>
      )}
    </div>
  );
}
