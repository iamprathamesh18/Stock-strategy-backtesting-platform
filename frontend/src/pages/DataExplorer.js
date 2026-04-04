import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function DataExplorer() {
  const [tickers,      setTickers]      = useState([]);
  const [ticker,       setTicker]       = useState('');
  const [startDate,    setStartDate]    = useState('2020-01-01');
  const [endDate,      setEndDate]      = useState(new Date().toISOString().split('T')[0]);
  const [page,         setPage]         = useState(1);
  const [pageSize]                      = useState(50);
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [tickersLoading, setTickersLoading] = useState(true);
  const [error,        setError]        = useState('');

  // Load tickers
  useEffect(() => {
    setTickersLoading(true);
    api.get('/stocks/tickers')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setTickers(list);
        const first = list.find(t => t.hasData) || list[0];
        if (first) setTicker(first.ticker);
      })
      .catch(e => setError('Failed to load tickers: ' + e.message))
      .finally(() => setTickersLoading(false));
  }, []);

  // Fetch data when ticker/dates/page change
  const fetchData = (p = 1) => {
    if (!ticker) return;
    setLoading(true); setError('');
    api.get('/stocks/explore', { params: { ticker, start: startDate, end: endDate, page: p, pageSize } })
      .then(r => { setResult(r.data); setPage(p); })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => { setPage(1); fetchData(1); };

  // Input style reuse
  const inputStyle = {
    padding: '0.5rem 0.75rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '0.85rem',
    width: '100%',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const s = result?.stats;

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>Data Explorer</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Browse raw OHLCV data stored in the database
      </p>

      {/* ── Filter bar ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          {/* Ticker */}
          <div>
            <label style={labelStyle}>Stock / Ticker</label>
            {tickersLoading ? (
              <div style={{ ...inputStyle, color: 'var(--text-muted)' }}>Loading tickers...</div>
            ) : (
              <select value={ticker} onChange={e => setTicker(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}>
                {tickers.length === 0 && <option value="">No tickers — run ingestion script</option>}
                {tickers.map(t => (
                  <option key={t.ticker} value={t.ticker}>
                    {t.ticker} — {t.name || ''}
                    {t.hasData ? ` (${Number(t.recordCount).toLocaleString()} rows)` : ' — no data'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Start date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>

          {/* End date */}
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>

          {/* Search button */}
          <div>
            <button
              onClick={handleSearch}
              disabled={loading || !ticker}
              className="btn-primary"
              style={{ padding: '0.55rem 1.5rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
              {loading ? 'Loading...' : '🔍 Search'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.25)', borderRadius: 8, color: '#ff4569', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Summary stats ── */}
      {result && s && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Records', value: Number(result.total).toLocaleString() },
            { label: 'Date Range',    value: `${s.earliest} → ${s.latest}` },
            { label: 'Min Close',     value: s.minPrice != null ? `₹${s.minPrice}` : '—' },
            { label: 'Max Close',     value: s.maxPrice != null ? `₹${s.maxPrice}` : '—' },
            { label: 'Avg Close',     value: s.avgPrice != null ? `₹${s.avgPrice}` : '—' },
          ].map(item => (
            <div key={item.label} className="card" style={{ flex: 1, minWidth: 130, padding: '0.8rem 1rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {result && (
        <div className="card" style={{ padding: 0 }}>
          {/* Table header row */}
          <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {result.ticker} &nbsp;·&nbsp; Showing {result.data.length} of {Number(result.total).toLocaleString()} records
              &nbsp;·&nbsp; Page {result.page} of {result.totalPages}
            </span>
            {/* Pagination */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => fetchData(page - 1)}
                disabled={page <= 1 || loading}
                style={{ padding: '0.3rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: page <= 1 ? 'var(--text-muted)' : 'var(--text)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 70, textAlign: 'center' }}>
                {page} / {result.totalPages}
              </span>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={page >= result.totalPages || loading}
                style={{ padding: '0.3rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: page >= result.totalPages ? 'var(--text-muted)' : 'var(--text)', cursor: page >= result.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading data...</div>
            ) : result.data.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No data found for {result.ticker} in this date range.
                <br /><br />
                <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.82rem' }}>
                  python data_ingestion/fetch_stock_data.py
                </code>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['#', 'Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Day Change'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 1rem', textAlign: h === '#' ? 'center' : 'right', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row, i) => {
                    const change    = row.close - row.open;
                    const changePct = ((change / row.open) * 100);
                    const isUp      = change >= 0;
                    const rowNum    = (page - 1) * pageSize + i + 1;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{rowNum}</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.date}</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{Number(row.open).toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#00e676' }}>₹{Number(row.high).toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#ff4569' }}>₹{Number(row.low).toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{Number(row.close).toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {row.volume ? Number(row.volume).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isUp ? '#00e676' : '#ff4569' }}>
                          {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom pagination */}
          {result.totalPages > 1 && !loading && (
            <div style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {Array.from({ length: Math.min(result.totalPages, 10) }, (_, idx) => {
                const p = idx + 1;
                return (
                  <button key={p} onClick={() => fetchData(p)}
                    style={{ padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid', fontSize: '0.78rem', cursor: 'pointer',
                      borderColor: page === p ? 'var(--accent)' : 'var(--border)',
                      background:  page === p ? 'rgba(0,229,255,0.1)' : 'transparent',
                      color:       page === p ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                    {p}
                  </button>
                );
              })}
              {result.totalPages > 10 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>... {result.totalPages} pages total</span>}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.15 }}>🗄</div>
          <p style={{ margin: 0 }}>Select a ticker and click <strong style={{ color: 'var(--text)' }}>Search</strong> to browse the database</p>
        </div>
      )}
    </div>
  );
}
