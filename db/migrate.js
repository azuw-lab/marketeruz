require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function migrate() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.log('DATABASE_URL yoki POSTGRES_URL topilmadi — SQLite ishlatilmoqda (lokal dev). Migration shart emas.');
    process.exit(0);
  }

  const { query } = require('./database');

  console.log('Running migrations on PostgreSQL...');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('  users table OK');

  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      section TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(slug, section)
    )
  `);
  console.log('  categories table OK');

  await query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      body TEXT,
      section TEXT NOT NULL,
      category TEXT,
      role TEXT,
      tags TEXT,
      image TEXT,
      date TEXT,
      published INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('  posts table OK');

  await query(`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT,
      url TEXT NOT NULL,
      public_id TEXT,
      post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('  images table OK');

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
