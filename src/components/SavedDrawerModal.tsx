import { useEffect } from 'react';
import { Bookmark, Heart, MessageCircle, Trash2, X } from 'lucide-react';
import { buildWhatsappUrl, formatRupiah } from '../lib/format.ts';
import type { Product } from '../types.ts';
import { BagImage } from './BagImage.tsx';

interface SavedDrawerModalProps {
  mode: 'favorites' | 'saved' | null;
  items: Product[];
  whatsappNumber: string;
  onClose: () => void;
  onRemoveItem: (productId: number) => void;
  onOpenDetail: (product: Product) => void;
  onTrackWhatsappClick: (productId: number) => void;
}

export function SavedDrawerModal({
  mode,
  items,
  whatsappNumber,
  onClose,
  onRemoveItem,
  onOpenDetail,
  onTrackWhatsappClick,
}: SavedDrawerModalProps) {
  useEffect(() => {
    if (!mode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, onClose]);

  if (!mode) return null;

  const isFavorites = mode === 'favorites';
  const title = isFavorites ? 'Daftar Favorit' : 'Daftar Simpan';
  const subtitle = isFavorites
    ? 'Tas yang kamu sukai tersimpan otomatis di peramban ini.'
    : 'Tas yang kamu simpan untuk dilihat atau dipesan nanti.';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1f2a24]/50 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className="w-full max-w-md bg-[#fbfaf6] h-full border-l border-[#dde5db] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#dde5db] flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isFavorites ? 'bg-[#f4c9b0]/55 text-[#c8643f]' : 'bg-[#eef3ec] text-[#2f4a3d]'
              }`}
            >
              {isFavorites ? <Heart className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="drawer-title" className="font-serif-brand text-lg font-semibold text-[#1f2a24]">
                {title} ({items.length})
              </h2>
              <p className="text-xs text-[#69766d]">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar"
            className="w-10 h-10 rounded-xl border border-[#dde5db] text-[#1f2a24] hover:bg-[#eef3ec] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-[#dde5db] bg-[#eef3ec]/45 p-8 text-center mt-6">
              <p className="font-serif-brand text-base text-[#1f2a24]">
                Belum ada produk di {title}
              </p>
              <p className="text-xs text-[#69766d] mt-1.5">
                Klik ikon {isFavorites ? 'hati' : 'simpan'} pada kartu produk untuk menambahkannya ke sini.
              </p>
            </div>
          ) : (
            items.map((product) => (
              <div
                key={product.id}
                className="flex gap-3.5 p-3 rounded-2xl bg-white border border-[#dde5db]"
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetail(product);
                  }}
                  className="w-20 h-20 rounded-xl overflow-hidden bg-[#eef3ec] shrink-0 cursor-pointer"
                >
                  <BagImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDetail(product);
                        }}
                        className="font-serif-brand text-sm font-semibold text-[#1f2a24] hover:text-[#c8643f] text-left truncate cursor-pointer"
                      >
                        {product.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        aria-label={`Hapus ${product.name}`}
                        className="text-[#69766d] hover:text-[#c8643f] p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#69766d]">{product.category}</p>
                    <p className="text-sm font-semibold text-[#2f4a3d] mt-1 tabular-nums">
                      {formatRupiah(product.price)}
                    </p>
                  </div>

                  <div className="mt-2">
                    <a
                      href={buildWhatsappUrl(whatsappNumber, product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onTrackWhatsappClick(product.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2f4a3d] text-[#fbfaf6] text-xs font-medium hover:bg-[#c8643f] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Pesan via WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
