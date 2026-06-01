require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// Security headers (relax CSP for admin panel CDN resources)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// Static uploads — only serve locally (on Vercel, images are on Cloudinary)
if (process.env.NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
}

app.use(express.static(path.join(__dirname, 'public')));

// Debug endpoint — qaysi database ishlatilayotganini ko'rish uchun
app.get('/api/debug-db', async (req, res) => {
  try {
    const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
    let host = 'unknown';
    try { host = new URL(PG_URL).hostname; } catch {}
    const { query } = require('./db/database');
    const r = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    res.json({
      db_host: host,
      db_url_start: PG_URL.substring(0, 40) + '...',
      tables: r.rows.map(x => x.table_name),
    });
  } catch(e) {
    res.status(500).json({ error: e.message, db_host: (() => { try { return new URL(process.env.DATABASE_URL||'').hostname; } catch { return 'parse_error'; } })() });
  }
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/upload')); // for /api/images routes

// Admin panel
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// Public site
app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  res.sendFile(fs.existsSync(publicIndex) ? publicIndex : rootIndex);
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fayl hajmi katta. Maksimum 10MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message?.includes('Faqat rasm')) {
    return res.status(400).json({ error: err.message || 'Noto\'g\'ri fayl turi' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err.stack || err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message,
  });
});

// Export for Vercel serverless OR start local server
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`marketeruz running on http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
  });
  module.exports = app;
}
