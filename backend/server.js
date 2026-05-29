require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ── CORS
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// ── Body Parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Trust Proxy (for cPanel/Nginx reverse proxy)
app.set('trust proxy', 1);

// ── Global Rate Limit on API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // Relaxed limit to prevent proxy IP blocks
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1';
  }
});
app.use('/api', apiLimiter);

// ── Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// ── Serve Admin Panel
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'dashboard.html')));

// ── Serve Images
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// ── Serve Frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', project: 'Codename Green Gold Nerul', time: new Date() }));

// ── Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🏡 Codename Green Gold Nerul Server`);
  console.log(`✅ Running on port ${PORT}`);
  console.log(`🌐 Site: http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin\n`);
});

module.exports = app;
