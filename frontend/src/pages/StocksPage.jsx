import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { stocks } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

Chart.register(...registerables);

export default function StocksPage() {
  const { user } = useAuth();
  const [tickers, setTickers] = useState([]);
  const [selected, setSelected] = useState('');
  const [stockData, setStockData] = useState([]);
  const [loadingTickers, setLoadingTickers] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const chartRef = useRef(null);
  const chartInst = useRef(null);

  // ── Load tickers on mount ──────────────────────────────────────────────────
  const loadTickers = async () => {
    setLoadingTickers(true);
    setError('');
    try {
      const res = await stocks.getTickers();
      const list = Array.isArray(res.data) ? res.data : [];
      setTickers(list);
      if (list.length > 0) {
        const first = list[0].ticker;
        setSelected(first);
      }
    } catch (err) {
      setError('Failed to load tickers: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingTickers(false);
    }
  };

  useEffect(() => { loadTickers(); }, []);

  // ── Load stock data whenever selected ticker changes ───────────────────────
  useEffect(() => {
    if (!selected) return;
    setLoadingData(true);
    setStockData([]);
    stocks.getData(selected, '2015-01-01', null, 500)
      .then(res => {
        const rows = res.data?.data || [];
        setStockData(rows);
      })
      .catch(err => setError('Failed to load data: ' + (err.response?.data?.error || err.message)))
      .finally(() => setLoadingData(false));
  }, [selected]);

  // ── Draw chart when data arrives ───────────────────────────────────────────
  useEffect(() => {
    if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
    if (!chartRef.current || stockData.length === 0) return;

    const last250 = stockData.slice(-250);
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: last250.map(d => d.date),
        datasets: [{
          label: `${selected} — Close Price`,
          data: last250.map(d => d.close),
          borderColor: '#00d4aa',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0,
          fill: true,
          backgroundColor: 'rgba(0,212,170,0.07)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });

    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
  }, [stockData, selected]);

  const handleAdd = async () => {
    if (!newTicker.trim()) return;
    setAdding(true);
    try {
      await stocks.addTicker({ ticker: newTicker.trim().toUpperCase(), name: newName });
      setNewTicker(''); setNewName('');
      loadTickers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add ticker');
    } finally { setAdding(false); }
  };

  const handleRemove = async (ticker) => {
    try {
      await stocks.removeTicker(ticker);
      if (selected === ticker) setSelected('');
      loadTickers();
    } catch (err) { setError('Failed to remove ticker'); }
  };

  const selectedMeta = tickers.find(t => t.ticker === selected);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>◎ Market Data</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Historical price data available for backtesting</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', color: '#f43f5e', fontSize: '13px', marginBottom: '16px' }}>
          ⚠ {error}
        </div>
      )}

      {/* Ticker pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {loadingTickers ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px' }}>Loading tickers...</div>
        ) : tickers.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px' }}>No tickers found. Check backend connection.</div>
        ) : (
          tickers.map(t => (
            <button key={t.ticker} onClick={() => setSelected(t.ticker)} style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid',
              borderColor: selected === t.ticker ? 'var(--accent)' : 'var(--border)',
              background: selected === t.ticker ? 'var(--accent-dim)' : 'transparent',
              color: selected === t.ticker ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '12px', fontFamily: 'Space Mono, monospace', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {t.ticker}
              {t.hasData && <span style={{ marginLeft: '4px', opacity: 0.6 }}>●</span>}
            </button>
          ))
        )}
      </div>

      {/* Main content area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* Chart + table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Chart */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600' }}>
                  {selected || 'Select a ticker'}
                  {selectedMeta?.name && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: '400' }}>{selectedMeta.name}</span>}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {loadingData ? 'Loading...' : `${stockData.length.toLocaleString()} records · Close Price (last 250 trading days)`}
                </p>
              </div>
              {selectedMeta && (
                selectedMeta.hasData
                  ? <span className="badge badge-green">Data Available</span>
                  : <span className="badge badge-yellow">No Data — Run Ingestion Script</span>
              )}
            </div>

            {loadingData && (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Loading chart data...
              </div>
            )}

            {!loadingData && stockData.length === 0 && selected && (
              <div style={{ height: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>◎</div>
                <p style={{ margin: '0 0 12px', fontSize: '14px' }}>No data for <strong style={{ color: 'var(--text-primary)' }}>{selected}</strong></p>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px 16px', textAlign: 'left' }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: 'var(--accent)' }}>
                    cd data_ingestion<br />
                    pip install -r requirements.txt<br />
                    python fetch_stock_data.py
                  </div>
                </div>
              </div>
            )}

            {!loadingData && stockData.length > 0 && (
              <div style={{ height: '260px' }}>
                <canvas ref={chartRef} />
              </div>
            )}
          </div>

          {/* Data table */}
          {stockData.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Recent OHLCV Data — {selected}
                </h3>
              </div>
              <div style={{ overflow: 'auto', maxHeight: '320px' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr>
                  </thead>
                  <tbody>
                    {stockData.slice(-40).reverse().map((row, i) => (
                      <tr key={i}>
                        <td className="font-mono" style={{ fontSize: '12px' }}>{row.date}</td>
                        <td className="font-mono" style={{ fontSize: '12px' }}>₹{Number(row.open).toFixed(2)}</td>
                        <td className="font-mono" style={{ fontSize: '12px', color: 'var(--green)' }}>₹{Number(row.high).toFixed(2)}</td>
                        <td className="font-mono" style={{ fontSize: '12px', color: 'var(--red)' }}>₹{Number(row.low).toFixed(2)}</td>
                        <td className="font-mono" style={{ fontSize: '12px', fontWeight: '600' }}>₹{Number(row.close).toFixed(2)}</td>
                        <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{Number(row.volume).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Stats */}
          {selectedMeta && (
            <div className="card">
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Ticker Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  ['Symbol', selectedMeta.ticker],
                  ['Company', selectedMeta.name || '—'],
                  ['Exchange', selectedMeta.exchange || '—'],
                  ['Records', selectedMeta.recordCount?.toLocaleString() || '0'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="font-mono" style={{ fontWeight: '600', fontSize: '12px' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin: add ticker */}
          {user?.role === 'admin' && (
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Add Ticker</h3>
              <input className="input-field" placeholder="e.g. NAUKRI.NS" value={newTicker} onChange={e => setNewTicker(e.target.value)} style={{ marginBottom: '8px', fontSize: '13px', padding: '8px 12px' }} />
              <input className="input-field" placeholder="Company name (optional)" value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: '10px', fontSize: '13px', padding: '8px 12px' }} />
              <button className="btn-primary" onClick={handleAdd} disabled={adding} style={{ width: '100%', padding: '8px', fontSize: '13px' }}>
                {adding ? 'Adding...' : '+ Add Ticker'}
              </button>
            </div>
          )}

          {/* Admin: remove */}
          {user?.role === 'admin' && selected && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Manage</h3>
              <button onClick={() => handleRemove(selected)} style={{ width: '100%', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '6px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Remove {selected}
              </button>
            </div>
          )}

          {/* Info box */}
          <div style={{ padding: '14px 16px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--accent)' }}>ℹ Data Ingestion:</strong> Historical data is pre-loaded via the Python script in{' '}
            <code style={{ fontFamily: 'Space Mono', color: 'var(--accent)', fontSize: '11px' }}>data_ingestion/fetch_stock_data.py</code>.
            Admin users can trigger re-ingestion from the Admin panel or run the script directly:{' '}
            <code style={{ fontFamily: 'Space Mono', color: 'var(--accent)', fontSize: '11px' }}>python fetch_stock_data.py</code>
          </div>
        </div>
      </div>
    </div>
  );
}
