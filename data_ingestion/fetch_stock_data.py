#!/usr/bin/env python3
"""
Stock Data Ingestion Script - Nifty 50 + Index
Fetches historical stock data from Yahoo Finance and stores in SQLite DB.
Usage: python fetch_stock_data.py [--tickers TICKER1 TICKER2 ...] [--start YYYY-MM-DD]
"""

import yfinance as yf
import sqlite3
import pandas as pd
import os
import sys
import argparse
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ─── All Nifty 50 constituents (Yahoo Finance tickers) ───────────────────────
NIFTY50_TICKERS = [
    # Index itself
    "^NSEI",           # Nifty 50 Index

    # Nifty 50 Stocks
    "ADANIENT.NS",     # Adani Enterprises
    "ADANIPORTS.NS",   # Adani Ports
    "APOLLOHOSP.NS",   # Apollo Hospitals
    "ASIANPAINT.NS",   # Asian Paints
    "AXISBANK.NS",     # Axis Bank
    "BAJAJ-AUTO.NS",   # Bajaj Auto
    "BAJFINANCE.NS",   # Bajaj Finance
    "BAJAJFINSV.NS",   # Bajaj Finserv
    "BPCL.NS",         # Bharat Petroleum
    "BHARTIARTL.NS",   # Bharti Airtel
    "BRITANNIA.NS",    # Britannia Industries
    "CIPLA.NS",        # Cipla
    "COALINDIA.NS",    # Coal India
    "DIVISLAB.NS",     # Divi's Laboratories
    "DRREDDY.NS",      # Dr. Reddy's Laboratories
    "EICHERMOT.NS",    # Eicher Motors
    "GRASIM.NS",       # Grasim Industries
    "HCLTECH.NS",      # HCL Technologies
    "HDFCBANK.NS",     # HDFC Bank
    "HDFCLIFE.NS",     # HDFC Life Insurance
    "HEROMOTOCO.NS",   # Hero MotoCorp
    "HINDALCO.NS",     # Hindalco Industries
    "HINDUNILVR.NS",   # Hindustan Unilever
    "ICICIBANK.NS",    # ICICI Bank
    "INDUSINDBK.NS",   # IndusInd Bank
    "INFY.NS",         # Infosys
    "ITC.NS",          # ITC
    "JSWSTEEL.NS",     # JSW Steel
    "KOTAKBANK.NS",    # Kotak Mahindra Bank
    "LT.NS",           # Larsen & Toubro
    "M&M.NS",          # Mahindra & Mahindra
    "MARUTI.NS",       # Maruti Suzuki
    "NESTLEIND.NS",    # Nestle India
    "NTPC.NS",         # NTPC
    "ONGC.NS",         # Oil & Natural Gas Corp
    "POWERGRID.NS",    # Power Grid Corporation
    "RELIANCE.NS",     # Reliance Industries
    "SBILIFE.NS",      # SBI Life Insurance
    "SBIN.NS",         # State Bank of India
    "SUNPHARMA.NS",    # Sun Pharmaceutical
    "TCS.NS",          # Tata Consultancy Services
    "TATACONSUM.NS",   # Tata Consumer Products
    "TATAMOTORS.NS",   # Tata Motors
    "TATASTEEL.NS",    # Tata Steel
    "TECHM.NS",        # Tech Mahindra
    "TITAN.NS",        # Titan Company
    "TRENT.NS",        # Trent
    "ULTRACEMCO.NS",   # UltraTech Cement
    "WIPRO.NS",        # Wipro
]

DB_PATH = os.environ.get(
    "DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "backend", "data", "stocks.db")
)


