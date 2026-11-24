import { RotateCcw, Search } from 'lucide-react';
import { BAG_CATEGORIES } from '../types.ts';
import type { BagCategory, PriceRangeFilter, Product, SortOption } from '../types.ts';
import { ProductCard } from './ProductCard.tsx';

interface CatalogSectionProps {
  products: Product[];
  totalCount: number;
  loading: boolean;
  whatsappNumber: string;
  selectedCategory: BagCategory;
  searchQuery: string;
  priceRange: PriceRangeFilter;
  sortBy: SortOption;
  favoriteIds: number[];
  savedIds: number[];
  onCategoryChange: (category: BagCategory) => void;
  onSearchChange: (value: string) => void;
  onPriceRangeChange: (value: PriceRangeFilter) => void;
  onSortChange: (value: SortOption) => void;
  onResetFilters: () => void;
  onToggleFavorite: (productId: number) => void;
  onToggleSaved: (productId: number) => void;
  onOpenDetail: (product: Product) => void;
  onTrackWhatsappClick: (productId: number) => void;
}

export function CatalogSection({
  products,
  totalCount,
  loading,
  whatsappNumber,
  selectedCategory,
  searchQuery,
  priceRange,
  sortBy,
  favoriteIds,
  savedIds,
  onCategoryChange,
  onSearchChange,
  onPriceRangeChange,
  onSortChange,
  onResetFilters,
  onToggleFavorite,
  onToggleSaved,
  onOpenDetail,
  onTrackWhatsappClick,
}: CatalogSectionProps) {
  const hasActiveFilters =
    selectedCategory !== 'Semua Tas' ||
    searchQuery.trim().length > 0 ||
    priceRange !== 'all' ||
    sortBy !== 'recommended';

  return (
    <section id="katalog" className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-serif-brand text-2xl sm:text-3xl text-[#1f2a24]">
              Katalog Koleksi
            </h2>
            <p className="text-sm text-[#69766d] mt-1">
              Menampilkan <span className="font-medium text-[#1f2a24] tabular-nums">{products.length}</span> dari{' '}
              <span className="tabular-nums">{totalCount}</span> produk pilihan
              {selectedCategory !== 'Semua Tas' ? ` di kategori ${selectedCategory}` : ''}.
            </p>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 rounded-xl border border-[#dde5db] bg-white text-xs font-medium text-[#2f4a3d] hover:bg-[#eef3ec] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Search, Category Filter Tabs, Price Filter & Sort Bar */}
        <div className="rounded-2xl bg-[#eef3ec]/70 border border-[#dde5db] p-4 sm:p-5 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search by name */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#69766d] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari nama tas (mis. Luna, Tote, Sling)..."
                aria-label="Cari produk berdasarkan nama"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm text-[#1f2a24] placeholder:text-[#69766d] focus:outline-none focus:border-[#2f4a3d]"
              />
            </div>

            {/* Price Filter */}
            <div className="md:col-span-4">
              <select
                value={priceRange}
                onChange={(e) => onPriceRangeChange(e.target.value as PriceRangeFilter)}
                aria-label="Filter rentang harga"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
              >
                <option value="all">Semua Harga</option>
                <option value="under_100k">Di bawah Rp100.000</option>
                <option value="100k_250k">Rp100.000 – Rp250.000</option>
                <option value="above_250k">Di atas Rp250.000</option>
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                aria-label="Urutkan produk"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
              >
                <option value="recommended">Urutkan: Rekomendasi</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
                <option value="name_asc">Nama A–Z</option>
              </select>
            </div>
          </div>

          {/* Interactive category filter buttons */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {BAG_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange(category)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#2f4a3d] text-[#fbfaf6]'
                      : 'bg-white border border-[#dde5db] text-[#1f2a24] hover:border-[#a9bfa8]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid: 2 cols mobile, 3 cols desktop */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-[#dde5db] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#eef3ec]" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3 w-20 bg-[#eef3ec] rounded" />
                  <div className="h-5 w-3/4 bg-[#eef3ec] rounded" />
                  <div className="h-3 w-full bg-[#eef3ec] rounded" />
                  <div className="h-9 w-full bg-[#eef3ec] rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-[#dde5db] bg-[#eef3ec]/45 p-10 text-center max-w-lg mx-auto">
            <h3 className="font-serif-brand text-xl text-[#1f2a24]">
              Produk tidak ditemukan
            </h3>
            <p className="text-sm text-[#69766d] mt-2">
              Tidak ada tas yang sesuai dengan kata kunci pencarian atau filter harga saat ini.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-sm font-medium hover:bg-[#c8643f] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tampilkan Semua Produk</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                whatsappNumber={whatsappNumber}
                isFavorite={favoriteIds.includes(product.id)}
                isSaved={savedIds.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
                onToggleSaved={onToggleSaved}
                onOpenDetail={onOpenDetail}
                onTrackWhatsappClick={onTrackWhatsappClick}
              />
            ))}
          </div>
        )}

        {/* Required subtle note about sample data */}
        <p className="mt-8 text-xs text-[#69766d] text-center">
          Catatan: Foto dan data produk awal merupakan contoh kurasi dan dapat diubah atau diganti kapan saja melalui halaman Admin.
        </p>
      </div>
    </section>
  );
}
