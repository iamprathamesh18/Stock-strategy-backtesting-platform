import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const StatCard = ({ label, value, sub, color }) => (
  <div className="card" style={{ flex: 1 }}>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>{label}</div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
    {sub && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [tickers, setTickers] = useState([]);

  useEffect(() => {
    api.get('/backtest/history').then(r => setHistory(r.data)).catch(() => {});
    api.get('/stocks/tickers').then(r => setTickers(r.data)).catch(() => {});
  }, []);

  const totalProfit = history.reduce((sum, h) => sum + (h.profit || 0), 0);
  const avgWinRate = history.length ? history.reduce((s, h) => s + (h.win_rate || 0), 0) / history.length : 0;

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.username}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Here's an overview of your backtesting activity.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <StatCard label="Total Backtests" value={history.length} sub="all time" color="var(--accent)" />
        <StatCard label="Avg Profit" value={`${totalProfit.toFixed(1)}%`} sub="across all runs"
          color={totalProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Avg Win Rate" value={`${avgWinRate.toFixed(1)}%`} sub="strategy accuracy" />
        <StatCard label="Tickers" value={tickers.length} sub="available in DB" color="var(--accent2)" />
      </div>

      {/* Recent backtests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recent Backtests</h2>
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
              onClick={() => navigate('/history')}>View All</button>
          </div>
          {history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              No backtests yet.<br/>
              <button className="btn-primary" style={{ marginTop: '0.8rem', padding: '0.5rem 1rem' }}
                onClick={() => navigate('/backtest')}>Run First Backtest</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.slice(0, 6).map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'var(--bg)', borderRadius: 8, cursor: 'pointer' }}
                  onClick={() => navigate('/history')}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>{h.ticker}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{h.strategy_name || h.strategy_type || 'Custom'}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: h.profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    {h.profit >= 0 ? '+' : ''}{h.profit?.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {[
              { label: '▶  Run a Backtest', to: '/backtest', color: 'var(--accent)' },
              { label: '◇  Build Custom Strategy', to: '/strategies', color: 'var(--accent2)' },
              { label: '◈  Browse Market Data', to: '/stocks', color: 'var(--yellow)' },
              { label: '◎  View History', to: '/history', color: 'var(--green)' },
            ].map(a => (
              <button key={a.to} onClick={() => navigate(a.to)} style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '0.8rem 1rem', textAlign: 'left', color: a.color, fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }} onMouseEnter={e => e.target.style.borderColor = a.color}
                onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
