import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTicker, setNewTicker] = useState({ symbol: '', name: '' });
  const [tickers, setTickers] = useState([]);
  const [msg, setMsg] = useState('');
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/admin/logs').then(r => setLogs(r.data)).catch(() => {});
    api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
    api.get('/stocks/tickers').then(r => setTickers(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const addTicker = async () => {
    if (!newTicker.symbol) return;
    try {
      await api.post('/stocks/tickers', newTicker);
      setMsg('Ticker added');
      setNewTicker({ symbol: '', name: '' });
      load();
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  const removeTicker = async (symbol) => {
    await api.delete(`/stocks/tickers/${symbol}`);
    load();
  };

  const seedDemo = async () => {
    setSeeding(true); setMsg('');
    try {
      const r = await api.post('/admin/seed-demo');
      setMsg(r.data.message);
      load();
    } catch (e) { setMsg(e.response?.data?.error || 'Seed failed'); }
    finally { setSeeding(false); }
  };

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>Admin Panel</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>System management and monitoring</p>

      {msg && <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--accent)' }}>{msg}</div>}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="card" style={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{v?.toLocaleString()}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'capitalize', marginTop: '0.2rem' }}>{k}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Ticker management */}
        <div className="card">
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Ticker Management</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input value={newTicker.symbol} onChange={e => setNewTicker({...newTicker, symbol: e.target.value.toUpperCase()})} placeholder="TICKER" style={{ flex: 1 }} />
            <input value={newTicker.name} onChange={e => setNewTicker({...newTicker, name: e.target.value})} placeholder="Company Name" style={{ flex: 2 }} />
            <button className="btn-primary" onClick={addTicker} style={{ whiteSpace: 'nowrap' }}>Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 250, overflowY: 'auto' }}>
            {tickers.map(t => (
              <div key={t.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.7rem', background: 'var(--bg)', borderRadius: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent)' }}>{t.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', flex: 1, marginLeft: '0.5rem' }}>{t.name}</span>
                <button onClick={() => removeTicker(t.symbol)} className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Data actions */}
        <div className="card">
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Data Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>Seed Demo Data</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.7rem' }}>
                Seed synthetic OHLCV data for AAPL, GOOGL, MSFT (2020–present) for testing.
              </div>
              <button className="btn-secondary" onClick={seedDemo} disabled={seeding}>
                {seeding ? <span className="pulse">Seeding...</span> : '⚡ Seed Demo Data'}
              </button>
            </div>
            <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>Real Data Ingestion</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Run the Python script to fetch real data from Yahoo Finance:
              </div>
              <code style={{ display: 'block', marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent)', background: 'var(--surface2)', padding: '0.4rem 0.6rem', borderRadius: 4 }}>
                cd data_ingestion && python fetch_stock_data.py
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Users</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', 'Username', 'Email', 'Role', 'Created'].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.5rem 0.8rem', color: 'var(--text-muted)' }}>{u.id}</td>
                <td style={{ padding: '0.5rem 0.8rem', fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: '0.5rem 0.8rem', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '0.5rem 0.8rem' }}>
                  <span className="tag" style={{ background: u.role === 'admin' ? 'rgba(124,58,237,0.2)' : 'rgba(0,229,255,0.1)', color: u.role === 'admin' ? 'var(--accent2)' : 'var(--accent)' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '0.5rem 0.8rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Logs */}
      <div className="card">
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>System Logs</h2>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {logs.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No logs yet.</div>}
          {logs.map(l => (
            <div key={l.id} style={{ padding: '0.3rem 0.6rem', background: 'var(--bg)', borderRadius: 4, borderLeft: `2px solid ${l.level === 'error' ? 'var(--red)' : l.level === 'warn' ? 'var(--yellow)' : 'var(--accent)'}` }}>
              <span style={{ color: 'var(--text-muted)' }}>{l.created_at?.split('T')[0]} </span>
              <span style={{ color: l.level === 'error' ? 'var(--red)' : l.level === 'warn' ? 'var(--yellow)' : 'var(--green)' }}>[{l.level}] </span>
              {l.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
