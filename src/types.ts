export const BAG_CATEGORIES = [
  'Semua Tas',
  'Backpack',
  'Handbag',
  'Shoulder Bag',
  'Tote Bag',
  'Sling Bag',
] as const;

export type BagCategory = (typeof BAG_CATEGORIES)[number];

export const PRODUCT_CATEGORY_OPTIONS = [
  'Backpack',
  'Handbag',
  'Shoulder Bag',
  'Tote Bag',
  'Sling Bag',
] as const;

export type ProductCategoryOption = (typeof PRODUCT_CATEGORY_OPTIONS)[number];

export type PriceRangeFilter = 'all' | 'under_100k' | '100k_250k' | 'above_250k';
export type SortOption = 'recommended' | 'price_asc' | 'price_desc' | 'name_asc';

export interface Product {
  id: number;
  name: string;
  category: ProductCategoryOption;
  price: number;
  description: string;
  label: string;
  image_url: string;
  stock: number;
  is_available: boolean;
}

export interface AdminProduct extends Product {
  whatsapp_clicks: number;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  store_name: string;
  store_tagline: string;
  whatsapp_number: string;
  footer_address: string;
  footer_contact: string;
}

export interface AdminSummary {
  totalProducts: number;
  totalWhatsappClicks: number;
  topProduct: {
    id: number;
    name: string;
    category: string;
    whatsapp_clicks: number;
  } | null;
}

export interface AdminDashboardData {
  summary: AdminSummary;
  products: AdminProduct[];
  settings: StoreSettings;
}
