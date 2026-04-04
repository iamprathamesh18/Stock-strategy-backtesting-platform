// ─── Indicators ──────────────────────────────────────────────────────────────

function calcSMA(prices, period) {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const slice = prices.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = new Array(prices.length).fill(null);
  let started = false;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] == null) continue;
    if (!started && i >= period - 1) {
      ema[i] = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      started = true;
    } else if (started) {
      ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
    }
  }
  return ema;
}

function calcRSI(prices, period = 14) {
  const rsi = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return rsi;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss));
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    rsi[i] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss));
  }
  return rsi;
}

// ─── Signal generators ────────────────────────────────────────────────────────
// Each returns signals[]: 1=buy, -1=sell, 0=hold

function signalsFromMA(data, shortPeriod = 50, longPeriod = 200) {
  const closes = data.map(d => d.close);
  const shortMA = calcSMA(closes, shortPeriod);
  const longMA  = calcSMA(closes, longPeriod);
  const signals = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    if (shortMA[i] == null || longMA[i] == null) continue;
    if (shortMA[i] > longMA[i] && shortMA[i-1] <= longMA[i-1]) signals[i] = 1;
    else if (shortMA[i] < longMA[i] && shortMA[i-1] >= longMA[i-1]) signals[i] = -1;
  }
  return { signals, indicators: { shortMA, longMA } };
}

function signalsFromRSI(data, rsiPeriod = 14, oversold = 30, overbought = 70) {
  const closes = data.map(d => d.close);
  const rsi = calcRSI(closes, rsiPeriod);
  const signals = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    if (rsi[i] == null || rsi[i-1] == null) continue;
    if (rsi[i] < oversold  && rsi[i-1] >= oversold)  signals[i] =  1;
    if (rsi[i] > overbought && rsi[i-1] <= overbought) signals[i] = -1;
  }
  return { signals, indicators: { rsi } };
}

function signalsFromBreakout(data, lookback = 20) {
  const highs = data.map(d => d.high);
  const lows  = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const signals = new Array(data.length).fill(0);
  for (let i = lookback; i < data.length; i++) {
    const maxH = Math.max(...highs.slice(i - lookback, i));
    const minL = Math.min(...lows.slice(i - lookback, i));
    if (closes[i] > maxH) signals[i] =  1;
    else if (closes[i] < minL) signals[i] = -1;
  }
  return { signals, indicators: {} };
}

// ─── Built-in strategy router ─────────────────────────────────────────────────

function runBuiltinStrategy(strategyType, data, params = {}) {
  switch (strategyType) {
    case 'moving_average_crossover':
      return signalsFromMA(data, params.shortPeriod || 50, params.longPeriod || 200);
    case 'rsi':
      return signalsFromRSI(data, params.rsiPeriod || 14, params.oversold || 30, params.overbought || 70);
    case 'breakout':
      return signalsFromBreakout(data, params.lookback || 20);
    default:
      throw new Error(`Unknown strategy type: ${strategyType}`);
  }
}

// ─── Custom JSON rule evaluator ───────────────────────────────────────────────

function runCustomStrategy(rulesJson, data) {
  const rules = typeof rulesJson === 'string' ? JSON.parse(rulesJson) : rulesJson;
  const closes  = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  // Pre-compute all indicators referenced in rules
  const indicators = { close: closes, volume: volumes };

  function extractNeeded(node) {
    if (!node) return;
    if (node.type === 'condition') {
      [node.left, node.right].forEach(s => {
        if (!s) return;
        const p = s.params || {};
        const period = p.period || p.value || 14;
        if (s.type === 'sma') indicators[`sma_${period}`] = indicators[`sma_${period}`] || calcSMA(closes, period);
        if (s.type === 'ema') indicators[`ema_${period}`] = indicators[`ema_${period}`] || calcEMA(closes, period);
        if (s.type === 'rsi') indicators[`rsi_${period}`] = indicators[`rsi_${period}`] || calcRSI(closes, period);
      });
    }
    if (node.conditions) node.conditions.forEach(extractNeeded);
    if (node.buyCondition)  extractNeeded(node.buyCondition);
    if (node.sellCondition) extractNeeded(node.sellCondition);
  }
  extractNeeded(rules);

  function getVal(src, i) {
    if (!src) return null;
    const p = src.params || {};
    const period = p.period || p.value || 14;
    switch (src.type) {
      case 'price':  return closes[i];
      case 'volume': return volumes[i];
      case 'sma':    return indicators[`sma_${period}`]?.[i];
      case 'ema':    return indicators[`ema_${period}`]?.[i];
      case 'rsi':    return indicators[`rsi_${period}`]?.[i];
      case 'value':  return parseFloat(period);
      default:       return null;
    }
  }

  function evalNode(node, i) {
    if (!node) return false;
    if (node.type === 'condition') {
      const l = getVal(node.left, i);
      const r = getVal(node.right, i);
      if (l == null || r == null) return false;
      switch (node.operator) {
        case '>':  return l > r;
        case '<':  return l < r;
        case '>=': return l >= r;
        case '<=': return l <= r;
        case '=':  return Math.abs(l - r) < 0.001;
        default:   return false;
      }
    }
    if (node.type === 'and') return (node.conditions || []).every(c => evalNode(c, i));
    if (node.type === 'or')  return (node.conditions || []).some(c  => evalNode(c, i));
    return false;
  }

  const signals = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    if (rules.buyCondition  && evalNode(rules.buyCondition,  i)) signals[i] =  1;
    else if (rules.sellCondition && evalNode(rules.sellCondition, i)) signals[i] = -1;
  }
  return { signals, indicators };
}

