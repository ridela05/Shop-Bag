import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, getStoreSettings, UPLOADS_DIR, type ProductRow } from './server/db.ts';
import {
  checkLoginRateLimit,
  decryptE2eePayload,
  detectImageExtension,
  e2eeBodyMiddleware,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  performE2eeHandshake,
  resetLoginRateLimit,
  sendSecureJson,
  verifyPassword,
} from './server/security.ts';
import {
  isSafeImageUrl,
  PRODUCT_CATEGORIES,
  validatePositiveInt,
  validateProductInput,
  validateStoreSettings,
} from './server/validation.ts';

const PORT = 3000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

const SORT_SQL_ALLOWLIST: Record<string, string> = {
  recommended: 'sort_order ASC, id ASC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id ASC',
  name_asc: 'name COLLATE NOCASE ASC, id ASC',
};

interface AuthenticatedRequest extends Request {
  admin?: {
    id: number;
    username: string;
    tokenHash: string;
  };
}

function serializePublicProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    description: row.description,
    label: row.label,
    image_url: row.image_url,
    stock: row.stock,
    is_available: row.is_available === 1,
  };
}

function serializeAdminProduct(row: ProductRow) {
  return {
    ...serializePublicProduct(row),
    whatsapp_clicks: row.whatsapp_clicks,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.header('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi admin diperlukan. Silakan login terlebih dahulu.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 256) {
    res.status(401).json({ error: 'Token sesi tidak valid.' });
    return;
  }

  const tokenHash = hashSessionToken(token);
  const session = db
    .prepare(
      `SELECT s.token_hash, s.admin_id, s.expires_at, a.username
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .get(tokenHash) as { token_hash: string; admin_id: number; expires_at: string; username: string } | undefined;

  if (!session) {
    res.status(401).json({ error: 'Sesi telah berakhir atau tidak valid. Silakan login kembali.' });
    return;
  }

  req.admin = {
    id: session.admin_id,
    username: session.username,
    tokenHash: session.token_hash,
  };
  next();
}

function removeUploadedImageIfOwned(imageUrl: string): void {
  if (!imageUrl.startsWith('/uploads/')) return;
  const filename = imageUrl.slice('/uploads/'.length);
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return;
  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;
  if (fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
}

function parseMultipartProductPayload(req: Request): { ok: true; data: unknown; channelId?: string } | { ok: false; error: string; code?: string } {
  const rawEncrypted = req.body?.e2eePayload;
  if (typeof rawEncrypted === 'string' && rawEncrypted.length > 0) {
    try {
      const envelope = JSON.parse(rawEncrypted) as { channelId?: string; iv?: string; ciphertext?: string };
      if (!envelope.channelId || !envelope.iv || !envelope.ciphertext) {
        return { ok: false, error: 'Amplop enkripsi produk tidak lengkap.' };
      }
      const aadContext = `${req.method.toUpperCase()}:${req.originalUrl.split('?')[0]}`;
      const decrypted = decryptE2eePayload(envelope.channelId, envelope.iv, envelope.ciphertext, aadContext);
      return { ok: true, data: decrypted, channelId: envelope.channelId };
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      return {
        ok: false,
        error: code === 'E2EE_CHANNEL_EXPIRED' ? 'Kunci enkripsi perlu diperbarui.' : 'Dekripsi data produk gagal.',
        code,
      };
    }
  }
  return { ok: true, data: req.body };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers (iframe-compatible: no X-Frame-Options)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '512kb' }));

  // Safely serve uploaded product photos with path traversal confinement
  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).json({ error: 'Nama file tidak valid.' });
      return;
    }

    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(403).json({ error: 'Akses ditolak.' });
      return;
    }

    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Foto tidak ditemukan.' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  });

  // E2EE ECDH Handshake endpoint
  app.post('/api/security/handshake', (req, res) => {
    try {
      const clientPublicKey = req.body?.clientPublicKey;
      const result = performE2eeHandshake(clientPublicKey);
      res.json({
        ...result,
        algorithm: 'ECDH-P256-HKDF-SHA256-AES-256-GCM',
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message || 'Handshake enkripsi gagal.' });
    }
  });

  // Public Storefront Endpoint (parameterized SQL + allowlisted sorting)
  app.get('/api/store', (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const priceRange = typeof req.query.priceRange === 'string' ? req.query.priceRange.trim() : '';
    const sortKey = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'recommended';

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (category && category !== 'Semua Tas') {
      if ((PRODUCT_CATEGORIES as readonly string[]).includes(category)) {
        whereClauses.push('category = ?');
        params.push(category);
      } else {
        whereClauses.push('1 = 0');
      }
    }

    if (search.length > 0) {
      whereClauses.push('(name LIKE ? OR description LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    if (priceRange === 'under_100k') {
      whereClauses.push('price < ?');
      params.push(100000);
    } else if (priceRange === '100k_250k') {
      whereClauses.push('price >= ? AND price <= ?');
      params.push(100000, 250000);
    } else if (priceRange === 'above_250k') {
      whereClauses.push('price > ?');
      params.push(250000);
    }

    const orderBy = SORT_SQL_ALLOWLIST[sortKey] ?? SORT_SQL_ALLOWLIST.recommended;
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `SELECT * FROM products ${whereSql} ORDER BY ${orderBy}`;

    const rows = db.prepare(query).all(...params) as ProductRow[];
    const settings = getStoreSettings();

    res.json({
      store: settings,
      products: rows.map(serializePublicProduct),
    });
  });

  // Track WhatsApp Click per product
  app.post('/api/products/:id/whatsapp-click', (req, res) => {
    const productId = validatePositiveInt(req.params.id);
    if (!productId) {
      res.status(400).json({ error: 'ID produk tidak valid.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(productId) as { id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }

    const trackTx = db.transaction(() => {
      db.prepare("UPDATE products SET whatsapp_clicks = whatsapp_clicks + 1, updated_at = datetime('now') WHERE id = ?").run(
        productId
      );
      db.prepare('INSERT INTO whatsapp_click_logs (product_id) VALUES (?)').run(productId);
    });
    trackTx();

    res.json({ ok: true });
  });

  // Apply E2EE decryption middleware for JSON admin endpoints
  app.use('/api/admin', e2eeBodyMiddleware);

  // Admin Login (E2EE + scrypt hash + rate limiting)
  app.post('/api/admin/login', (req, res) => {
    const clientIp = req.ip || 'unknown';
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      sendSecureJson(req, res, 429, {
        error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rateCheck.retryAfterSec} detik.`,
      });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      sendSecureJson(req, res, 400, { error: 'Username dan password wajib diisi.' });
      return;
    }

    const admin = db
      .prepare('SELECT id, username, password_hash FROM admins WHERE username = ?')
      .get(username) as { id: number; username: string; password_hash: string } | undefined;

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      sendSecureJson(req, res, 401, { error: 'Username atau password salah.' });
      return;
    }

    resetLoginRateLimit(clientIp);

    // Clean expired sessions occasionally
    db.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at) <= datetime('now')").run();

    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)').run(
      tokenHash,
      admin.id,
      expiresAt
    );

    sendSecureJson(req, res, 200, {
      token,
      username: admin.username,
      expiresAt,
    });
  });

  // Admin Session Check
  app.get('/api/admin/session', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    sendSecureJson(req, res, 200, {
      authenticated: true,
      username: req.admin!.username,
    });
  });

  // Admin Logout
  app.post('/api/admin/logout', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(req.admin!.tokenHash);
    sendSecureJson(req, res, 200, { ok: true });
  });

  // Admin Change Password (E2EE)
  app.post('/api/admin/password', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      sendSecureJson(req, res, 400, { error: 'Semua kolom password wajib diisi.' });
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      sendSecureJson(req, res, 400, { error: 'Password baru minimal 6 karakter dan maksimal 128 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      sendSecureJson(req, res, 400, { error: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    const admin = db
      .prepare('SELECT id, password_hash FROM admins WHERE id = ?')
      .get(req.admin!.id) as { id: number; password_hash: string } | undefined;

    if (!admin || !verifyPassword(currentPassword, admin.password_hash)) {
      sendSecureJson(req, res, 401, { error: 'Password saat ini tidak sesuai.' });
      return;
    }

    const nextHash = hashPassword(newPassword);
    const tx = db.transaction(() => {
      db.prepare("UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
        nextHash,
        admin.id
      );
      // Revoke other active sessions for this admin
      db.prepare('DELETE FROM admin_sessions WHERE admin_id = ? AND token_hash != ?').run(
        admin.id,
        req.admin!.tokenHash
      );
    });
    tx();

    sendSecureJson(req, res, 200, { ok: true, message: 'Password berhasil diperbarui.' });
  });

  // Admin Dashboard Summary & Data
  app.get('/api/admin/dashboard', requireAdminAuth, (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, id DESC').all() as ProductRow[];
    const settings = getStoreSettings();

    const totalProducts = products.length;
    const totalWhatsappClicks = products.reduce((sum, item) => sum + item.whatsapp_clicks, 0);
    const sortedByClicks = [...products].sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks);
    const topProduct =
      sortedByClicks.length > 0 && sortedByClicks[0].whatsapp_clicks > 0
        ? {
            id: sortedByClicks[0].id,
            name: sortedByClicks[0].name,
            category: sortedByClicks[0].category,
            whatsapp_clicks: sortedByClicks[0].whatsapp_clicks,
          }
        : null;

    sendSecureJson(req, res, 200, {
      summary: {
        totalProducts,
        totalWhatsappClicks,
        topProduct,
      },
      products: products.map(serializeAdminProduct),
      settings,
    });
  });

  // Multer wrapper to surface clean 400 errors for >2MB files
  const handlePhotoUpload = (req: Request, res: Response, next: NextFunction): void => {
    upload.single('photo')(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'Ukuran foto maksimal 2 MB.' });
          return;
        }
        res.status(400).json({ error: 'Gagal memproses file foto.' });
        return;
      }
      next();
    });
  };

  // Admin Create Product
  app.post('/api/admin/products', requireAdminAuth, handlePhotoUpload, (req, res) => {
    const parsed = parseMultipartProductPayload(req);
    if (!parsed.ok) {
      res.status(parsed.code === 'E2EE_CHANNEL_EXPIRED' ? 428 : 400).json({ error: parsed.error, code: parsed.code });
      return;
    }
    if (parsed.channelId) {
      res.locals.e2eeChannelId = parsed.channelId;
      res.locals.e2eeAad = `${req.method.toUpperCase()}:${req.originalUrl.split('?')[0]}`;
    }

    const validation = validateProductInput(parsed.data);
    if (!validation.ok) {
      sendSecureJson(req, res, 400, { error: validation.error });
      return;
    }

    let imageUrl = '';
    if (req.file) {
      const ext = detectImageExtension(req.file.buffer);
      if (!ext) {
        sendSecureJson(req, res, 400, { error: 'Format foto harus JPG, PNG, atau WebP yang valid.' });
        return;
      }
      const filename = `bag-${Date.now()}-${crypto.randomUUID()}${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, filename);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        sendSecureJson(req, res, 400, { error: 'Lokasi penyimpanan tidak valid.' });
        return;
      }
      fs.writeFileSync(targetPath, req.file.buffer);
      imageUrl = `/uploads/${filename}`;
    } else {
      const candidateUrl = (parsed.data as Record<string, unknown>)?.image_url;
      if (typeof candidateUrl === 'string' && isSafeImageUrl(candidateUrl)) {
        imageUrl = candidateUrl;
      } else {
        sendSecureJson(req, res, 400, { error: 'Foto produk wajib diunggah (JPG/PNG/WebP, maks 2 MB).' });
        return;
      }
    }

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM products').get() as {
      max_order: number;
    };

    const result = db
      .prepare(
        `INSERT INTO products (name, category, price, description, label, image_url, stock, is_available, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        validation.data.name,
        validation.data.category,
        validation.data.price,
        validation.data.description,
        validation.data.label,
        imageUrl,
        validation.data.stock,
        validation.data.is_available ? 1 : 0,
        maxOrder.max_order + 1
      );

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as ProductRow;
    sendSecureJson(req, res, 201, { product: serializeAdminProduct(created) });
  });

  // Admin Update Product
  app.put('/api/admin/products/:id', requireAdminAuth, handlePhotoUpload, (req, res) => {
    const productId = validatePositiveInt(req.params.id);
    if (!productId) {
      res.status(400).json({ error: 'ID produk tidak valid.' });
      return;
    }

    const parsed = parseMultipartProductPayload(req);
    if (!parsed.ok) {
      res.status(parsed.code === 'E2EE_CHANNEL_EXPIRED' ? 428 : 400).json({ error: parsed.error, code: parsed.code });
      return;
    }
    if (parsed.channelId) {
      res.locals.e2eeChannelId = parsed.channelId;
      res.locals.e2eeAad = `${req.method.toUpperCase()}:${req.originalUrl.split('?')[0]}`;
    }

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as ProductRow | undefined;
    if (!existing) {
      sendSecureJson(req, res, 404, { error: 'Produk tidak ditemukan.' });
      return;
    }

    const validation = validateProductInput(parsed.data);
    if (!validation.ok) {
      sendSecureJson(req, res, 400, { error: validation.error });
      return;
    }

    let nextImageUrl = existing.image_url;
    if (req.file) {
      const ext = detectImageExtension(req.file.buffer);
      if (!ext) {
        sendSecureJson(req, res, 400, { error: 'Format foto harus JPG, PNG, atau WebP yang valid.' });
        return;
      }
      const filename = `bag-${Date.now()}-${crypto.randomUUID()}${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, filename);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        sendSecureJson(req, res, 400, { error: 'Lokasi penyimpanan tidak valid.' });
        return;
      }
      fs.writeFileSync(targetPath, req.file.buffer);
      nextImageUrl = `/uploads/${filename}`;
      removeUploadedImageIfOwned(existing.image_url);
    }

    db.prepare(
      `UPDATE products
       SET name = ?, category = ?, price = ?, description = ?, label = ?, image_url = ?, stock = ?, is_available = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      validation.data.name,
      validation.data.category,
      validation.data.price,
      validation.data.description,
      validation.data.label,
      nextImageUrl,
      validation.data.stock,
      validation.data.is_available ? 1 : 0,
      productId
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as ProductRow;
    sendSecureJson(req, res, 200, { product: serializeAdminProduct(updated) });
  });

  // Admin Delete Product
  app.delete('/api/admin/products/:id', requireAdminAuth, (req, res) => {
    const productId = validatePositiveInt(req.params.id);
    if (!productId) {
      sendSecureJson(req, res, 400, { error: 'ID produk tidak valid.' });
      return;
    }

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as ProductRow | undefined;
    if (!existing) {
      sendSecureJson(req, res, 404, { error: 'Produk tidak ditemukan.' });
      return;
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    removeUploadedImageIfOwned(existing.image_url);

    sendSecureJson(req, res, 200, { ok: true, id: productId });
  });

  // Admin Update Store Settings (E2EE)
  app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
    const validation = validateStoreSettings(req.body);
    if (!validation.ok) {
      sendSecureJson(req, res, 400, { error: validation.error });
      return;
    }

    const upsert = db.prepare(
      'INSERT INTO store_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [k, v] of entries) {
        upsert.run(k, v);
      }
    });
    tx(Object.entries(validation.data));

    sendSecureJson(req, res, 200, { settings: getStoreSettings() });
  });

  // Global error handler for API
  app.use('/api', (_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SHOP BAG server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
