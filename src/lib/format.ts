import type { BagCategory, Product } from '../types.ts';

export const HERO_IMAGE_URL = '/src/assets/images/hero_everyday_bag_1795505874326.jpg';

export const CATEGORY_CARDS: Array<{
  name: BagCategory;
  subtitle: string;
  image: string;
}> = [
  {
    name: 'Semua Tas',
    subtitle: 'Semua koleksi harian',
    image: '/src/assets/images/hero_everyday_bag_1795505874326.jpg',
  },
  {
    name: 'Backpack',
    subtitle: 'Komuter & kerja',
    image: '/src/assets/images/urban_backpack_1795505876612.jpg',
  },
  {
    name: 'Handbag',
    subtitle: 'Terstruktur & ringkas',
    image: '/src/assets/images/luna_mini_handbag_1795505874267.jpg',
  },
  {
    name: 'Shoulder Bag',
    subtitle: 'Nyaman di bahu',
    image: '/src/assets/images/mila_shoulder_bag_1795505874532.jpg',
  },
  {
    name: 'Tote Bag',
    subtitle: 'Muat laptop & buku',
    image: '/src/assets/images/daily_canvas_tote_1795505875351.jpg',
  },
  {
    name: 'Sling Bag',
    subtitle: 'Praktis & ringan',
    image: '/src/assets/images/classic_mini_sling_1795505876036.jpg',
  },
];

export function formatRupiah(amount: number): string {
  return `Rp${new Intl.NumberFormat('id-ID').format(amount)}`;
}

export function buildWhatsappUrl(whatsappNumber: string, product: Product): string {
  const cleanDigits = whatsappNumber.replace(/\D/g, '');
  const formattedPrice = formatRupiah(product.price);
  const message = [
    'Halo Shop Bag, saya tertarik memesan produk berikut:',
    '',
    `Nama Produk: ${product.name}`,
    `Kategori: ${product.category}`,
    `Harga: ${formattedPrice}`,
    '',
    'Apakah produk ini masih tersedia?',
  ].join('\n');

  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
}
