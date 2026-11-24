import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './security.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const DB_PATH = path.join(DATA_DIR, 'shopbag.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 10,
    is_available INTEGER NOT NULL DEFAULT 1,
    whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whatsapp_click_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`);

export interface ProductRow {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  label: string;
  image_url: string;
  stock: number;
  is_available: number;
  whatsapp_clicks: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreSettingsData {
  store_name: string;
  store_tagline: string;
  whatsapp_number: string;
  footer_address: string;
  footer_contact: string;
}

function seedInitialData(): void {
  const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admins').get() as { count: number };
  if (adminCount.count === 0) {
    const initialPass = process.env.ADMIN_INITIAL_PASSWORD || 'admin';
    const passwordHash = hashPassword(initialPass);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
  }

  const settingsCount = db.prepare('SELECT COUNT(*) AS count FROM store_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings: Record<keyof StoreSettingsData, string> = {
      store_name: 'SHOP BAG.',
      store_tagline: 'Find Your Everyday Style.',
      whatsapp_number: '6281234567890',
      footer_address: 'Jl. Kemang Raya No. 48, Jakarta Selatan',
      footer_contact: 'halo@shopbag.id · +62 812-3456-7890 · Buka setiap hari 09.00–20.00 WIB',
    };
    const insertSetting = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?)');
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [k, v] of entries) {
        insertSetting.run(k, v);
      }
    });
    tx(Object.entries(defaultSettings));
  }

  const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    const initialProducts = [
      {
        name: 'Luna Mini Handbag',
        category: 'Handbag',
        price: 245000,
        description:
          'Tas tangan mini berstruktur dengan sentuhan kulit pebble lembut dan kunci brass klasik. Pas untuk membawa ponsel, dompet lipat, dan kebutuhan harian.',
        label: 'Best Seller',
        image_url: '/src/assets/images/luna_mini_handbag_1795505874267.jpg',
        stock: 14,
        is_available: 1,
        sort_order: 1,
      },
      {
        name: 'Mila Shoulder Bag',
        category: 'Shoulder Bag',
        price: 275000,
        description:
          'Siluet bulan sabit yang ramping dengan tali bahu nyaman dan kompartemen utama beritsleting. Cocok untuk gaya kasual hingga semi-formal.',
        label: 'Favorit',
        image_url: '/src/assets/images/mila_shoulder_bag_1795505874532.jpg',
        stock: 9,
        is_available: 1,
        sort_order: 2,
      },
      {
        name: 'Daily Canvas Tote',
        category: 'Tote Bag',
        price: 165000,
        description:
          'Tote kanvas katun organik tebal dengan tali webbing forest yang kuat dan saku depan praktis. Muat laptop 14 inci, buku catatan, dan botol minum.',
        label: 'Best Seller',
        image_url: '/src/assets/images/daily_canvas_tote_1795505875351.jpg',
        stock: 22,
        is_available: 1,
        sort_order: 3,
      },
      {
        name: 'Classic Mini Sling',
        category: 'Sling Bag',
        price: 145000,
        description:
          'Tas selempang ringkas dengan tali yang dapat disesuaikan dan dua kompartemen rapi. Praktis untuk jalan santai maupun bepergian ringan.',
        label: 'New',
        image_url: '/src/assets/images/classic_mini_sling_1795505876036.jpg',
        stock: 18,
        is_available: 1,
        sort_order: 4,
      },
      {
        name: 'Urban Backpack',
        category: 'Backpack',
        price: 320000,
        description:
          'Ransel komuter tahan cipratan air dengan kompartemen laptop empuk hingga 15 inci dan saku samping botol minum. Ringan untuk aktivitas seharian.',
        label: 'Best Seller',
        image_url: '/src/assets/images/urban_backpack_1795505876612.jpg',
        stock: 11,
        is_available: 1,
        sort_order: 5,
      },
      {
        name: 'Sora Everyday Bag',
        category: 'Shoulder Bag',
        price: 215000,
        description:
          'Tas bahu berbahan kanvas sage lembut dengan potongan santai dan tali lebar yang nyaman di bahu sepanjang hari.',
        label: 'New',
        image_url: '/src/assets/images/sora_everyday_bag_1795505877162.jpg',
        stock: 16,
        is_available: 1,
        sort_order: 6,
      },
      {
        name: 'Nara Soft Tote',
        category: 'Tote Bag',
        price: 230000,
        description:
          'Tote lembut beraksen lipit dengan pegangan simpul yang anggun. Kapasitas lega dengan kantong dalam beritsleting untuk barang berharga.',
        label: 'Pilihan Editor',
        image_url: '/src/assets/images/nara_soft_tote_1795505877448.jpg',
        stock: 12,
        is_available: 1,
        sort_order: 7,
      },
      {
        name: 'Kira Mini Sling',
        category: 'Sling Bag',
        price: 95000,
        description:
          'Sling bag vertikal minimalis untuk ponsel, kartu, dan kunci. Ringan, ringkas, dan mudah dipadukan dengan berbagai busana harian.',
        label: 'Favorit',
        image_url: '/src/assets/images/kira_mini_sling_1795505877647.jpg',
        stock: 25,
        is_available: 1,
        sort_order: 8,
      },
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, price, description, label, image_url, stock, is_available, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      for (const item of initialProducts) {
        insertProduct.run(
          item.name,
          item.category,
          item.price,
          item.description,
          item.label,
          item.image_url,
          item.stock,
          item.is_available,
          item.sort_order
        );
      }
    });
    tx();
  }
}

seedInitialData();

export function getStoreSettings(): StoreSettingsData {
  const rows = db.prepare('SELECT key, value FROM store_settings').all() as Array<{ key: string; value: string }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    store_name: map.get('store_name') ?? 'SHOP BAG.',
    store_tagline: map.get('store_tagline') ?? 'Find Your Everyday Style.',
    whatsapp_number: map.get('whatsapp_number') ?? '6281234567890',
    footer_address: map.get('footer_address') ?? 'Jl. Kemang Raya No. 48, Jakarta Selatan',
    footer_contact: map.get('footer_contact') ?? 'halo@shopbag.id · +62 812-3456-7890',
  };
}
