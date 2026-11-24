import { Bookmark, Eye, Heart, MessageCircle } from 'lucide-react';
import { buildWhatsappUrl, formatRupiah } from '../lib/format.ts';
import type { Product } from '../types.ts';
import { BagImage } from './BagImage.tsx';

interface ProductCardProps {
  product: Product;
  whatsappNumber: string;
  isFavorite: boolean;
  isSaved: boolean;
  onToggleFavorite: (productId: number) => void;
  onToggleSaved: (productId: number) => void;
  onOpenDetail: (product: Product) => void;
  onTrackWhatsappClick: (productId: number) => void;
}

export function ProductCard({
  product,
  whatsappNumber,
  isFavorite,
  isSaved,
  onToggleFavorite,
  onToggleSaved,
  onOpenDetail,
  onTrackWhatsappClick,
}: ProductCardProps) {
  const waUrl = buildWhatsappUrl(whatsappNumber, product);

  return (
    <article className="group flex flex-col rounded-2xl bg-white border border-[#dde5db] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Product Photo */}
      <div className="relative aspect-[4/3] bg-[#eef3ec] overflow-hidden">
        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="w-full h-full block text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2f4a3d]"
          aria-label={`Lihat detail ${product.name}`}
        >
          <BagImage
            src={product.image_url}
            alt={product.name}
            fallbackLabel={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        </button>

        {/* Single subtle label */}
        {!product.is_available ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#1f2a24]/85 text-[#fbfaf6] text-[11px] font-medium">
            Stok Habis
          </span>
        ) : product.label ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#fbfaf6]/95 text-[#2f4a3d] border border-[#dde5db] text-[11px] font-medium">
            {product.label}
          </span>
        ) : null}

        {/* Quick Favorit & Simpan icons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleFavorite(product.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Hapus ${product.name} dari Favorit` : `Tambah ${product.name} ke Favorit`}
            title={isFavorite ? 'Hapus dari Favorit' : 'Favoritkan'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-[#c8643f] border-[#c8643f] text-white'
                : 'bg-[#fbfaf6]/90 border-[#dde5db] text-[#1f2a24] hover:border-[#c8643f] hover:text-[#c8643f]'
            }`}
          >
            <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => onToggleSaved(product.id)}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Hapus ${product.name} dari Simpan` : `Simpan ${product.name}`}
            title={isSaved ? 'Hapus dari Simpan' : 'Simpan Produk'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
              isSaved
                ? 'bg-[#2f4a3d] border-[#2f4a3d] text-white'
                : 'bg-[#fbfaf6]/90 border-[#dde5db] text-[#1f2a24] hover:border-[#2f4a3d] hover:text-[#2f4a3d]'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Product Body */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-[#69766d]">
            <span className="truncate">{product.category}</span>
            {product.is_available && (
              <span className="text-[#2f4a3d] font-medium shrink-0">Tersedia</span>
            )}
          </div>

          <h3 className="font-serif-brand text-base sm:text-lg font-semibold text-[#1f2a24] mt-1 line-clamp-1">
            {product.name}
          </h3>

          <p className="text-xs sm:text-sm text-[#69766d] mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="pt-2 border-t border-[#eef3ec] space-y-2.5">
          <div className="text-base sm:text-lg font-semibold text-[#2f4a3d] tabular-nums">
            {formatRupiah(product.price)}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#dde5db] bg-[#fbfaf6] text-[#1f2a24] text-xs font-medium hover:bg-[#eef3ec] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Detail</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrackWhatsappClick(product.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-xs font-medium hover:bg-[#c8643f] transition-colors whitespace-nowrap text-center"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Pesan via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
