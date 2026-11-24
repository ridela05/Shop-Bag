import { ArrowDownRight } from 'lucide-react';
import { HERO_IMAGE_URL } from '../lib/format.ts';
import { BagImage } from './BagImage.tsx';

interface HeroSectionProps {
  tagline: string;
  onExploreClick: () => void;
}

export function HeroSection({ tagline, onExploreClick }: HeroSectionProps) {
  return (
    <section id="beranda" className="pt-8 pb-12 sm:pt-12 sm:pb-16 lg:py-16 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Photo with Peach #f4c9b0 backdrop block */}
          <div className="lg:col-span-6 relative">
            <div className="relative max-w-lg mx-auto lg:mx-0">
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -left-3 sm:-bottom-5 sm:-left-5 w-full h-full rounded-2xl bg-[#f4c9b0]"
              />
              <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#dde5db] bg-[#eef3ec] aspect-[4/3]">
                <BagImage
                  src={HERO_IMAGE_URL}
                  alt="Koleksi tas harian Shop Bag di atas meja batu krem"
                  fallbackLabel="Koleksi Tas Harian"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Right: Editorial Headline + CTA */}
          <div className="lg:col-span-6 space-y-5 lg:pl-4">
            <p className="text-xs sm:text-sm font-medium tracking-wide text-[#c8643f]">
              {tagline}
            </p>

            <h1 className="font-serif-brand text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.12] text-[#1f2a24] text-balance">
              Find your <em className="italic font-normal text-[#2f4a3d]">everyday</em> bag.
            </h1>

            <p className="text-base sm:text-lg text-[#69766d] leading-relaxed max-w-xl">
              Pilihan tas fungsional dengan siluet bersih, material tahan lama, dan warna bumi yang mudah dipadukan untuk bekerja, kuliah, maupun akhir pekan.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExploreClick}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-sm font-medium shadow-sm hover:bg-[#c8643f] transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3d]"
              >
                <span>Jelajahi Koleksi</span>
                <ArrowDownRight className="w-4 h-4" />
              </button>
              <span className="text-xs sm:text-sm text-[#69766d]">
                Pesan langsung via WhatsApp · Kurasi harian
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
