const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'stocks.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

// All Nifty 50 tickers + index
const TICKER_SEEDS = [
  ['^NSEI',         'Nifty 50 Index',               'NSE'],
  ['ADANIENT.NS',   'Adani Enterprises',             'NSE'],
  ['ADANIPORTS.NS', 'Adani Ports',                   'NSE'],
  ['APOLLOHOSP.NS', 'Apollo Hospitals',              'NSE'],
  ['ASIANPAINT.NS', 'Asian Paints',                  'NSE'],
  ['AXISBANK.NS',   'Axis Bank',                     'NSE'],
  ['BAJAJ-AUTO.NS', 'Bajaj Auto',                    'NSE'],
  ['BAJFINANCE.NS', 'Bajaj Finance',                 'NSE'],
  ['BAJAJFINSV.NS', 'Bajaj Finserv',                 'NSE'],
  ['BPCL.NS',       'Bharat Petroleum',              'NSE'],
  ['BHARTIARTL.NS', 'Bharti Airtel',                 'NSE'],
  ['BRITANNIA.NS',  'Britannia Industries',          'NSE'],
  ['CIPLA.NS',      'Cipla',                         'NSE'],
  ['COALINDIA.NS',  'Coal India',                    'NSE'],
  ['DIVISLAB.NS',   "Divi's Laboratories",           'NSE'],
  ['DRREDDY.NS',    "Dr. Reddy's Laboratories",      'NSE'],
  ['EICHERMOT.NS',  'Eicher Motors',                 'NSE'],
  ['GRASIM.NS',     'Grasim Industries',             'NSE'],
  ['HCLTECH.NS',    'HCL Technologies',              'NSE'],
  ['HDFCBANK.NS',   'HDFC Bank',                     'NSE'],
  ['HDFCLIFE.NS',   'HDFC Life Insurance',           'NSE'],
  ['HEROMOTOCO.NS', 'Hero MotoCorp',                 'NSE'],
  ['HINDALCO.NS',   'Hindalco Industries',           'NSE'],
  ['HINDUNILVR.NS', 'Hindustan Unilever',            'NSE'],
  ['ICICIBANK.NS',  'ICICI Bank',                    'NSE'],
  ['INDUSINDBK.NS', 'IndusInd Bank',                 'NSE'],
  ['INFY.NS',       'Infosys',                       'NSE'],
  ['ITC.NS',        'ITC',                           'NSE'],
  ['JSWSTEEL.NS',   'JSW Steel',                     'NSE'],
  ['KOTAKBANK.NS',  'Kotak Mahindra Bank',           'NSE'],
  ['LT.NS',         'Larsen & Toubro',               'NSE'],
  ['M&M.NS',        'Mahindra & Mahindra',           'NSE'],
  ['MARUTI.NS',     'Maruti Suzuki',                 'NSE'],
  ['NESTLEIND.NS',  'Nestle India',                  'NSE'],
  ['NTPC.NS',       'NTPC',                          'NSE'],
  ['ONGC.NS',       'Oil & Natural Gas Corp',        'NSE'],
  ['POWERGRID.NS',  'Power Grid Corporation',        'NSE'],
  ['RELIANCE.NS',   'Reliance Industries',           'NSE'],
  ['SBILIFE.NS',    'SBI Life Insurance',            'NSE'],
  ['SBIN.NS',       'State Bank of India',           'NSE'],
  ['SUNPHARMA.NS',  'Sun Pharmaceutical',            'NSE'],
  ['TCS.NS',        'Tata Consultancy Services',     'NSE'],
  ['TATACONSUM.NS', 'Tata Consumer Products',        'NSE'],
  ['TATAMOTORS.NS', 'Tata Motors',                   'NSE'],
  ['TATASTEEL.NS',  'Tata Steel',                    'NSE'],
  ['TECHM.NS',      'Tech Mahindra',                 'NSE'],
  ['TITAN.NS',      'Titan Company',                 'NSE'],
  ['TRENT.NS',      'Trent',                         'NSE'],
  ['ULTRACEMCO.NS', 'UltraTech Cement',              'NSE'],
  ['WIPRO.NS',      'Wipro',                         'NSE'],
  // US Stocks
  ['AAPL',          'Apple Inc.',                    'NASDAQ'],
  ['MSFT',          'Microsoft Corp.',               'NASDAQ'],
  ['GOOGL',         'Alphabet Inc.',                 'NASDAQ'],
];

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');

    db.runAsync = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });

    db.getAsync = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    db.allAsync = (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.execAsync = (sql) => new Promise((resolve, reject) => {
      db.exec(sql, (err) => { if (err) reject(err); else resolve(); });
    });

    initSchema();
  }
  return db;
}

function initSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL, high REAL, low REAL, close REAL, volume INTEGER,
      UNIQUE(ticker, date)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_stocks_ticker_date ON stocks(ticker, date)`);

    db.run(`CREATE TABLE IF NOT EXISTS strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      strategy_name TEXT NOT NULL,
      strategy_type TEXT NOT NULL DEFAULT 'custom',
      rules_json TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS backtest_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      strategy_id INTEGER,
      strategy_name TEXT,
      ticker TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      profit REAL, profit_pct REAL, max_drawdown REAL,
      sharpe_ratio REAL, win_rate REAL, num_trades INTEGER,
      equity_curve TEXT, trades_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL, message TEXT NOT NULL, meta TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tickers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT UNIQUE NOT NULL, name TEXT, exchange TEXT,
      active INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed all Nifty 50 + US tickers
    const stmt = db.prepare('INSERT OR IGNORE INTO tickers (ticker, name, exchange) VALUES (?, ?, ?)');
    TICKER_SEEDS.forEach(s => stmt.run(s));
    stmt.finalize();

    // Seed admin user
    db.get('SELECT id FROM users WHERE role = ?', ['admin'], (err, row) => {
      if (!row) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run('INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          ['admin', 'admin@stockbacktest.com', hash, 'admin']);
      }
    });
  });
}

module.exports = { getDb };