def ensure_db_schema(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL, high REAL, low REAL, close REAL, volume INTEGER,
            UNIQUE(ticker, date)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_stocks_ticker_date ON stocks(ticker, date)")
    conn.commit()
    logger.info("Database schema verified.")


def ensure_tickers_table(conn):
    """Insert all Nifty 50 tickers into the tickers table if not present."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tickers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT UNIQUE NOT NULL,
            name TEXT, exchange TEXT,
            active INTEGER DEFAULT 1,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    TICKER_META = {
        "^NSEI":          ("Nifty 50 Index",              "NSE"),
        "ADANIENT.NS":    ("Adani Enterprises",            "NSE"),
        "ADANIPORTS.NS":  ("Adani Ports",                  "NSE"),
        "APOLLOHOSP.NS":  ("Apollo Hospitals",             "NSE"),
        "ASIANPAINT.NS":  ("Asian Paints",                 "NSE"),
        "AXISBANK.NS":    ("Axis Bank",                    "NSE"),
        "BAJAJ-AUTO.NS":  ("Bajaj Auto",                   "NSE"),
        "BAJFINANCE.NS":  ("Bajaj Finance",                "NSE"),
        "BAJAJFINSV.NS":  ("Bajaj Finserv",                "NSE"),
        "BPCL.NS":        ("Bharat Petroleum",             "NSE"),
        "BHARTIARTL.NS":  ("Bharti Airtel",                "NSE"),
        "BRITANNIA.NS":   ("Britannia Industries",         "NSE"),
        "CIPLA.NS":       ("Cipla",                        "NSE"),
        "COALINDIA.NS":   ("Coal India",                   "NSE"),
        "DIVISLAB.NS":    ("Divi's Laboratories",          "NSE"),
        "DRREDDY.NS":     ("Dr. Reddy's Laboratories",     "NSE"),
        "EICHERMOT.NS":   ("Eicher Motors",                "NSE"),
        "GRASIM.NS":      ("Grasim Industries",            "NSE"),
        "HCLTECH.NS":     ("HCL Technologies",             "NSE"),
        "HDFCBANK.NS":    ("HDFC Bank",                    "NSE"),
        "HDFCLIFE.NS":    ("HDFC Life Insurance",          "NSE"),
        "HEROMOTOCO.NS":  ("Hero MotoCorp",                "NSE"),
        "HINDALCO.NS":    ("Hindalco Industries",          "NSE"),
        "HINDUNILVR.NS":  ("Hindustan Unilever",           "NSE"),
        "ICICIBANK.NS":   ("ICICI Bank",                   "NSE"),
        "INDUSINDBK.NS":  ("IndusInd Bank",                "NSE"),
        "INFY.NS":        ("Infosys",                      "NSE"),
        "ITC.NS":         ("ITC",                          "NSE"),
        "JSWSTEEL.NS":    ("JSW Steel",                    "NSE"),
        "KOTAKBANK.NS":   ("Kotak Mahindra Bank",          "NSE"),
        "LT.NS":          ("Larsen & Toubro",              "NSE"),
        "M&M.NS":         ("Mahindra & Mahindra",          "NSE"),
        "MARUTI.NS":      ("Maruti Suzuki",                "NSE"),
        "NESTLEIND.NS":   ("Nestle India",                 "NSE"),
        "NTPC.NS":        ("NTPC",                         "NSE"),
        "ONGC.NS":        ("Oil & Natural Gas Corp",       "NSE"),
        "POWERGRID.NS":   ("Power Grid Corporation",       "NSE"),
        "RELIANCE.NS":    ("Reliance Industries",          "NSE"),
        "SBILIFE.NS":     ("SBI Life Insurance",           "NSE"),
        "SBIN.NS":        ("State Bank of India",          "NSE"),
        "SUNPHARMA.NS":   ("Sun Pharmaceutical",           "NSE"),
        "TCS.NS":         ("Tata Consultancy Services",    "NSE"),
        "TATACONSUM.NS":  ("Tata Consumer Products",       "NSE"),
        "TATAMOTORS.NS":  ("Tata Motors",                  "NSE"),
        "TATASTEEL.NS":   ("Tata Steel",                   "NSE"),
        "TECHM.NS":       ("Tech Mahindra",                "NSE"),
        "TITAN.NS":       ("Titan Company",                "NSE"),
        "TRENT.NS":       ("Trent",                        "NSE"),
        "ULTRACEMCO.NS":  ("UltraTech Cement",             "NSE"),
        "WIPRO.NS":       ("Wipro",                        "NSE"),
        "AAPL":           ("Apple Inc.",                   "NASDAQ"),
        "MSFT":           ("Microsoft Corp.",              "NASDAQ"),
        "GOOGL":          ("Alphabet Inc.",                "NASDAQ"),
    }

    for ticker, (name, exchange) in TICKER_META.items():
        conn.execute(
            "INSERT OR IGNORE INTO tickers (ticker, name, exchange) VALUES (?, ?, ?)",
            (ticker, name, exchange)
        )
    conn.commit()
    logger.info(f"Ticker metadata seeded ({len(TICKER_META)} tickers).")


def clean_dataframe(df, ticker):
    df = df.reset_index()

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(filter(None, [str(c) for c in col])).strip() for col in df.columns.values]
        col_map = {}
        for col in df.columns:
            lower = col.lower()
            if 'date' in lower or 'datetime' in lower:
                col_map[col] = 'Date'
            elif lower.startswith('open'):
                col_map[col] = 'Open'
            elif lower.startswith('high'):
                col_map[col] = 'High'
            elif lower.startswith('low'):
                col_map[col] = 'Low'
            elif lower.startswith('close') and 'adj' not in lower:
                col_map[col] = 'Close'
            elif lower.startswith('volume'):
                col_map[col] = 'Volume'
        df = df.rename(columns=col_map)

    required = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
    available = [c for c in required if c in df.columns]
    if 'Date' not in available:
        logger.error(f"No Date column for {ticker}. Columns: {list(df.columns)}")
        return None

    df = df[available].copy()
    df['ticker'] = ticker
    df = df.rename(columns={
        'Date': 'date', 'Open': 'open', 'High': 'high',
        'Low': 'low', 'Close': 'close', 'Volume': 'volume'
    })

    df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
    df = df.dropna(subset=['close'])
    df = df[df['close'] > 0]
    if 'volume' in df.columns:
        df['volume'] = df['volume'].fillna(0).astype(int)

    return df[['ticker', 'date', 'open', 'high', 'low', 'close', 'volume']]


def fetch_and_store(ticker, start_date, conn):
    logger.info(f"  Fetching {ticker} ...")
    try:
        raw = yf.download(ticker, start=start_date, progress=False, auto_adjust=True)
        if raw.empty:
            logger.warning(f"  ⚠  No data returned for {ticker}")
            return 0

        df = clean_dataframe(raw, ticker)
        if df is None or df.empty:
            logger.warning(f"  ⚠  Empty after cleaning for {ticker}")
            return 0

        inserted = 0
        cursor = conn.cursor()
        for _, row in df.iterrows():
            try:
                cursor.execute(
                    "INSERT OR IGNORE INTO stocks (ticker,date,open,high,low,close,volume) VALUES (?,?,?,?,?,?,?)",
                    (row['ticker'], row['date'], row.get('open'), row.get('high'),
                     row.get('low'), row['close'], row.get('volume', 0))
                )
                if cursor.rowcount > 0:
                    inserted += 1
            except Exception as e:
                logger.debug(f"Row error {ticker} {row.get('date')}: {e}")

        conn.commit()
        logger.info(f"  ✓  {ticker}: {inserted} new rows  (total in df: {len(df)})")
        return inserted

    except Exception as e:
        logger.error(f"  ✗  Error fetching {ticker}: {e}")
        return 0


def main():
    parser = argparse.ArgumentParser(description='Fetch Nifty 50 stock data into SQLite')
    parser.add_argument('--tickers', nargs='+', default=NIFTY50_TICKERS,
                        help='Override ticker list')
    parser.add_argument('--start', default='2000-01-01', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--db', default=DB_PATH, help='Path to SQLite database')
    args = parser.parse_args()

    db_dir = os.path.dirname(args.db)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    logger.info(f"Database : {args.db}")
    logger.info(f"Tickers  : {len(args.tickers)}")
    logger.info(f"Start    : {args.start}")
    logger.info("=" * 55)

    conn = sqlite3.connect(args.db)
    ensure_db_schema(conn)
    ensure_tickers_table(conn)

    total_inserted = 0
    failed = []

    for i, ticker in enumerate(args.tickers, 1):
        logger.info(f"[{i}/{len(args.tickers)}] {ticker}")
        count = fetch_and_store(ticker, args.start, conn)
        total_inserted += count
        if count == 0:
            failed.append(ticker)

    conn.close()

    logger.info("=" * 55)
    logger.info(f"✅ Done! {total_inserted} total rows inserted.")
    logger.info(f"   Tickers succeeded : {len(args.tickers) - len(failed)}")
    if failed:
        logger.warning(f"   Failed / empty    : {failed}")
    logger.info(f"   Database          : {args.db}")
    logger.info("=" * 55)


if __name__ == "__main__":
    main()
