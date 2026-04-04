import React, { useState, useEffect } from 'react';
import { backtest } from '../utils/api';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backtest.history().then(r => setHistory(r.data)).finally(() => setLoading(false));
  }, []);

  const totalProfit = history.reduce((sum, h) => sum + (h.profit || 0), 0);
  const avgSharpe = history.length > 0 ? history.reduce((s, h) => s + (h.sharpe_ratio || 0), 0) / history.length : 0;
  const bestTrade = history.length > 0 ? Math.max(...history.map(h => h.profit_pct || 0)) : 0;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>⊟ Backtest History</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>All your past backtesting results</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div className="metric-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '6px' }}>TOTAL RUNS</div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '700' }}>{history.length}</div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '6px' }}>CUMULATIVE P&L</div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '700', color: totalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalProfit >= 0 ? '+' : ''}₹{Math.abs(Math.round(totalProfit)).toLocaleString()}
          </div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '6px' }}>AVG SHARPE</div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '700', color: avgSharpe >= 1 ? 'var(--green)' : avgSharpe >= 0 ? 'var(--yellow)' : 'var(--red)' }}>
            {avgSharpe.toFixed(2)}
          </div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '6px' }}>BEST RETURN</div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '700', color: 'var(--green)' }}>+{bestTrade.toFixed(1)}%</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>All Backtests</h3>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No backtest history yet.</div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Strategy</th><th>Ticker</th><th>Period</th><th>P&L %</th><th>Max DD</th><th>Sharpe</th><th>Win Rate</th><th>Trades</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '500', fontSize: '13px' }}>{item.strategy_name}</td>
                    <td><span className="badge badge-blue font-mono">{item.ticker}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Space Mono' }}>{item.start_date} → {item.end_date}</td>
                    <td>
                      <span className={`badge font-mono ${item.profit_pct >= 0 ? 'badge-green' : 'badge-red'}`}>
                        {item.profit_pct >= 0 ? '+' : ''}{item.profit_pct?.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: '12px', color: 'var(--red)' }}>{item.max_drawdown?.toFixed(2)}%</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: '12px', color: item.sharpe_ratio >= 1 ? 'var(--green)' : item.sharpe_ratio >= 0 ? 'var(--yellow)' : 'var(--red)' }}>
                      {item.sharpe_ratio?.toFixed(3)}
                    </td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: '12px' }}>{item.win_rate?.toFixed(1)}%</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: '12px' }}>{item.num_trades}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
