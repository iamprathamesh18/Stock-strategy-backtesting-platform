const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { runBuiltinStrategy, runCustomStrategy, simulateTrades } = require('../strategies/engine');

const router = express.Router();

router.post('/run', authenticate, async (req, res) => {
  try {
    const {
      ticker, start_date, end_date,
      strategy_id, strategy_type,
      params = {},
      initial_capital = 100000,
    } = req.body;

    if (!ticker || !start_date || !end_date)
      return res.status(400).json({ error: 'ticker, start_date, end_date are required' });
    if (!strategy_id && !strategy_type)
      return res.status(400).json({ error: 'Provide strategy_id (custom) or strategy_type (built-in)' });

    const db = getDb();

    // Fetch OHLCV data
    const data = await db.allAsync(
      'SELECT * FROM stocks WHERE ticker = ? AND date >= ? AND date <= ? ORDER BY date ASC',
      [ticker, start_date, end_date]
    );

    if (data.length < 50)
      return res.status(400).json({
        error: `Not enough data: only ${data.length} rows found for ${ticker} between ${start_date} and ${end_date}. Need at least 50. Run the ingestion script first.`
      });

    let signals, indicators, strategyName, strategyIdSaved = null;

    if (strategy_id) {
      // ── Custom saved strategy ──────────────────────────────────────────────
      const strat = await db.getAsync(
        'SELECT * FROM strategies WHERE id = ? AND user_id = ?',
        [strategy_id, req.user.id]
      );
      if (!strat) return res.status(404).json({ error: 'Strategy not found' });
      strategyName   = strat.strategy_name;
      strategyIdSaved = strategy_id;

      if (strat.strategy_type === 'custom') {
        ({ signals, indicators } = runCustomStrategy(strat.rules_json, data));
      } else {
        const p = JSON.parse(strat.rules_json).params || {};
        ({ signals, indicators } = runBuiltinStrategy(strat.strategy_type, data, p));
      }
    } else {
      // ── Built-in strategy ──────────────────────────────────────────────────
      const names = {
        moving_average_crossover: 'Moving Average Crossover',
        rsi:      'RSI Strategy',
        breakout: 'Breakout Strategy',
      };
      strategyName = names[strategy_type] || strategy_type;
      ({ signals, indicators } = runBuiltinStrategy(strategy_type, data, params));
    }

    // Simulate trades
    const result = simulateTrades(data, signals, Number(initial_capital));

    // Persist result
    const saved = await db.runAsync(
      `INSERT INTO backtest_results
         (user_id, strategy_id, strategy_name, ticker, start_date, end_date,
          profit, profit_pct, max_drawdown, sharpe_ratio, win_rate, num_trades,
          equity_curve, trades_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id, strategyIdSaved, strategyName, ticker, start_date, end_date,
        result.totalProfit, result.totalProfitPct, result.maxDrawdown,
        result.sharpeRatio, result.winRate, result.numTrades,
        JSON.stringify(result.equityCurve),
        JSON.stringify(result.trades),
      ]
    );

    // Price data for chart — attach signal to each row
    const priceData = data.map((d, i) => ({ ...d, signal: signals[i] }));

    res.json({
      id:       saved.lastID,
      ticker,
      strategy: strategyName,
      metrics: {
        totalProfit:    result.totalProfit,
        totalProfitPct: result.totalProfitPct,
        maxDrawdown:    result.maxDrawdown,
        sharpeRatio:    result.sharpeRatio,
        winRate:        result.winRate,
        numTrades:      result.numTrades,
        finalEquity:    result.finalEquity,
      },
      trades:      result.trades.slice(-50),
      equityCurve: result.equityCurve,
      priceData:   priceData.slice(-500),
    });
  } catch (err) {
    console.error('[backtest/run]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const rows = await getDb().allAsync(
      `SELECT id, strategy_name, ticker, start_date, end_date,
              profit, profit_pct, max_drawdown, sharpe_ratio, win_rate, num_trades, created_at
       FROM backtest_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const row = await getDb().getAsync(
      'SELECT * FROM backtest_results WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!row) return res.status(404).json({ error: 'Result not found' });
    res.json({
      ...row,
      equity_curve: JSON.parse(row.equity_curve || '[]'),
      trades_json:  JSON.parse(row.trades_json  || '[]'),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