// ─── Trade simulator ──────────────────────────────────────────────────────────

function simulateTrades(data, signals, initialCapital = 100000) {
  let cash = initialCapital;
  let shares = 0;
  let entryPrice = 0;
  let entryDate = '';
  const trades = [];
  const equityCurve = [];
  let peakEquity = initialCapital;
  let maxDrawdown = 0;

  for (let i = 0; i < data.length; i++) {
    const price  = data[i].close;
    const equity = cash + shares * price;
    equityCurve.push({ date: data[i].date, equity: parseFloat(equity.toFixed(2)), price });

    if (equity > peakEquity) peakEquity = equity;
    const dd = (peakEquity - equity) / peakEquity;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (signals[i] === 1 && shares === 0 && cash > price) {
      shares = Math.floor(cash / price);
      if (shares > 0) {
        cash -= shares * price;
        entryPrice = price;
        entryDate  = data[i].date;
      }
    } else if (signals[i] === -1 && shares > 0) {
      const saleValue = shares * price;
      const profit    = saleValue - shares * entryPrice;
      cash += saleValue;
      trades.push({
        entryDate, exitDate: data[i].date,
        entryPrice: parseFloat(entryPrice.toFixed(2)),
        exitPrice:  parseFloat(price.toFixed(2)),
        shares,
        profit:    parseFloat(profit.toFixed(2)),
        profitPct: parseFloat(((profit / (shares * entryPrice)) * 100).toFixed(2)),
      });
      shares = 0;
    }
  }

  // Close open position at last bar
  if (shares > 0) {
    const lastPrice = data[data.length - 1].close;
    const profit    = shares * (lastPrice - entryPrice);
    cash += shares * lastPrice;
    trades.push({
      entryDate, exitDate: data[data.length - 1].date,
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      exitPrice:  parseFloat(lastPrice.toFixed(2)),
      shares,
      profit:    parseFloat(profit.toFixed(2)),
      profitPct: parseFloat(((profit / (shares * entryPrice)) * 100).toFixed(2)),
      open: true,
    });
    shares = 0;
  }

  const totalProfit    = cash - initialCapital;
  const totalProfitPct = (totalProfit / initialCapital) * 100;
  const winning        = trades.filter(t => t.profit > 0);
  const winRate        = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;

  // Annualised Sharpe
  const returns = equityCurve.slice(1).map((e, i) =>
    equityCurve[i].equity > 0 ? (e.equity - equityCurve[i].equity) / equityCurve[i].equity : 0
  );
  const avgR  = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const stdR  = Math.sqrt(returns.reduce((a, r) => a + (r - avgR) ** 2, 0) / (returns.length || 1));
  const sharpeRatio = stdR > 0 ? (avgR / stdR) * Math.sqrt(252) : 0;

  return {
    totalProfit:    parseFloat(totalProfit.toFixed(2)),
    totalProfitPct: parseFloat(totalProfitPct.toFixed(2)),
    maxDrawdown:    parseFloat((maxDrawdown * 100).toFixed(2)),
    sharpeRatio:    parseFloat(sharpeRatio.toFixed(3)),
    winRate:        parseFloat(winRate.toFixed(2)),
    numTrades:      trades.length,
    finalEquity:    parseFloat(cash.toFixed(2)),
    trades,
    equityCurve,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  runBuiltinStrategy,
  runCustomStrategy,
  simulateTrades,
  calcSMA,
  calcEMA,
  calcRSI,
};
