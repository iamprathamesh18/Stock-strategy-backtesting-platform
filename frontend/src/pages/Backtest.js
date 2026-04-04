import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';

Chart.register(...registerables);

const BUILT_IN_STRATEGIES = [
  { value: 'moving_average_crossover', label: 'Moving Average Crossover' },
  { value: 'rsi',                      label: 'RSI Strategy' },
  { value: 'breakout',                 label: 'Breakout Strategy' },
];

const MetricBox = ({ label, value, color }) => (
  <div style={{ flex: 1, minWidth: 120, background: 'var(--bg)', borderRadius: 8, padding: '0.9rem 1rem', textAlign: 'center' }}>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{label}</div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: color || 'var(--text)' }}>{value ?? '—'}</div>
  </div>
);

export default function Backtest() {
  const [tickers, setTickers]     = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [tickersLoading, setTickersLoading] = useState(true);
  const [form, setForm] = useState({
    ticker: '', start_date: '2020-01-01', end_date: '2024-01-01',
    strategy_type: 'moving_average_crossover', strategy_id: '',
    useCustom: false,
    params: { shortPeriod: 50, longPeriod: 200, rsiPeriod: 14, oversold: 30, overbought: 70, lookback: 20 },
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const priceChartRef   = useRef(null);
  const equityChartRef  = useRef(null);
  const priceChartInst  = useRef(null);
  const equityChartInst = useRef(null);

  // Load tickers — backend returns { ticker, name, hasData, recordCount }
  useEffect(() => {
    setTickersLoading(true);
    api.get('/stocks/tickers')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setTickers(list);
        // Auto-select first ticker that has data
        const first = list.find(t => t.hasData) || list[0];
        if (first) setForm(f => ({ ...f, ticker: first.ticker }));
      })
      .catch(e => setError('Cannot reach backend: ' + e.message))
      .finally(() => setTickersLoading(false));

    api.get('/strategy/list')
      .then(r => setStrategies(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const runBacktest = async () => {
    if (!form.ticker) { setError('Select a ticker'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        ticker: form.ticker,
        start_date: form.start_date,
        end_date: form.end_date,
        initial_capital: 100000,
        params: form.params,
      };
      if (form.useCustom && form.strategy_id) {
        payload.strategy_id = parseInt(form.strategy_id);
      } else {
        payload.strategy_type = form.strategy_type;
      }
      const { data } = await api.post('/backtest/run', payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  // Charts — triggered when result changes
  useEffect(() => {
    if (!result) return;
    if (priceChartInst.current)  { priceChartInst.current.destroy();  priceChartInst.current  = null; }
    if (equityChartInst.current) { equityChartInst.current.destroy(); equityChartInst.current = null; }

    // Backend returns result.priceData (not stockData)
    const priceData = result.priceData || [];
    const labels    = priceData.map(d => d.date);
    const closes    = priceData.map(d => d.close);

    if (priceChartRef.current && priceData.length > 0) {
      priceChartInst.current = new Chart(priceChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Price', data: closes,
              borderColor: '#00e5ff', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.1,
            },
            {
              label: 'Buy',
              // signal === 1 means BUY
              data: priceData.map((d, i) => d.signal === 1 ? closes[i] : null),
              type: 'scatter', pointRadius: 7, pointBackgroundColor: '#00e676',
              pointStyle: 'triangle', showLine: false,
            },
            {
              label: 'Sell',
              // signal === -1 means SELL
              data: priceData.map((d, i) => d.signal === -1 ? closes[i] : null),
              type: 'scatter', pointRadius: 7, pointBackgroundColor: '#ff1744',
              pointStyle: 'triangle', rotation: 180, showLine: false,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { labels: { color: '#64748b', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: '#1f252e' } },
            y: { ticks: { color: '#64748b' }, grid: { color: '#1f252e' } },
          },
        },
      });
    }

    // Equity curve — backend returns result.equityCurve[].equity (not .value)
    const ec = result.equityCurve || [];
    if (equityChartRef.current && ec.length > 0) {
      equityChartInst.current = new Chart(equityChartRef.current, {
        type: 'line',
        data: {
          labels: ec.map(e => e.date),
          datasets: [{
            label: 'Portfolio Value',
            data: ec.map(e => e.equity),   // ← key fix: .equity not .value
            borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)',
            borderWidth: 2, pointRadius: 0, fill: true, tension: 0.1,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { labels: { color: '#64748b', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: '#1f252e' } },
            y: { ticks: { color: '#64748b', callback: v => `₹${(v / 1000).toFixed(0)}k` }, grid: { color: '#1f252e' } },
          },
        },
      });
    }

    return () => {
      if (priceChartInst.current)  { priceChartInst.current.destroy();  priceChartInst.current  = null; }
      if (equityChartInst.current) { equityChartInst.current.destroy(); equityChartInst.current = null; }
    };
  }, [result]);

  const m = result?.metrics;

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>Run Backtest</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Test trading strategies against historical data</p>

      {/* Config panel */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

          {/* Ticker dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticker</label>
            {tickersLoading ? (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
            ) : (
              <select
                value={form.ticker}
                onChange={e => setForm({ ...form, ticker: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
              >
                {tickers.length === 0 && <option value="">No tickers — run ingestion script</option>}
                {tickers.map(t => (
                  <option key={t.ticker} value={t.ticker}>
                    {t.ticker}{t.hasData ? ` (${t.recordCount?.toLocaleString()})` : ' — no data'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Start date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
          </div>

          {/* End date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
            <input type="date" value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
          </div>

          {/* Strategy source */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strategy Source</label>
            <select value={form.useCustom ? 'custom' : 'builtin'}
              onChange={e => setForm({ ...form, useCustom: e.target.value === 'custom' })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }}>
              <option value="builtin">Built-in</option>
              <option value="custom">My Strategies</option>
            </select>
          </div>

          {/* Strategy selector */}
          {!form.useCustom ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strategy</label>
              <select value={form.strategy_type}
                onChange={e => setForm({ ...form, strategy_type: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }}>
                {BUILT_IN_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Strategy</label>
              <select value={form.strategy_id}
                onChange={e => setForm({ ...form, strategy_id: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }}>
                <option value="">Select...</option>
                {strategies.map(s => <option key={s.id} value={s.id}>{s.strategy_name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Strategy params */}
        {!form.useCustom && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.8rem', background: 'var(--bg)', borderRadius: 8 }}>
            {form.strategy_type === 'moving_average_crossover' && (<>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Short Period</label>
                <input type="number" value={form.params.shortPeriod}
                  onChange={e => setForm({ ...form, params: { ...form.params, shortPeriod: +e.target.value } })}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Long Period</label>
                <input type="number" value={form.params.longPeriod}
                  onChange={e => setForm({ ...form, params: { ...form.params, longPeriod: +e.target.value } })}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
              </div>
            </>)}
            {form.strategy_type === 'rsi' && (<>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>RSI Period</label>
                <input type="number" value={form.params.rsiPeriod}
                  onChange={e => setForm({ ...form, params: { ...form.params, rsiPeriod: +e.target.value } })}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Oversold</label>
                <input type="number" value={form.params.oversold}
                  onChange={e => setForm({ ...form, params: { ...form.params, oversold: +e.target.value } })}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Overbought</label>
                <input type="number" value={form.params.overbought}
                  onChange={e => setForm({ ...form, params: { ...form.params, overbought: +e.target.value } })}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
              </div>
            </>)}
            {form.strategy_type === 'breakout' && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Lookback Days</label>
                <input type="number" value={form.params.lookback}
                  onChange={e => setForm({ ...form, params: { ...form.params, lookback: +e.target.value } })}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.85rem' }} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '0.8rem', padding: '0.6rem 0.9rem', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: 6, color: '#ff4569', fontSize: '0.85rem' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={runBacktest} disabled={loading || !form.ticker}
            style={{ padding: '0.7rem 2rem', fontSize: '0.95rem', opacity: (!form.ticker || loading) ? 0.5 : 1 }}>
            {loading ? 'Computing...' : '▶ Run Backtest'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && m && (
        <div className="fade-in">
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <MetricBox label="Total Return"  value={`${m.totalProfitPct >= 0 ? '+' : ''}${m.totalProfitPct?.toFixed(2)}%`} color={m.totalProfitPct >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Win Rate"      value={`${m.winRate?.toFixed(1)}%`}     color="var(--accent)" />
            <MetricBox label="Trades"        value={m.numTrades} />
            <MetricBox label="Max Drawdown"  value={`${m.maxDrawdown?.toFixed(2)}%`}  color="var(--red)" />
            <MetricBox label="Sharpe Ratio"  value={m.sharpeRatio?.toFixed(3)}        color={m.sharpeRatio > 1 ? 'var(--green)' : 'var(--text)'} />
          </div>

          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Price Chart + Signals — {result.ticker}
              </h3>
              <div style={{ height: 280 }}><canvas ref={priceChartRef} /></div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Equity Curve
              </h3>
              <div style={{ height: 220 }}><canvas ref={equityChartRef} /></div>
            </div>
          </div>

          {/* Trade log */}
          {result.trades?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trade Log ({result.trades.length} trades)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Entry Date', 'Exit Date', 'Entry ₹', 'Exit ₹', 'P&L', 'P&L %'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...result.trades].reverse().slice(0, 50).map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.45rem 0.8rem', fontFamily: 'var(--font-mono)' }}>{t.entryDate}</td>
                        <td style={{ padding: '0.45rem 0.8rem', fontFamily: 'var(--font-mono)' }}>{t.exitDate}</td>
                        <td style={{ padding: '0.45rem 0.8rem', fontFamily: 'var(--font-mono)' }}>₹{Number(t.entryPrice).toFixed(2)}</td>
                        <td style={{ padding: '0.45rem 0.8rem', fontFamily: 'var(--font-mono)' }}>₹{Number(t.exitPrice).toFixed(2)}</td>
                        <td style={{ padding: '0.45rem 0.8rem', fontFamily: 'var(--font-mono)', color: t.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          ₹{Number(t.profit).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.45rem 0.8rem', fontFamily: 'var(--font-mono)', color: t.profitPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {t.profitPct >= 0 ? '+' : ''}{Number(t.profitPct).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
