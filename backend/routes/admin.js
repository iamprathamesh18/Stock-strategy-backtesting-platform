const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await getDb().allAsync('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await getDb().allAsync('SELECT id,username,email,role,created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [u, s, r, b, st] = await Promise.all([
      db.getAsync('SELECT COUNT(*) as c FROM users'),
      db.getAsync('SELECT COUNT(DISTINCT ticker) as c FROM stocks'),
      db.getAsync('SELECT COUNT(*) as c FROM stocks'),
      db.getAsync('SELECT COUNT(*) as c FROM backtest_results'),
      db.getAsync('SELECT COUNT(*) as c FROM strategies'),
    ]);
    res.json({ userCount: u.c, stockCount: s.c, recordCount: r.c, backtestCount: b.c, strategyCount: st.c });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
