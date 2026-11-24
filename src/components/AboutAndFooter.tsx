import { ShieldCheck } from 'lucide-react';
import type { StoreSettings } from '../types.ts';

interface AboutAndFooterProps {
  settings: StoreSettings;
  onNavigateSection: (sectionId: string) => void;
  onOpenAdmin: () => void;
}

export function AboutAndFooter({ settings, onNavigateSection, onOpenAdmin }: AboutAndFooterProps) {
  return (
    <>
      {/* Tentang Section */}
      <section id="tentang" className="py-12 sm:py-16 border-t border-[#dde5db] bg-[#eef3ec]/45">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <p className="text-xs font-medium tracking-wide text-[#c8643f]">
                Tentang {settings.store_name}
              </p>
              <h2 className="font-serif-brand text-2xl sm:text-3xl text-[#1f2a24]">
                Didesain untuk menemani ritme harian dengan tenang.
              </h2>
              <p className="text-sm sm:text-base text-[#69766d] leading-relaxed">
                {settings.store_name} percaya tas terbaik adalah tas yang ringan dipakai, rapi menyimpan barang esensial, dan tetap relevan melampaui musim tren. Setiap koleksi dikurasi dengan material pilihan—mulai dari kanvas katun organik hingga kulit pebble lembut.
              </p>
            </div>

            <div className="md:col-span-5 rounded-2xl bg-[#fbfaf6] border border-[#dde5db] p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="font-serif-brand text-base font-semibold text-[#2f4a3d]">
                  Pemesanan Cepat & Personal
                </h3>
                <p className="text-xs sm:text-sm text-[#69766d] leading-relaxed">
                  Tidak perlu proses checkout yang rumit. Pilih tas favoritmu, klik tombol pesan, dan tim kami siap membantu cek stok serta pengiriman langsung lewat WhatsApp.
                </p>
              </div>
              <div className="pt-3 border-t border-[#dde5db] flex items-center gap-2 text-xs text-[#2f4a3d]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Transaksi terhubung langsung dengan kontak resmi toko</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Forest Green Footer */}
      <footer className="bg-[#2f4a3d] text-[#fbfaf6] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#fbfaf6]/15">
            <div className="md:col-span-5 space-y-2.5">
              <div className="font-serif-brand text-2xl font-bold tracking-tight">
                {settings.store_name}
              </div>
              <p className="text-sm text-[#eef3ec]/80">
                {settings.store_tagline}
              </p>
            </div>

            <div className="md:col-span-3 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#a9bfa8]">
                Navigasi
              </h4>
              <ul className="space-y-1.5 text-sm text-[#eef3ec]/85">
                {['beranda', 'kategori', 'katalog', 'tentang'].map((id) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateSection(id);
                      }}
                      className="capitalize hover:text-[#f4c9b0] transition-colors"
                    >
                      {id}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#a9bfa8]">
                Alamat & Kontak
              </h4>
              <p className="text-sm text-[#eef3ec]/85 leading-relaxed">
                {settings.footer_address}
              </p>
              <p className="text-xs text-[#eef3ec]/75 leading-relaxed">
                {settings.footer_contact}
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#eef3ec]/75">
            <p>
              © {new Date().getFullYear()} {settings.store_name} Seluruh hak cipta dilindungi.
            </p>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-xs text-[#eef3ec]/70 hover:text-[#f4c9b0] underline underline-offset-4 transition-colors cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
