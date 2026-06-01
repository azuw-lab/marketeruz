# marketeruz — Saytni ishga tushurish

## Bir marta qiladigan ishlar

### 1. GitHub account oching
https://github.com → "Sign up" → email, parol

### 2. Yangi repository yarating
- GitHub'da: "+ New repository"
- Nom: `marketeruz`
- "Public" tanlang
- "Create repository" bosing

### 3. Fayllarni yuklang
Repository sahifasida: "uploading an existing file" bosiladi
→ Bu papkadagi BARCHA fayllarni torting va tashlang
→ "Commit changes" bosing

### 4. Netlify'ga ulaning
https://netlify.com → "Sign up with GitHub"
→ "Add new site" → "Import an existing project"
→ GitHub → `marketeruz` repository tanlang
→ Build command: `node build.js`
→ Publish directory: `.`
→ "Deploy site" bosing

Sayt 1-2 daqiqada: `marketeruz.netlify.app` manzilida ishlaydi!

### 5. CMS (admin panel) ni yoqing
Netlify dashboard → Site settings → Identity → "Enable Identity"
→ Registration: "Invite only"
→ Services → Git Gateway → "Enable Git Gateway"
→ Identity → "Invite users" → o'z email'ingizni kiriting

---

## Post yozish (har doim)

1. `marketeruz.netlify.app/admin` ga kiring
2. Email va parol bilan login qiling
3. "Fikrlar" → "New Fikrlar" bosing
4. Sarlavha, matn yozing → "Publish" bosing
5. 1-2 daqiqada saytda ko'rinadi!

---

## Papka tuzilishi
```
marketeruz/
├── index.html          ← Asosiy sayt
├── admin/
│   ├── index.html      ← CMS panel
│   └── config.yml      ← CMS sozlamalari
├── posts/
│   ├── fikrlar/        ← Fikr postlar (.md fayllar)
│   ├── ishlar/         ← Ish postlar
│   └── rasmlar/        ← Rasm postlar
├── images/             ← Yuklangan rasmlar
├── build.js            ← Build script
├── package.json
└── netlify.toml        ← Netlify sozlamalari
```
