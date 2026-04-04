import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';

Chart.register(...registerables);

export default function Stocks() {
  const [tickers, setTickers] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [stockData, setStockData] = useState([]);
  const [tickerMeta, setTickerMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tickersLoading, setTickersLoading] = useState(true);
  const [error, setError] = useState('');
  const chartRef = useRef(null);
  const chartInst = useRef(null);

  // Load tickers on mount
  useEffect(() => {
    setTickersLoading(true);
    api.get('/stocks/tickers')
      .then(r => {
        // Backend returns { ticker, name, exchange, hasData, recordCount }
        const list = Array.isArray(r.data) ? r.data : [];
        setTickers(list);
        const first = list.find(t => t.hasData) || list[0];
        if (first) setSelectedTicker(first.ticker);
      })
      .catch(e => setError('Cannot reach backend: ' + (e.message || 'unknown error')))
      .finally(() => setTickersLoading(false));
  }, []);

  // Load stock data when ticker changes
  useEffect(() => {
    if (!selectedTicker) return;
    setLoading(true);
    setStockData([]);
    setError('');

    const meta = tickers.find(t => t.ticker === selectedTicker);
    setTickerMeta(meta || null);

    api.get(`/stocks?ticker=${encodeURIComponent(selectedTicker)}&limit=500`)
      .then(r => {
        // Backend returns { ticker, count, data: [...] }
        const rows = r.data?.data || [];
        setStockData(rows);
      })
      .catch(e => setError('Failed to load data: ' + (e.response?.data?.error || e.message)))
      .finally(() => setLoading(false));
  }, [selectedTicker]);

  // Draw chart when data arrives
  useEffect(() => {
    if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
    if (!chartRef.current || stockData.length === 0) return;

    const last250 = stockData.slice(-250);
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: last250.map(d => d.date),
        datasets: [{
          label: `${selectedTicker} Close`,
          data: last250.map(d => d.close),
          borderColor: '#00e5ff',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          backgroundColor: 'rgba(0,229,255,0.05)',
          tension: 0.1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { labels: { color: '#64748b' } } },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: '#1f252e' } },
          y: { ticks: { color: '#64748b' }, grid: { color: '#1f252e' } },
        },
      },
    });

    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
  }, [stockData, selectedTicker]);

  // Compute summary from loaded data
  const summary = stockData.length > 0 ? {
    total_rows: tickerMeta?.recordCount || stockData.length,
    earliest: stockData[0]?.date,
    latest: stockData[stockData.length - 1]?.date,
    min_price: Math.min(...stockData.map(d => d.close)),
    max_price: Math.max(...stockData.map(d => d.close)),
    avg_price: stockData.reduce((s, d) => s + d.close, 0) / stockData.length,
  } : null;

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>Market Data</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Historical price data available for backtesting
      </p>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.25)', borderRadius: 8, color: '#ff4569', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
          ⚠ {error}
        </div>
      )}

      {/* Ticker pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tickersLoading && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading tickers...</span>}
        {!tickersLoading && tickers.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tickers found — check backend is running on port 5000</span>
        )}
        {tickers.map(t => (
          <button key={t.ticker} onClick={() => setSelectedTicker(t.ticker)} style={{
            padding: '0.4rem 0.9rem', borderRadius: 20, border: '1px solid',
            borderColor: selectedTicker === t.ticker ? 'var(--accent)' : 'var(--border)',
            background: selectedTicker === t.ticker ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: selectedTicker === t.ticker ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {t.ticker}
            {t.hasData && <span style={{ marginLeft: 4, opacity: 0.5 }}>●</span>}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Rows',    value: summary.total_rows?.toLocaleString() },
            { label: 'Earliest Date', value: summary.earliest },
            { label: 'Latest Date',   value: summary.latest },
            { label: 'Price Range',   value: `${summary.min_price?.toFixed(2)} – ${summary.max_price?.toFixed(2)}` },
            { label: 'Avg Price',     value: summary.avg_price?.toFixed(2) },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: 1, minWidth: 120 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700 }}>{s.value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {selectedTicker ? `${selectedTicker} — Close Price (Last 250 trading days)` : 'Select a ticker above'}
        </h3>

        {loading && (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading data...
          </div>
        )}

        {!loading && selectedTicker && stockData.length === 0 && !error && (
          <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>◎</div>
            <p style={{ margin: '0 0 12px' }}>No data for <strong style={{ color: 'var(--text)' }}>{selectedTicker}</strong></p>
            <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 8, padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.82rem' }}>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                cd data_ingestion<br />
                pip install -r requirements.txt<br />
                python fetch_stock_data.py
              </code>
            </div>
          </div>
        )}

        {!loading && stockData.length > 0 && (
          <div style={{ height: 300 }}>
            <canvas ref={chartRef} />
          </div>
        )}
      </div>

      {/* Data note */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ℹ Data Ingestion:</span>{' '}
        Historical data is pre-loaded via the Python script in{' '}
        <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>data_ingestion/fetch_stock_data.py</code>.
        {' '}Run: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>python fetch_stock_data.py</code>
      </div>
    </div>
  );
}
