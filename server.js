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

// Setup endpoint — production DB da migration + seed yugurtirish
app.post('/api/setup', async (req, res) => {
  if (req.headers['x-setup-key'] !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { query } = require('./db/database');
    const bcrypt = require('bcryptjs');
    const fs = require('fs');
    const path = require('path');

    // 1. Jadvallar yaratish
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, role TEXT DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL,
        slug TEXT NOT NULL, section TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(), UNIQUE(slug, section)
      );
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL, description TEXT, body TEXT,
        section TEXT NOT NULL, category TEXT, role TEXT,
        tags TEXT, image TEXT, date TEXT, published INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY, filename TEXT NOT NULL,
        original_name TEXT, url TEXT NOT NULL, public_id TEXT,
        post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Admin user
    const { rows: users } = await query('SELECT COUNT(*) as c FROM users');
    if (parseInt(users[0].c) === 0) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin1234!', 10);
      await query('INSERT INTO users (username, password, role) VALUES ($1,$2,$3)',
        [process.env.ADMIN_USERNAME || 'admin', hashed, 'admin']);
    }

    // 3. Kategoriyalar
    const cats = [
      ['Kuzatuv','kuzatuv','fikrlar'],['Marketing','marketing','fikrlar'],
      ['Brendlash','brendlash','fikrlar'],['Shahar','shahar','rasmlar'],
      ['Tabiat','tabiat','rasmlar'],['Odamlar','odamlar','rasmlar'],
      ['Loyiha','loyiha','ishlar'],['Konsalting','konsalting','ishlar'],
    ];
    for (const [name, slug, section] of cats) {
      await query('INSERT INTO categories (name,slug,section) VALUES ($1,$2,$3) ON CONFLICT (slug,section) DO NOTHING',
        [name, slug, section]);
    }

    // 4. Mavjud postlarni seed qilish
    function parseFM(text) {
      const fm = {}; let body = text;
      if (text.startsWith('---')) {
        const end = text.indexOf('---', 3);
        if (end !== -1) {
          text.slice(3, end).trim().split('\n').forEach(l => {
            const i = l.indexOf(':');
            if (i > -1) fm[l.slice(0,i).trim()] = l.slice(i+1).trim().replace(/^"|"$/g,'');
          });
          body = text.slice(end+3).trim();
        }
      }
      return { ...fm, body };
    }
    function slugify(t) { return t.toLowerCase().replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/^-+|-+$/g,''); }

    let seeded = 0;
    for (const section of ['fikrlar','ishlar','rasmlar']) {
      const dir = path.join(__dirname, 'posts', section);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
        const p = parseFM(fs.readFileSync(path.join(dir,f),'utf8'));
        if (!p.title) continue;
        const slug = slugify(p.title) + '-' + Date.now();
        await query(`INSERT INTO posts (title,slug,description,body,section,category,role,tags,image,date,published)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1) ON CONFLICT (slug) DO NOTHING`,
          [p.title, slug, p.description||'', p.body||'', section, p.category||null, p.role||null, p.tags||null, p.image||null, p.date||null]);
        seeded++;
      }
    }

    const { rows: [{ c: postCount }] } = await query('SELECT COUNT(*) as c FROM posts');
    res.json({ ok: true, tables: 'created', admin: 'seeded', posts: postCount });
  } catch(e) {
    res.status(500).json({ error: e.message });
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
