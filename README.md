# Stock Strategy Backtesting Platform

A full-stack platform for backtesting trading strategies against historical stock data. No CSV uploads required — data is pre-loaded via an automated Python ingestion script.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  React + Chart.js + Tailwind (port 3000)                │
│  Pages: Dashboard, Backtest, Strategies, History, Admin  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / REST API
┌───────────────────────▼─────────────────────────────────┐
│                       BACKEND                           │
│  Node.js + Express (port 5000)                          │
│  JWT Auth · Role-based Access · Strategy Engine         │
└───────────────────────┬─────────────────────────────────┘
                        │ better-sqlite3
┌───────────────────────▼─────────────────────────────────┐
│                      DATABASE                           │
│  SQLite (stocks.db)  →  Swappable to PostgreSQL         │
│  Tables: users, stocks, tickers, strategies,            │
│          backtest_results, system_logs                  │
└─────────────────────────────────────────────────────────┘
                        ▲
┌───────────────────────┴─────────────────────────────────┐
│                DATA INGESTION (Python)                  │
│  data_ingestion/fetch_stock_data.py                     │
│  yfinance → Clean → SQLite insert                       │
│  Tickers: RELIANCE.NS, TCS.NS, INFY.NS, HDFCBANK.NS,   │
│           AAPL, GOOGL, MSFT, TSLA, AMZN, META          │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Login name |
| email | TEXT UNIQUE | Email address |
| password | TEXT | bcrypt hashed |
| role | TEXT | 'user' or 'admin' |
| created_at | DATETIME | Timestamp |

### `stocks`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| ticker | TEXT | e.g. RELIANCE.NS |
| date | TEXT | YYYY-MM-DD |
| open | REAL | Opening price |
| high | REAL | Daily high |
| low | REAL | Daily low |
| close | REAL | Closing price |
| volume | INTEGER | Trading volume |

### `strategies`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Owner user |
| strategy_name | TEXT | Display name |
| strategy_type | TEXT | 'builtin' or 'custom' |
| rules_json | TEXT | JSON array of rules |
| description | TEXT | Optional description |
| created_at | DATETIME | Timestamp |

### `backtest_results`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Who ran it |
| strategy_id | INTEGER FK | Nullable |
| ticker | TEXT | Stock tested |
| start_date | TEXT | Backtest start |
| end_date | TEXT | Backtest end |
| profit | REAL | % total return |
| max_drawdown | REAL | % max drawdown |
| sharpe_ratio | REAL | Risk-adjusted return |
| win_rate | REAL | % winning trades |
| num_trades | INTEGER | Total trades |
| equity_curve_json | TEXT | JSON array |
| trades_json | TEXT | JSON array |
| created_at | DATETIME | Timestamp |

### `system_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| level | TEXT | info/warn/error |
| message | TEXT | Log message |
| meta | TEXT | JSON metadata |
| created_at | DATETIME | Timestamp |

---

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |

**Register payload:**
```json
{ "username": "trader", "email": "trader@test.com", "password": "pass123", "role": "user" }
```

### Stocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stocks?ticker=AAPL&start=2022-01-01&end=2023-01-01` | Get OHLCV data |
| GET | `/stocks/tickers` | List all tickers |
| GET | `/stocks/summary?ticker=AAPL` | Get ticker stats |
| POST | `/stocks/tickers` | Add ticker (Admin) |
| DELETE | `/stocks/tickers/:symbol` | Remove ticker (Admin) |

### Strategies
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/strategy/create` | Create custom strategy |
| GET | `/strategy/list` | List user's strategies |
| GET | `/strategy/:id` | Get single strategy |
| DELETE | `/strategy/:id` | Delete strategy |

**Create strategy payload:**
```json
{
  "strategy_name": "Golden Cross",
  "strategy_type": "custom",
  "rules_json": [
    {
      "action": "BUY",
      "left_indicator": "Moving Average", "left_period": "50",
      "operator": ">",
      "right_indicator": "Moving Average", "right_period": "200",
      "logic": "AND"
    },
    {
      "action": "BUY",
      "left_indicator": "RSI", "left_period": "14",
      "operator": "<",
      "use_value": true, "right_value": "30",
      "logic": "AND"
    }
  ]
}
```

### Backtesting
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backtest/run` | Run a backtest |
| GET | `/backtest/history` | Get user's backtest history |
| GET | `/backtest/:id` | Get specific result |

**Run backtest payload:**
```json
{
  "ticker": "AAPL",
  "start_date": "2020-01-01",
  "end_date": "2024-01-01",
  "strategy_type": "moving_average_crossover",
  "params": { "shortPeriod": 50, "longPeriod": 200 }
}
```

Built-in `strategy_type` values: `moving_average_crossover`, `rsi`, `breakout`

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | System statistics |
| GET | `/admin/logs` | System logs |
| GET | `/admin/users` | All users |
| POST | `/admin/seed-demo` | Seed synthetic data |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker (optional)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env: set JWT_SECRET to a secure random string

npm install
npm start
# Backend runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
# Frontend runs on http://localhost:3000
```

### 3. Data Ingestion (Python)

```bash
cd data_ingestion
pip install -r requirements.txt

# Ingest default tickers (RELIANCE.NS, TCS.NS, INFY.NS, HDFCBANK.NS, AAPL, GOOGL, ...)
python fetch_stock_data.py

# Or specify custom tickers
python fetch_stock_data.py TSLA NVDA AMD
```

### 4. Create Admin User

Register via the UI or API, selecting role=admin:
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@test.com","password":"password123","role":"admin"}'
```

After logging in as admin, navigate to **Admin Panel → Seed Demo Data** to immediately start backtesting with synthetic data while the Python script runs.

---

## Docker Usage

### Quick Start
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Run Ingestion Script in Docker
```bash
docker run --rm \
  -v $(pwd)/backend/stocks.db:/data/stocks.db \
  -e DB_PATH=/data/stocks.db \
  python:3.11-slim bash -c "pip install yfinance pandas && python /app/fetch_stock_data.py"
```

---

## Built-in Strategies

| Strategy | Logic | Parameters |
|----------|-------|------------|
| **Moving Average Crossover** | Buy when short MA crosses above long MA; sell when it crosses below | `shortPeriod` (default 50), `longPeriod` (default 200) |
| **RSI Strategy** | Buy when RSI crosses below oversold; sell when it crosses above overbought | `rsiPeriod` (14), `oversold` (30), `overbought` (70) |
| **Breakout Strategy** | Buy when price breaks N-day high; sell when it breaks N-day low | `lookback` (default 20) |

---

## Custom Strategy builder

The **Strategy Builder** UI allows defining IF-THEN rules visually:

**Example — Golden Cross + RSI:**
```
BUY  IF  Moving Average(50)  >  Moving Average(200)  AND
BUY  IF  RSI(14)  <  30

SELL IF  Moving Average(50)  <  Moving Average(200)  OR
SELL IF  RSI(14)  >  70
```

Supported indicators: `Moving Average`, `RSI`, `Price`, `Volume`, `Open`, `High`, `Low`
Operators: `>`, `<`, `>=`, `<=`, `=`

---

## Switching to PostgreSQL

The backend uses `better-sqlite3`. To switch to PostgreSQL:

1. Install pg: `npm install pg`
2. Replace `db.js` with a PostgreSQL connection using `pg.Pool`
3. Update SQL syntax where needed (e.g. `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`)
4. Set `DATABASE_URL` environment variable


