import { CATEGORY_CARDS } from '../lib/format.ts';
import type { BagCategory } from '../types.ts';
import { BagImage } from './BagImage.tsx';

interface CategoryStripProps {
  selectedCategory: BagCategory;
  onSelectCategory: (category: BagCategory) => void;
}

export function CategoryStrip({ selectedCategory, onSelectCategory }: CategoryStripProps) {
  return (
    <section id="kategori" className="py-10 sm:py-12 border-t border-[#dde5db] bg-[#eef3ec]/55">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="font-serif-brand text-2xl sm:text-3xl text-[#1f2a24]">
              Kategori Pilihan
            </h2>
            <p className="text-sm text-[#69766d] mt-1">
              Pilih siluet tas sesuai kebutuhan aktivitasmu setiap hari.
            </p>
          </div>
          <span className="text-xs text-[#69766d] md:hidden">
            Geser ke samping untuk melihat semua kategori
          </span>
        </div>

        {/* Horizontal scroll on mobile, 6-col grid on desktop */}
        <div className="flex overflow-x-auto gap-3.5 pb-2 snap-x no-scrollbar md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:pb-0">
          {CATEGORY_CARDS.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                aria-pressed={isActive}
                className={`group shrink-0 w-36 sm:w-40 md:w-auto snap-start text-left rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2f4a3d] ${
                  isActive
                    ? 'bg-[#2f4a3d] border-[#2f4a3d] text-[#fbfaf6] shadow-md -translate-y-0.5'
                    : 'bg-[#fbfaf6] border-[#dde5db] text-[#1f2a24] hover:border-[#a9bfa8] hover:-translate-y-0.5 hover:shadow-sm'
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#eef3ec]">
                  <BagImage
                    src={cat.image}
                    alt={cat.name}
                    fallbackLabel={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <div className="font-serif-brand text-sm font-semibold truncate">
                    {cat.name}
                  </div>
                  <div
                    className={`text-xs mt-0.5 truncate ${
                      isActive ? 'text-[#eef3ec]/85' : 'text-[#69766d]'
                    }`}
                  >
                    {cat.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
