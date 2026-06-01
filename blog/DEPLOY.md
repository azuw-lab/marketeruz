# Blogni ishga tushirish — qadam-baqadam

## 1. GitHub repo yaratish

1. [github.com](https://github.com) ga kiring (hisob yo'q bo'lsa, ro'yxatdan o'ting)
2. "New repository" bosing
3. Nom: `my-blog` (yoki xohlaganingiz)
4. Public qiling → "Create repository"

## 2. Fayllarni GitHub ga yuklash

Terminalda (Mac):

```bash
cd ~/Downloads/marketeruz/blog
npm install
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/SIZNING_USERNAME/my-blog.git
git push -u origin main
```

> `SIZNING_USERNAME` o'rniga GitHub username ingizni yozing

## 3. Vercel ga ulash

1. [vercel.com](https://vercel.com) ga kiring → "Sign up with GitHub"
2. "Add New Project" bosing
3. GitHub repo ni tanlang (`my-blog`)
4. "Deploy" bosing — tayyor!

Vercel sizga bepul domen beradi: `my-blog.vercel.app`

---

## Yangi post yozish (telefon yoki Mac dan)

### Telefon/Mac — GitHub orqali:

1. [github.com](https://github.com) ga kiring
2. `my-blog` → `posts` papkasiga kiring
3. "Add file" → "Create new file"
4. Fayl nomi: `yangi-post.md`
5. Quyidagi formatda yozing:

```markdown
---
title: "Post sarlavhasi"
date: "2026-06-01"
excerpt: "Qisqacha tavsif"
tags: ["tag1", "tag2"]
---

Maqola matni shu yerda...
```

6. "Commit changes" bosing
7. 1-2 daqiqada Vercel avtomatik yangilanadi ✅

---

## Saytni sozlash

- **Blog nomi o'zgartirish:** `components/Layout.js` dagi `BLOG_NAME` ni o'zgartiring
- **"Men haqimda" sahifasi:** `pages/about.js` ni tahrirlang
- **O'z domen qo'shish:** Vercel dashboard → Domains → domen qo'shing
