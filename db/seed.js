require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function parseFrontmatter(text) {
  const fm = {};
  let body = text;
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end !== -1) {
      text.slice(3, end).trim().split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > -1) {
          fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
        }
      });
      body = text.slice(end + 3).trim();
    }
  }
  return { ...fm, body };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seed() {
  // Admin user
  const { rows: userRows } = await query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(userRows[0].count, 10);
  if (userCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'Admin1234!';
    const hashed = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, hashed, 'admin']
    );
    console.log(`Created admin user: ${username}`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  // Categories
  const cats = [
    { name: 'Kuzatuv',    slug: 'kuzatuv',    section: 'fikrlar' },
    { name: 'Marketing',  slug: 'marketing',  section: 'fikrlar' },
    { name: 'Brendlash',  slug: 'brendlash',  section: 'fikrlar' },
    { name: 'Shahar',     slug: 'shahar',     section: 'rasmlar' },
    { name: 'Tabiat',     slug: 'tabiat',     section: 'rasmlar' },
    { name: 'Odamlar',    slug: 'odamlar',    section: 'rasmlar' },
    { name: 'Loyiha',     slug: 'loyiha',     section: 'ishlar'  },
    { name: 'Konsalting', slug: 'konsalting', section: 'ishlar'  },
  ];
  for (const cat of cats) {
    await query(
      'INSERT INTO categories (name, slug, section) VALUES ($1, $2, $3) ON CONFLICT (slug, section) DO NOTHING',
      [cat.name, cat.slug, cat.section]
    );
  }
  console.log('Categories seeded.');

  // Posts from .md files
  const sections = ['fikrlar', 'ishlar', 'rasmlar'];
  let count = 0;
  for (const section of sections) {
    const dir = path.join(__dirname, '..', 'posts', section);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      const parsed = parseFrontmatter(text);
      if (!parsed.title) continue;
      const slug = parsed.slug || slugify(parsed.title) || file.replace('.md', '');
      await query(
        `INSERT INTO posts (title, slug, description, body, section, category, role, tags, image, date, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)
         ON CONFLICT (slug) DO NOTHING`,
        [
          parsed.title,
          slug,
          parsed.description || '',
          parsed.body || '',
          section,
          parsed.category || null,
          parsed.role || null,
          parsed.tags || null,
          parsed.image || null,
          parsed.date || null,
        ]
      );
      count++;
    }
  }
  console.log(`Seeded ${count} posts from markdown files.`);
  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
