import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { backtest, stocks, strategy } from '../utils/api';

Chart.register(...registerables);

const BUILTIN_STRATEGIES = [
  {
    value: 'moving_average_crossover',
    label: 'Moving Average Crossover',
    params: [
      { key: 'shortPeriod', label: 'Short Period', default: 50 },
      { key: 'longPeriod',  label: 'Long Period',  default: 200 },
    ],
  },
  {
    value: 'rsi',
    label: 'RSI Strategy',
    params: [
      { key: 'rsiPeriod',   label: 'RSI Period',   default: 14 },
      { key: 'oversold',    label: 'Oversold',      default: 30 },
      { key: 'overbought',  label: 'Overbought',    default: 70 },
    ],
  },
  {
    value: 'breakout',
    label: 'Breakout Strategy',
    params: [
      { key: 'lookback', label: 'Lookback Days', default: 20 },
    ],
  },
];

function MetricCard({ label, value, color }) {
  return (
    <div className="metric-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
      <div className="font-mono" style={{ fontSize: '22px', fontWeight: '700', color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function BacktestPage() {
  const [tickers, setTickers]         = useState([]);
  const [myStrategies, setMyStrategies] = useState([]);
  const [loadingTickers, setLoadingTickers] = useState(true);

  // form state
  const [ticker,       setTicker]       = useState('');
  const [startDate,    setStartDate]    = useState('2020-01-01');
  const [endDate,      setEndDate]      = useState(new Date().toISOString().split('T')[0]);
  const [useCustom,    setUseCustom]    = useState(false);
  const [builtinType,  setBuiltinType]  = useState('moving_average_crossover');
  const [customId,     setCustomId]     = useState('');
  const [stratParams,  setStratParams]  = useState({ shortPeriod: 50, longPeriod: 200 });

  // result state
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const priceChartRef  = useRef(null);
  const equityChartRef = useRef(null);
  const priceChartInst  = useRef(null);
  const equityChartInst = useRef(null);

  // ── Load tickers ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingTickers(true);
    stocks.getTickers()
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTickers(list);
        // Auto-select first ticker that has data, otherwise first ticker
        const withData = list.find(t => t.hasData);
        const first    = withData || list[0];
        if (first) setTicker(first.ticker);
      })
      .catch(err => setError('Could not load tickers: ' + (err.response?.data?.error || err.message)))
      .finally(() => setLoadingTickers(false));

    strategy.list()
      .then(res => setMyStrategies(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  // ── Charts ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!result) return;

    // destroy old
    if (priceChartInst.current)  { priceChartInst.current.destroy();  priceChartInst.current  = null; }
    if (equityChartInst.current) { equityChartInst.current.destroy(); equityChartInst.current = null; }

    const pd     = result.priceData  || [];
    const ec     = result.equityCurve || [];
    const labels = pd.map(d => d.date);

    // Price chart
    if (priceChartRef.current && pd.length > 0) {
      priceChartInst.current = new Chart(priceChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Close Price',
              data: pd.map(d => d.close),
              borderColor: '#60a5fa',
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0,
              fill: false,
            },
            {
              label: 'BUY',
              data: pd.map(d => d.signal === 1 ? d.close : null),
              type: 'scatter',
              pointRadius: 6,
              pointBackgroundColor: '#10b981',
              pointStyle: 'triangle',
              showLine: false,
            },
            {
              label: 'SELL',
              data: pd.map(d => d.signal === -1 ? d.close : null),
              type: 'scatter',
              pointRadius: 6,
              pointBackgroundColor: '#f43f5e',
              pointStyle: 'triangle',
              rotation: 180,
              showLine: false,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
          scales: {
            x: { ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      });
    }

    // Equity chart
    if (equityChartRef.current && ec.length > 0) {
      equityChartInst.current = new Chart(equityChartRef.current, {
        type: 'line',
        data: {
          labels: ec.map(d => d.date),
          datasets: [{
            label: 'Portfolio Value',
            data: ec.map(d => d.equity),
            borderColor: '#00d4aa',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0,
            fill: true,
            backgroundColor: 'rgba(0,212,170,0.06)',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: {
              ticks: { color: '#64748b', font: { size: 10 }, callback: v => `₹${(v / 1000).toFixed(0)}k` },
              grid: { color: 'rgba(255,255,255,0.04)' },
            },
          },
        },
      });
    }

    return () => {
      if (priceChartInst.current)  { priceChartInst.current.destroy();  priceChartInst.current  = null; }
      if (equityChartInst.current) { equityChartInst.current.destroy(); equityChartInst.current = null; }
    };
  }, [result]);

  // ── Run backtest ─────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!ticker) { setError('Please select a ticker first'); return; }
    setError(''); setLoading(true); setResult(null);

    try {
      const payload = {
        ticker,
        start_date: startDate,
        end_date:   endDate,
        initial_capital: 100000,
      };

      if (useCustom && customId) {
        payload.strategy_id = parseInt(customId);
      } else {
        payload.strategy_type = builtinType;
        payload.params = { ...stratParams };
      }

      const res = await backtest.run(payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Backtest failed. Check backend logs.');
    } finally {
      setLoading(false);
    }
  };

  // ── Param reset when strategy type changes ──────────────────────────────────
  const handleBuiltinChange = (type) => {
    setBuiltinType(type);
    const s = BUILTIN_STRATEGIES.find(s => s.value === type);
    if (s) {
      const p = {};
      s.params.forEach(par => { p[par.key] = par.default; });
      setStratParams(p);
    }
  };

  const selectedBuiltin = BUILTIN_STRATEGIES.find(s => s.value === builtinType);
  const m = result?.metrics;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>⚡ Run Backtest</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Test trading strategies against historical data</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── Config panel ── */}
        <div className="card" style={{ position: 'sticky', top: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Configuration</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Ticker */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>TICKER</label>
              {loadingTickers ? (
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading tickers...</div>
              ) : (
                <select
                  className="input-field"
                  value={ticker}
                  onChange={e => setTicker(e.target.value)}
                  style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px' }}
                >
                  {tickers.length === 0 && (
                    <option value="">— No tickers available —</option>
                  )}
                  {tickers.map(t => (
                    <option key={t.ticker} value={t.ticker}>
                      {t.ticker}{t.hasData ? ` (${t.recordCount?.toLocaleString()} rows)` : ' — no data'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>START</label>
                <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>END</label>
                <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
              </div>
            </div>

            {/* Strategy source toggle */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>STRATEGY SOURCE</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[['Built-in', false], ['My Strategies', true]].map(([label, val]) => (
                  <button key={label} onClick={() => setUseCustom(val)} style={{
                    flex: 1, padding: '8px 6px', borderRadius: '6px', border: '1px solid', fontSize: '12px', cursor: 'pointer',
                    borderColor: useCustom === val ? 'var(--accent)' : 'var(--border)',
                    background: useCustom === val ? 'var(--accent-dim)' : 'transparent',
                    color: useCustom === val ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy selector */}
            {!useCustom ? (
              <>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>STRATEGY</label>
                  <select className="input-field" value={builtinType} onChange={e => handleBuiltinChange(e.target.value)} style={{ fontSize: '13px' }}>
                    {BUILTIN_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {selectedBuiltin?.params.map(p => (
                  <div key={p.key}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{p.label.toUpperCase()}</label>
                    <input className="input-field" type="number" value={stratParams[p.key] ?? p.default}
                      onChange={e => setStratParams({ ...stratParams, [p.key]: Number(e.target.value) })}
                      style={{ fontSize: '13px', padding: '8px 12px' }} />
                  </div>
                ))}
              </>
            ) : (
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>MY STRATEGIES</label>
                {myStrategies.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    No saved strategies. Go to Strategies to create one.
                  </div>
                ) : (
                  <select className="input-field" value={customId} onChange={e => setCustomId(e.target.value)} style={{ fontSize: '13px' }}>
                    <option value="">— Select Strategy —</option>
                    {myStrategies.map(s => <option key={s.id} value={s.id}>{s.strategy_name}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', fontSize: '12px', color: '#f43f5e', lineHeight: '1.5' }}>
                ⚠ {error}
              </div>
            )}

            {/* Run button */}
            <button
              className="btn-primary"
              onClick={handleRun}
              disabled={loading || !ticker || (useCustom && !customId)}
              style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }}
            >
              {loading ? '⚡ Running...' : '⚡ Run Backtest'}
            </button>
          </div>
        </div>

        {/* ── Results panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!result && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.15 }}>⚡</div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                Configure a ticker and strategy, then click <strong style={{ color: 'var(--text-primary)' }}>Run Backtest</strong>
              </p>
            </div>
          )}

          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '14px', color: 'var(--accent)' }}>⚡ Calculating...</div>
            </div>
          )}

          {result && (
            <>
              {/* Metric row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <MetricCard label="Total Return"   value={`${m.totalProfitPct >= 0 ? '+' : ''}${m.totalProfitPct?.toFixed(2)}%`} color={m.totalProfitPct >= 0 ? 'var(--green)' : 'var(--red)'} />
                <MetricCard label="Max Drawdown"   value={`${m.maxDrawdown?.toFixed(2)}%`}  color="var(--red)"    />
                <MetricCard label="Win Rate"        value={`${m.winRate?.toFixed(1)}%`}       color="var(--yellow)" />
                <MetricCard label="Total Trades"    value={m.numTrades}                        />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <MetricCard label="Sharpe Ratio"   value={m.sharpeRatio?.toFixed(3)}          color={m.sharpeRatio >= 1 ? 'var(--green)' : m.sharpeRatio >= 0 ? 'var(--yellow)' : 'var(--red)'} />
                <MetricCard label="Abs. P&L"       value={`₹${Math.round(m.totalProfit).toLocaleString()}`} color={m.totalProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
                <MetricCard label="Final Equity"   value={`₹${Math.round(m.finalEquity).toLocaleString()}`} color="var(--accent)" />
              </div>

              {/* Price chart */}
              <div className="card">
                <h3 style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Price Chart — {result.ticker} &nbsp;
                  <span style={{ color: 'var(--green)', fontWeight: 400 }}>▲ BUY</span>
                  &nbsp;
                  <span style={{ color: 'var(--red)', fontWeight: 400 }}>▼ SELL</span>
                </h3>
                <div style={{ height: '260px' }}><canvas ref={priceChartRef} /></div>
              </div>

              {/* Equity curve */}
              <div className="card">
                <h3 style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Equity Curve</h3>
                <div style={{ height: '200px' }}><canvas ref={equityChartRef} /></div>
              </div>

              {/* Trade log */}
              {result.trades?.length > 0 && (
                <div className="card" style={{ padding: 0 }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Trade Log ({result.trades.length} trades shown)
                    </h3>
                  </div>
                  <div style={{ overflow: 'auto', maxHeight: '280px' }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Entry Date</th><th>Exit Date</th><th>Entry ₹</th><th>Exit ₹</th><th>P&L</th><th>P&L %</th></tr>
                      </thead>
                      <tbody>
                        {[...result.trades].reverse().map((t, i) => (
                          <tr key={i}>
                            <td className="font-mono" style={{ fontSize: '12px' }}>{t.entryDate}</td>
                            <td className="font-mono" style={{ fontSize: '12px' }}>{t.exitDate}</td>
                            <td className="font-mono" style={{ fontSize: '12px' }}>₹{Number(t.entryPrice).toFixed(2)}</td>
                            <td className="font-mono" style={{ fontSize: '12px' }}>₹{Number(t.exitPrice).toFixed(2)}</td>
                            <td className="font-mono" style={{ fontSize: '12px', color: t.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              ₹{Number(t.profit).toFixed(2)}
                            </td>
                            <td>
                              <span className={`badge ${t.profitPct >= 0 ? 'badge-green' : 'badge-red'}`}>
                                {t.profitPct >= 0 ? '+' : ''}{Number(t.profitPct).toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
