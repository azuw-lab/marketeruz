#!/usr/bin/env node
// build.js — Netlify deploy paytida ishga tushadi
// Har bir posts/ papkasidagi .md fayllar ro'yxatini index.json sifatida saqlaydi

const fs = require('fs');
const path = require('path');

const sections = ['fikrlar', 'ishlar', 'rasmlar'];

sections.forEach(section => {
  const dir = path.join(__dirname, 'posts', section);
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => `/posts/${section}/${f}`);

  fs.writeFileSync(
    path.join(dir, 'index.json'),
    JSON.stringify(files, null, 2)
  );
  console.log(`✓ ${section}: ${files.length} ta post`);
});

console.log('Build tayyor!');
