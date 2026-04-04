require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Init DB on startup
getDb();

app.use('/auth', require('./routes/auth'));
app.use('/stocks', require('./routes/stocks'));
app.use('/strategy', require('./routes/strategy'));
app.use('/backtest', require('./routes/backtest'));
app.use('/admin', require('./routes/admin'));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`\n✅ Backend running on http://localhost:${PORT}\n`));
module.exports = app;
