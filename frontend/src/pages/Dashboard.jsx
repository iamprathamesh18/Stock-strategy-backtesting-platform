import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { backtest, stocks, strategy } from '../utils/api';

function MetricCard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div className="metric-card">
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div className="font-mono" style={{ fontSize: '28px', fontWeight: '700', color }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([backtest.history(), stocks.getTickers(), strategy.list()])
      .then(([h, t, s]) => {
        setHistory(h.data);
        setTickers(t.data);
        setStrategies(s.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalProfit = history.reduce((sum, h) => sum + (h.profit || 0), 0);
  const winningBacktests = history.filter(h => h.profit > 0).length;
  const tickersWithData = tickers.filter(t => t.hasData).length;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', margin: 0, marginBottom: '6px' }}>
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Here's your backtesting overview
        </p>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <MetricCard label="Total Backtests" value={history.length} sub="all time" />
        <MetricCard label="Total P&L" value={`₹${totalProfit >= 0 ? '+' : ''}${Math.round(totalProfit).toLocaleString()}`} sub="across all runs" color={totalProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        <MetricCard label="Win Rate" value={`${history.length > 0 ? Math.round((winningBacktests / history.length) * 100) : 0}%`} sub={`${winningBacktests} profitable`} color="var(--yellow)" />
        <MetricCard label="Active Tickers" value={tickersWithData} sub={`of ${tickers.length} tracked`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent backtests */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Recent Backtests</h3>
            <Link to="/history" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No backtests yet. <Link to="/backtest" style={{ color: 'var(--accent)' }}>Run one →</Link>
              </div>
            ) : (
              history.slice(0, 5).map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.ticker}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.strategy_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '13px', fontWeight: '700', color: item.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {item.profit >= 0 ? '+' : ''}{item.profit_pct?.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.num_trades} trades</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(0,212,170,0.03))', border: '1px solid rgba(0,212,170,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '600' }}>⚡ Run Backtest</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>Test your strategy on historical data</p>
                <Link to="/backtest"><button className="btn-primary">Start Testing</button></Link>
              </div>
              <div style={{ fontSize: '48px', opacity: 0.3 }}>⚡</div>
            </div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '600' }}>⊞ My Strategies</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{strategies.length} strategies saved</p>
                <Link to="/strategies"><button className="btn-secondary">Manage Strategies</button></Link>
              </div>
              <div style={{ fontSize: '48px', opacity: 0.3 }}>⊞</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
