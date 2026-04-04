import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/backtest/history').then(r => setHistory(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: '2rem', color: 'var(--text-muted)' }} className="pulse">Loading history...</div>
  );

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>Backtest History</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>All your previous backtests</p>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No backtests yet. Run your first backtest to see results here.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                {['#', 'Ticker', 'Strategy', 'Period', 'Profit', 'Win Rate', 'Drawdown', 'Sharpe', 'Trades', 'Date'].map(h => (
                  <th key={h} style={{ padding: '0.8rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{h.ticker}</td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{h.strategy_name || h.strategy_type || 'Custom'}</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {h.start_date} → {h.end_date}
                  </td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: h.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {h.profit >= 0 ? '+' : ''}{h.profit?.toFixed(2)}%
                  </td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)' }}>{h.win_rate?.toFixed(1)}%</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{h.max_drawdown?.toFixed(2)}%</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', color: h.sharpe_ratio > 1 ? 'var(--green)' : 'var(--text-muted)' }}>{h.sharpe_ratio?.toFixed(3)}</td>
                  <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)' }}>{h.num_trades}</td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(h.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
