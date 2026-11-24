import { useState } from 'react';
import { Bookmark, Heart, Menu, X } from 'lucide-react';

interface HeaderProps {
  storeName: string;
  favoritesCount: number;
  savedCount: number;
  onOpenFavorites: () => void;
  onOpenSaved: () => void;
  onNavigateSection: (sectionId: string) => void;
}

const NAV_ITEMS = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'katalog', label: 'Katalog' },
  { id: 'tentang', label: 'Tentang' },
];

export function Header({
  storeName,
  favoritesCount,
  savedCount,
  onOpenFavorites,
  onOpenSaved,
  onNavigateSection,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fbfaf6]/95 backdrop-blur-sm border-b border-[#dde5db]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Desktop Navigation / Mobile Hamburger */}
        <div className="flex items-center flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-xl text-[#1f2a24] hover:bg-[#eef3ec] transition-colors focus-visible:outline-2 focus-visible:outline-[#2f4a3d]"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Navigasi utama">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className="text-sm font-medium text-[#1f2a24]/85 hover:text-[#c8643f] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#c8643f]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Center: Brand Logo */}
        <a
          href="#beranda"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('beranda');
          }}
          className="font-serif-brand text-xl sm:text-2xl font-bold tracking-tight text-[#2f4a3d] whitespace-nowrap shrink-0"
        >
          {storeName}
        </a>

        {/* Right: Favorit & Simpan Icon Buttons */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpenFavorites}
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#dde5db] bg-white/80 text-[#1f2a24] hover:border-[#c8643f] hover:text-[#c8643f] transition-colors focus-visible:outline-2 focus-visible:outline-[#2f4a3d]"
            aria-label={`Favorit (${favoritesCount})`}
            title="Daftar Favorit"
          >
            <Heart className="w-[18px] h-[18px]" strokeWidth={1.8} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#c8643f] text-white text-[11px] font-semibold flex items-center justify-center tabular-nums shadow-xs">
                {favoritesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#dde5db] bg-white/80 text-[#1f2a24] hover:border-[#2f4a3d] hover:text-[#2f4a3d] transition-colors focus-visible:outline-2 focus-visible:outline-[#2f4a3d]"
            aria-label={`Simpan (${savedCount})`}
            title="Daftar Simpan"
          >
            <Bookmark className="w-[18px] h-[18px]" strokeWidth={1.8} />
            {savedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#2f4a3d] text-white text-[11px] font-semibold flex items-center justify-center tabular-nums shadow-xs">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Hamburger Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#dde5db] bg-[#fbfaf6] px-4 py-3">
          <nav className="flex flex-col gap-1" aria-label="Navigasi seluler">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-[#1f2a24] hover:bg-[#eef3ec] hover:text-[#2f4a3d] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
