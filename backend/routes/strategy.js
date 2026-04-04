const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/create', authenticate, async (req, res) => {
  try {
    const { strategy_name, strategy_type, rules_json, description } = req.body;
    if (!strategy_name || !rules_json)
      return res.status(400).json({ error: 'strategy_name and rules_json required' });
    const rulesStr = typeof rules_json === 'string' ? rules_json : JSON.stringify(rules_json);
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO strategies (user_id, strategy_name, strategy_type, rules_json, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, strategy_name, strategy_type || 'custom', rulesStr, description || '']
    );
    res.status(201).json({ id: result.lastID, strategy_name, strategy_type: strategy_type || 'custom' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/list', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const strategies = await db.allAsync(
      'SELECT s.*, u.username FROM strategies s JOIN users u ON s.user_id = u.id WHERE s.user_id = ? ORDER BY s.created_at DESC',
      [req.user.id]
    );
    res.json(strategies.map(s => ({ ...s, rules_json: JSON.parse(s.rules_json) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const strategy = await db.getAsync(
      'SELECT * FROM strategies WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
    );
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
    res.json({ ...strategy, rules_json: JSON.parse(strategy.rules_json) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const strategy = await db.getAsync(
      'SELECT id FROM strategies WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
    );
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
    await db.runAsync('DELETE FROM strategies WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
