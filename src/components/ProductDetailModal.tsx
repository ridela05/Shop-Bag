import { useEffect } from 'react';
import { Bookmark, Heart, MessageCircle, X } from 'lucide-react';
import { buildWhatsappUrl, formatRupiah } from '../lib/format.ts';
import type { Product } from '../types.ts';
import { BagImage } from './BagImage.tsx';

interface ProductDetailModalProps {
  product: Product | null;
  whatsappNumber: string;
  isFavorite: boolean;
  isSaved: boolean;
  onClose: () => void;
  onToggleFavorite: (productId: number) => void;
  onToggleSaved: (productId: number) => void;
  onTrackWhatsappClick: (productId: number) => void;
}

export function ProductDetailModal({
  product,
  whatsappNumber,
  isFavorite,
  isSaved,
  onClose,
  onToggleFavorite,
  onToggleSaved,
  onTrackWhatsappClick,
}: ProductDetailModalProps) {
  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const waUrl = buildWhatsappUrl(whatsappNumber, product);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f2a24]/55 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[#fbfaf6] border border-[#dde5db] shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail produk"
          className="absolute top-3.5 right-3.5 z-10 w-10 h-10 rounded-xl bg-white/95 border border-[#dde5db] text-[#1f2a24] hover:bg-[#eef3ec] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Large Photo */}
          <div className="bg-[#eef3ec] aspect-[4/3] md:aspect-auto md:min-h-[380px]">
            <BagImage
              src={product.image_url}
              alt={product.name}
              fallbackLabel={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right: Info & Actions */}
          <div className="p-6 sm:p-7 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#69766d]">
                <span>{product.category}</span>
                {product.label && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#c8643f] font-medium">{product.label}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className={product.is_available ? 'text-[#2f4a3d] font-medium' : 'text-[#c8643f] font-medium'}>
                  {product.is_available ? `Tersedia (Stok: ${product.stock})` : 'Stok Habis'}
                </span>
              </div>

              <h2 id="detail-modal-title" className="font-serif-brand text-2xl sm:text-3xl text-[#1f2a24]">
                {product.name}
              </h2>

              <div className="text-2xl font-semibold text-[#2f4a3d] tabular-nums">
                {formatRupiah(product.price)}
              </div>

              <p className="text-sm text-[#69766d] leading-relaxed pt-2 border-t border-[#dde5db]">
                {product.description}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(product.id)}
                  aria-pressed={isFavorite}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    isFavorite
                      ? 'bg-[#c8643f] border-[#c8643f] text-white'
                      : 'bg-white border-[#dde5db] text-[#1f2a24] hover:border-[#c8643f]'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                  <span>{isFavorite ? 'Difavoritkan' : 'Favorit'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleSaved(product.id)}
                  aria-pressed={isSaved}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    isSaved
                      ? 'bg-[#2f4a3d] border-[#2f4a3d] text-white'
                      : 'bg-white border-[#dde5db] text-[#1f2a24] hover:border-[#2f4a3d]'
                  }`}
                >
                  <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                  <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
                </button>
              </div>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onTrackWhatsappClick(product.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-sm font-medium hover:bg-[#c8643f] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pesan via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
