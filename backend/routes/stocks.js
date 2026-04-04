const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /stocks — OHLCV data for a ticker
router.get('/', authenticate, async (req, res) => {
  try {
    const { ticker, start, end, limit = 500 } = req.query;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const db = getDb();
    let sql = 'SELECT * FROM stocks WHERE ticker = ?';
    const params = [ticker];
    if (start) { sql += ' AND date >= ?'; params.push(start); }
    if (end)   { sql += ' AND date <= ?'; params.push(end); }
    sql += ' ORDER BY date ASC LIMIT ?';
    params.push(parseInt(limit));
    const rows = await db.allAsync(sql, params);
    res.json({ ticker, count: rows.length, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /stocks/tickers — all tracked tickers with data stats
router.get('/tickers', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const tickers = await db.allAsync(
      'SELECT * FROM tickers WHERE active = 1 ORDER BY ticker'
    );
    const withData = await Promise.all(tickers.map(async t => {
      const row = await db.getAsync(
        'SELECT COUNT(*) as c, MIN(date) as earliest, MAX(date) as latest FROM stocks WHERE ticker = ?',
        [t.ticker]
      );
      return {
        ...t,
        hasData:     (row?.c || 0) > 0,
        recordCount: row?.c || 0,
        earliest:    row?.earliest || null,
        latest:      row?.latest   || null,
      };
    }));
    res.json(withData);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /stocks/explore — paginated tabular data for the Data Explorer UI
router.get('/explore', authenticate, async (req, res) => {
  try {
    const { ticker, start, end, page = 1, pageSize = 50 } = req.query;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });

    const db     = getDb();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let countSql = 'SELECT COUNT(*) as total FROM stocks WHERE ticker = ?';
    let dataSql  = 'SELECT * FROM stocks WHERE ticker = ?';
    const params = [ticker];
    const countParams = [ticker];

    if (start) { dataSql += ' AND date >= ?'; countSql += ' AND date >= ?'; params.push(start); countParams.push(start); }
    if (end)   { dataSql += ' AND date <= ?'; countSql += ' AND date <= ?'; params.push(end);   countParams.push(end);   }

    dataSql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [countRow, rows] = await Promise.all([
      db.getAsync(countSql, countParams),
      db.allAsync(dataSql, params),
    ]);

    // Summary stats
    let statsSql = 'SELECT MIN(close) as minPrice, MAX(close) as maxPrice, AVG(close) as avgPrice, MIN(date) as earliest, MAX(date) as latest FROM stocks WHERE ticker = ?';
    const statsParams = [ticker];
    if (start) { statsSql += ' AND date >= ?'; statsParams.push(start); }
    if (end)   { statsSql += ' AND date <= ?'; statsParams.push(end); }
    const stats = await db.getAsync(statsSql, statsParams);

    res.json({
      ticker,
      total:     countRow?.total || 0,
      page:      parseInt(page),
      pageSize:  parseInt(pageSize),
      totalPages: Math.ceil((countRow?.total || 0) / parseInt(pageSize)),
      stats: {
        minPrice:  stats?.minPrice  ? parseFloat(stats.minPrice.toFixed(2))  : null,
        maxPrice:  stats?.maxPrice  ? parseFloat(stats.maxPrice.toFixed(2))  : null,
        avgPrice:  stats?.avgPrice  ? parseFloat(stats.avgPrice.toFixed(2))  : null,
        earliest:  stats?.earliest || null,
        latest:    stats?.latest   || null,
      },
      data: rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /stocks/tickers — admin add ticker
router.post('/tickers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ticker, name, exchange } = req.body;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const db = getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO tickers (ticker, name, exchange) VALUES (?, ?, ?)',
      [ticker.toUpperCase(), name || ticker, exchange || 'NSE']
    );
    await db.runAsync(
      "INSERT INTO system_logs (level, message) VALUES ('info', ?)",
      [`Ticker added: ${ticker} by ${req.user.username}`]
    );
    res.json({ success: true, ticker });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /stocks/tickers/:ticker — admin remove
router.delete('/tickers/:ticker', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.runAsync('UPDATE tickers SET active = 0 WHERE ticker = ?', [req.params.ticker]);
    await db.runAsync(
      "INSERT INTO system_logs (level, message) VALUES ('info', ?)",
      [`Ticker removed: ${req.params.ticker} by ${req.user.username}`]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /stocks/ingest — admin trigger log
router.post('/ingest', authenticate, requireAdmin, async (req, res) => {
  try {
    const { tickers } = req.body;
    const db = getDb();
    await db.runAsync(
      "INSERT INTO system_logs (level, message, meta) VALUES ('info', ?, ?)",
      ['Data ingestion triggered', JSON.stringify({ tickers, by: req.user.username })]
    );
    res.json({
      success: true,
      message: 'Run: cd data_ingestion && python fetch_stock_data.py',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
