import { useCallback, useEffect, useMemo, useState } from 'react';
import { AboutAndFooter } from './components/AboutAndFooter.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { CatalogSection } from './components/CatalogSection.tsx';
import { CategoryStrip } from './components/CategoryStrip.tsx';
import { Header } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { SavedDrawerModal } from './components/SavedDrawerModal.tsx';
import { secureJsonRequest } from './lib/e2ee.ts';
import type { BagCategory, PriceRangeFilter, Product, SortOption, StoreSettings } from './types.ts';

const FAVORITES_STORAGE_KEY = 'shopbag_favorites_v1';
const SAVED_STORAGE_KEY = 'shopbag_saved_v1';

function readIdListFromStorage(key: string): number[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is number => typeof item === 'number' && Number.isInteger(item));
  } catch {
    return [];
  }
}

export default function App() {
  const [route, setRoute] = useState<'store' | 'admin'>(() =>
    window.location.pathname.startsWith('/admin') ? 'admin' : 'store'
  );

  // Storefront data from SQLite API
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'SHOP BAG.',
    store_tagline: 'Find Your Everyday Style.',
    whatsapp_number: '6281234567890',
    footer_address: 'Jl. Kemang Raya No. 48, Jakarta Selatan',
    footer_contact: 'halo@shopbag.id · +62 812-3456-7890',
  });
  const [loadingStore, setLoadingStore] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<BagCategory>('Semua Tas');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  // Separate Favorit & Simpan lists in LocalStorage
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    readIdListFromStorage(FAVORITES_STORAGE_KEY)
  );
  const [savedIds, setSavedIds] = useState<number[]>(() => readIdListFromStorage(SAVED_STORAGE_KEY));

  // Modals & Drawers
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [drawerMode, setDrawerMode] = useState<'favorites' | 'saved' | null>(null);

  // Admin auth session strictly in React memory (never LocalStorage/SessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string>('admin');

  const fetchStoreData = useCallback(async () => {
    try {
      const res = await fetch('/api/store');
      if (!res.ok) return;
      const data = (await res.json()) as { store: StoreSettings; products: Product[] };
      setSettings(data.store);
      setAllProducts(data.products);
    } finally {
      setLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    void fetchStoreData();
  }, [fetchStoreData]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname.startsWith('/admin') ? 'admin' : 'store');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedIds]);

  const navigateTo = (target: 'store' | 'admin') => {
    setRoute(target);
    const nextPath = target === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (category: BagCategory) => {
    setSelectedCategory(category);
    scrollToSection('katalog');
  };

  const handleResetFilters = () => {
    setSelectedCategory('Semua Tas');
    setSearchQuery('');
    setPriceRange('all');
    setSortBy('recommended');
  };

  const toggleFavorite = (productId: number) => {
    setFavoriteIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleSaved = (productId: number) => {
    setSavedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const trackWhatsappClick = (productId: number) => {
    void fetch(`/api/products/${productId}/whatsapp-click`, {
      method: 'POST',
      keepalive: true,
    });
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = allProducts.filter((product) => {
      if (selectedCategory !== 'Semua Tas' && product.category !== selectedCategory) {
        return false;
      }
      if (query && !product.name.toLowerCase().includes(query)) {
        return false;
      }
      if (priceRange === 'under_100k' && product.price >= 100000) {
        return false;
      }
      if (priceRange === '100k_250k' && (product.price < 100000 || product.price > 250000)) {
        return false;
      }
      if (priceRange === 'above_250k' && product.price <= 250000) {
        return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...filtered].sort((a, b) => a.price - b.price || a.id - b.id);
    }
    if (sortBy === 'price_desc') {
      return [...filtered].sort((a, b) => b.price - a.price || a.id - b.id);
    }
    if (sortBy === 'name_asc') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }
    return filtered;
  }, [allProducts, selectedCategory, searchQuery, priceRange, sortBy]);

  const favoriteProducts = useMemo(
    () => allProducts.filter((p) => favoriteIds.includes(p.id)),
    [allProducts, favoriteIds]
  );

  const savedProducts = useMemo(
    () => allProducts.filter((p) => savedIds.includes(p.id)),
    [allProducts, savedIds]
  );

  const handleAdminLogout = async () => {
    if (adminToken) {
      try {
        await secureJsonRequest('/api/admin/logout', {
          method: 'POST',
          token: adminToken,
        });
      } catch {
        // Always clear local session regardless of network outcome
      }
    }
    setAdminToken(null);
  };

  if (route === 'admin') {
    if (!adminToken) {
      return (
        <AdminLogin
          storeName={settings.store_name}
          onLoginSuccess={(token, user) => {
            setAdminToken(token);
            setAdminUsername(user);
          }}
          onBackToStore={() => navigateTo('store')}
        />
      );
    }

    return (
      <AdminDashboard
        token={adminToken}
        username={adminUsername}
        onUnauthorized={() => setAdminToken(null)}
        onLogout={() => void handleAdminLogout()}
        onBackToStore={() => navigateTo('store')}
        onDataUpdated={() => void fetchStoreData()}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf6] text-[#1f2a24]">
      <Header
        storeName={settings.store_name}
        favoritesCount={favoriteProducts.length}
        savedCount={savedProducts.length}
        onOpenFavorites={() => setDrawerMode('favorites')}
        onOpenSaved={() => setDrawerMode('saved')}
        onNavigateSection={scrollToSection}
      />

      <main className="flex-1">
        <HeroSection
          tagline={settings.store_tagline}
          onExploreClick={() => scrollToSection('katalog')}
        />

        <CategoryStrip
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        <CatalogSection
          products={filteredProducts}
          totalCount={allProducts.length}
          loading={loadingStore}
          whatsappNumber={settings.whatsapp_number}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          priceRange={priceRange}
          sortBy={sortBy}
          favoriteIds={favoriteIds}
          savedIds={savedIds}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onPriceRangeChange={setPriceRange}
          onSortChange={setSortBy}
          onResetFilters={handleResetFilters}
          onToggleFavorite={toggleFavorite}
          onToggleSaved={toggleSaved}
          onOpenDetail={setDetailProduct}
          onTrackWhatsappClick={trackWhatsappClick}
        />
      </main>

      <AboutAndFooter
        settings={settings}
        onNavigateSection={scrollToSection}
        onOpenAdmin={() => navigateTo('admin')}
      />

      <ProductDetailModal
        product={detailProduct}
        whatsappNumber={settings.whatsapp_number}
        isFavorite={detailProduct ? favoriteIds.includes(detailProduct.id) : false}
        isSaved={detailProduct ? savedIds.includes(detailProduct.id) : false}
        onClose={() => setDetailProduct(null)}
        onToggleFavorite={toggleFavorite}
        onToggleSaved={toggleSaved}
        onTrackWhatsappClick={trackWhatsappClick}
      />

      <SavedDrawerModal
        mode={drawerMode}
        items={drawerMode === 'favorites' ? favoriteProducts : savedProducts}
        whatsappNumber={settings.whatsapp_number}
        onClose={() => setDrawerMode(null)}
        onRemoveItem={(id) => (drawerMode === 'favorites' ? toggleFavorite(id) : toggleSaved(id))}
        onOpenDetail={setDetailProduct}
        onTrackWhatsappClick={trackWhatsappClick}
      />
    </div>
  );
}
