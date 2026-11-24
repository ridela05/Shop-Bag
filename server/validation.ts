export const PRODUCT_CATEGORIES = [
  'Backpack',
  'Handbag',
  'Shoulder Bag',
  'Tote Bag',
  'Sling Bag',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ValidatedProductInput {
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  label: string;
  stock: number;
  is_available: boolean;
}

export interface ValidatedStoreSettings {
  store_name: string;
  store_tagline: string;
  whatsapp_number: string;
  footer_address: string;
  footer_contact: string;
}

export function validatePositiveInt(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(num) || num <= 0) return null;
  return num;
}

export function validateProductInput(raw: unknown): { ok: true; data: ValidatedProductInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Data produk tidak valid.' };
  }

  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const category = typeof obj.category === 'string' ? obj.category.trim() : '';
  const description = typeof obj.description === 'string' ? obj.description.trim() : '';
  const label = typeof obj.label === 'string' ? obj.label.trim() : '';
  const priceNum = typeof obj.price === 'number' ? obj.price : Number(obj.price);
  const stockNum = obj.stock === undefined || obj.stock === '' ? 10 : Number(obj.stock);
  const isAvailable =
    typeof obj.is_available === 'boolean'
      ? obj.is_available
      : obj.is_available === 'true' || obj.is_available === 1 || obj.is_available === '1';

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'Nama produk harus 2–100 karakter.' };
  }
  if (!PRODUCT_CATEGORIES.includes(category as ProductCategory)) {
    return { ok: false, error: 'Kategori produk tidak valid.' };
  }
  if (!Number.isFinite(priceNum) || !Number.isInteger(priceNum) || priceNum < 1000 || priceNum > 100000000) {
    return { ok: false, error: 'Harga harus berupa angka bulat antara Rp1.000 hingga Rp100.000.000.' };
  }
  if (description.length < 5 || description.length > 1500) {
    return { ok: false, error: 'Deskripsi produk harus 5–1500 karakter.' };
  }
  if (label.length > 40) {
    return { ok: false, error: 'Label produk maksimal 40 karakter.' };
  }
  if (!Number.isFinite(stockNum) || !Number.isInteger(stockNum) || stockNum < 0 || stockNum > 100000) {
    return { ok: false, error: 'Stok harus berupa angka bulat 0–100.000.' };
  }

  return {
    ok: true,
    data: {
      name,
      category: category as ProductCategory,
      price: priceNum,
      description,
      label,
      stock: stockNum,
      is_available: stockNum === 0 ? false : isAvailable,
    },
  };
}

export function normalizeWhatsappDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

export function validateStoreSettings(raw: unknown): { ok: true; data: ValidatedStoreSettings } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Data pengaturan toko tidak valid.' };
  }

  const obj = raw as Record<string, unknown>;
  const store_name = typeof obj.store_name === 'string' ? obj.store_name.trim() : '';
  const store_tagline = typeof obj.store_tagline === 'string' ? obj.store_tagline.trim() : '';
  const waRaw = typeof obj.whatsapp_number === 'string' ? obj.whatsapp_number.trim() : '';
  const footer_address = typeof obj.footer_address === 'string' ? obj.footer_address.trim() : '';
  const footer_contact = typeof obj.footer_contact === 'string' ? obj.footer_contact.trim() : '';

  const whatsapp_number = normalizeWhatsappDigits(waRaw);

  if (store_name.length < 2 || store_name.length > 60) {
    return { ok: false, error: 'Nama toko harus 2–60 karakter.' };
  }
  if (store_tagline.length < 2 || store_tagline.length > 120) {
    return { ok: false, error: 'Tagline toko harus 2–120 karakter.' };
  }
  if (!/^[0-9]{8,16}$/.test(whatsapp_number)) {
    return { ok: false, error: 'Nomor WhatsApp harus berisi 8–16 digit angka yang valid (contoh: 6281234567890).' };
  }
  if (footer_address.length < 3 || footer_address.length > 220) {
    return { ok: false, error: 'Alamat footer harus 3–220 karakter.' };
  }
  if (footer_contact.length < 3 || footer_contact.length > 220) {
    return { ok: false, error: 'Kontak footer harus 3–220 karakter.' };
  }

  return {
    ok: true,
    data: {
      store_name,
      store_tagline,
      whatsapp_number,
      footer_address,
      footer_contact,
    },
  };
}

export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('/src/assets/images/') || url.startsWith('/uploads/');
}
