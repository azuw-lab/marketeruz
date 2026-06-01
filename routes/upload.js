const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db/database');
const auth = require('../middleware/auth');

// ── ImageKit sozlamasi ────────────────────────────────────────────────────────
const useImageKit = !!(
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
);

let imagekit = null;

if (useImageKit) {
  const ImageKit = require('@imagekit/nodejs');
  imagekit = new ImageKit({
    publicKey:   process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey:  process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
  console.log('✓ ImageKit ulandi:', process.env.IMAGEKIT_URL_ENDPOINT);
}

// ── Multer: ImageKit bo'lsa xotiraga, bo'lmasa diskka ────────────────────────
const storage = useImageKit
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi (jpg, png, webp, gif)'), false);
    }
  },
});

// ── POST /api/upload ──────────────────────────────────────────────────────────
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Rasm yuklanmadi' });

    let url, filename, public_id;

    if (useImageKit) {
      // Buffer → ImageKit
      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

      // @imagekit/nodejs yangi API: imagekit.files.upload()
      const { Readable } = require('stream');
      const stream = Readable.from(req.file.buffer);

      const result = await imagekit.files.upload({
        file: stream,
        fileName: name,
        folder: '/marketeruz',
        useUniqueFileName: false,
      });

      url = result.url;
      filename = result.name;
      public_id = result.fileId; // o'chirish uchun kerak
    } else {
      // Lokal saqlash (dev, ImageKit sozlanmagan)
      url = `/uploads/${req.file.filename}`;
      filename = req.file.filename;
      public_id = null;
    }

    const { rows } = await query(
      `INSERT INTO images (filename, original_name, url, public_id, post_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [filename, req.file.originalname, url, public_id, req.body.post_id || null]
    );

    res.json({
      id:            rows[0].id,
      url,
      filename,
      original_name: req.file.originalname,
    });
  } catch (err) {
    console.error('Upload xatosi:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/images ───────────────────────────────────────────────────────────
router.get('/images', auth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM images ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/images/:id ────────────────────────────────────────────────────
router.delete('/images/:id', auth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM images WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Rasm topilmadi' });

    const image = rows[0];

    if (useImageKit && image.public_id) {
      // ImageKit dan o'chirish (fileId bo'yicha)
      await imagekit.files.delete(image.public_id).catch(e =>
        console.warn('ImageKit delete warning:', e.message)
      );
    } else if (!useImageKit && image.filename) {
      // Lokal faylni o'chirish
      const filePath = path.join(__dirname, '..', 'uploads', image.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await query('DELETE FROM images WHERE id = $1', [req.params.id]);
    res.json({ message: "Rasm o'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
