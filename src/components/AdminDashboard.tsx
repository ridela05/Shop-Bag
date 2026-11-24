import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  Edit3,
  KeyRound,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Settings,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { secureJsonRequest, secureMultipartRequest } from '../lib/e2ee.ts';
import { formatRupiah } from '../lib/format.ts';
import {
  PRODUCT_CATEGORY_OPTIONS,
  type AdminDashboardData,
  type AdminProduct,
  type ProductCategoryOption,
  type StoreSettings,
} from '../types.ts';
import { BagImage } from './BagImage.tsx';

interface AdminDashboardProps {
  token: string;
  username: string;
  onUnauthorized: () => void;
  onLogout: () => void;
  onBackToStore: () => void;
  onDataUpdated: () => void;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductFormState {
  name: string;
  price: string;
  category: ProductCategoryOption;
  description: string;
  label: string;
  stock: string;
  is_available: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  price: '',
  category: 'Handbag',
  description: '',
  label: '',
  stock: '10',
  is_available: true,
};

export function AdminDashboard({
  token,
  username,
  onUnauthorized,
  onLogout,
  onBackToStore,
  onDataUpdated,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Product Add/Edit Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Settings Form
  const [settingsForm, setSettingsForm] = useState<StoreSettings>({
    store_name: 'SHOP BAG.',
    store_tagline: 'Find Your Everyday Style.',
    whatsapp_number: '6281234567890',
    footer_address: '',
    footer_contact: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Change Password Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await secureJsonRequest<AdminDashboardData & { error?: string }>('/api/admin/dashboard', {
        method: 'GET',
        token,
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setNotice({ type: 'error', text: res.data.error || 'Gagal memuat dashboard.' });
        return;
      }
      setDashboard(res.data);
      setSettingsForm(res.data.settings);
    } catch {
      setNotice({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormState(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreviewUrl('');
    setFormError(null);
    setProductModalOpen(true);
  };

  const openEditModal = (product: AdminProduct) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      price: String(product.price),
      category: product.category,
      description: product.description,
      label: product.label,
      stock: String(product.stock),
      is_available: product.is_available,
    });
    setPhotoFile(null);
    setPhotoPreviewUrl(product.image_url);
    setFormError(null);
    setProductModalOpen(true);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFormError('Format foto harus JPG, PNG, atau WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFormError('Ukuran foto maksimal 2 MB.');
      e.target.value = '';
      return;
    }

    if (photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = Number(formState.price);
    const stockNum = Number(formState.stock);

    if (formState.name.trim().length < 2) {
      setFormError('Nama produk minimal 2 karakter.');
      return;
    }
    if (!Number.isInteger(priceNum) || priceNum < 1000) {
      setFormError('Harga harus berupa angka bulat minimal Rp1.000.');
      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setFormError('Stok tidak boleh negatif.');
      return;
    }
    if (formState.description.trim().length < 5) {
      setFormError('Deskripsi minimal 5 karakter.');
      return;
    }
    if (!editingProduct && !photoFile) {
      setFormError('Foto produk wajib diunggah (JPG/PNG/WebP, maks 2 MB).');
      return;
    }

    setSavingProduct(true);
    try {
      const metadata = {
        name: formState.name.trim(),
        price: priceNum,
        category: formState.category,
        description: formState.description.trim(),
        label: formState.label.trim(),
        stock: stockNum,
        is_available: stockNum === 0 ? false : formState.is_available,
      };

      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await secureMultipartRequest<{ product?: AdminProduct; error?: string }>(
        url,
        method,
        metadata,
        photoFile,
        token
      );

      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setFormError(res.data.error || 'Gagal menyimpan produk.');
        return;
      }

      setProductModalOpen(false);
      setNotice({
        type: 'success',
        text: editingProduct ? 'Produk berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.',
      });
      await loadDashboard();
      onDataUpdated();
    } catch {
      setFormError('Gagal terhubung ke server saat menyimpan produk.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await secureJsonRequest<{ ok?: boolean; error?: string }>(
        `/api/admin/products/${deleteTarget.id}`,
        {
          method: 'DELETE',
          token,
        }
      );

      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setNotice({ type: 'error', text: res.data.error || 'Gagal menghapus produk.' });
        return;
      }

      setDeleteTarget(null);
      setNotice({ type: 'success', text: `Produk "${deleteTarget.name}" telah dihapus.` });
      await loadDashboard();
      onDataUpdated();
    } catch {
      setNotice({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setNotice(null);

    try {
      const res = await secureJsonRequest<{ settings?: StoreSettings; error?: string }>(
        '/api/admin/settings',
        {
          method: 'PUT',
          token,
          body: settingsForm,
        }
      );

      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !res.data.settings) {
        setNotice({ type: 'error', text: res.data.error || 'Gagal memperbarui pengaturan toko.' });
        return;
      }

      setSettingsForm(res.data.settings);
      setNotice({ type: 'success', text: 'Pengaturan toko berhasil disimpan.' });
      await loadDashboard();
      onDataUpdated();
    } catch {
      setNotice({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await secureJsonRequest<{ ok?: boolean; message?: string; error?: string }>(
        '/api/admin/password',
        {
          method: 'POST',
          token,
          body: {
            currentPassword,
            newPassword,
            confirmPassword,
          },
        }
      );

      if (res.status === 401 && res.data.error?.includes('Sesi')) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setPasswordError(res.data.error || 'Gagal mengganti password.');
        return;
      }

      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ type: 'success', text: res.data.message || 'Password admin berhasil diperbarui.' });
    } catch {
      setPasswordError('Gagal terhubung ke server.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#1f2a24]">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#dde5db]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dde5db] text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec] transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lihat Toko</span>
            </button>
            <div className="min-w-0">
              <span className="font-serif-brand text-lg font-bold text-[#2f4a3d] truncate block">
                {settingsForm.store_name} Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline text-xs text-[#69766d] mr-1">
              Masuk sebagai <strong className="text-[#1f2a24]">{username}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setPasswordModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dde5db] bg-[#fbfaf6] text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec] transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganti Password</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-xs font-medium hover:bg-[#c8643f] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {notice && (
          <div
            role="status"
            className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between gap-3 ${
              notice.type === 'success'
                ? 'bg-[#eef3ec] border-[#a9bfa8] text-[#2f4a3d]'
                : 'bg-[#f4c9b0]/45 border-[#c8643f]/50 text-[#1f2a24]'
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Tutup pemberitahuan"
              className="p-1 hover:opacity-70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <section aria-label="Ringkasan toko">
          <h1 className="font-serif-brand text-2xl sm:text-3xl text-[#1f2a24] mb-4">
            Ringkasan Toko
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-[#dde5db] p-5">
              <div className="flex items-center justify-between text-xs text-[#69766d]">
                <span>Total Produk</span>
                <Package className="w-4 h-4 text-[#2f4a3d]" />
              </div>
              <div className="font-serif-brand text-3xl font-bold text-[#1f2a24] mt-2 tabular-nums">
                {loading ? '—' : dashboard?.summary.totalProducts ?? 0}
              </div>
              <p className="text-xs text-[#69766d] mt-1">Produk tersimpan di database</p>
            </div>

            <div className="rounded-2xl bg-white border border-[#dde5db] p-5">
              <div className="flex items-center justify-between text-xs text-[#69766d]">
                <span>Total Klik WhatsApp</span>
                <MessageCircle className="w-4 h-4 text-[#c8643f]" />
              </div>
              <div className="font-serif-brand text-3xl font-bold text-[#1f2a24] mt-2 tabular-nums">
                {loading ? '—' : dashboard?.summary.totalWhatsappClicks ?? 0}
              </div>
              <p className="text-xs text-[#69766d] mt-1">Akumulasi minat pesan pelanggan</p>
            </div>

            <div className="rounded-2xl bg-white border border-[#dde5db] p-5">
              <div className="flex items-center justify-between text-xs text-[#69766d]">
                <span>Klik WhatsApp Terbanyak</span>
                <TrendingUp className="w-4 h-4 text-[#2f4a3d]" />
              </div>
              {loading ? (
                <div className="font-serif-brand text-xl font-bold text-[#1f2a24] mt-2">—</div>
              ) : dashboard?.summary.topProduct ? (
                <>
                  <div className="font-serif-brand text-xl font-bold text-[#2f4a3d] mt-2 truncate">
                    {dashboard.summary.topProduct.name}
                  </div>
                  <p className="text-xs text-[#69766d] mt-1 tabular-nums">
                    {dashboard.summary.topProduct.whatsapp_clicks} klik · {dashboard.summary.topProduct.category}
                  </p>
                </>
              ) : (
                <>
                  <div className="font-serif-brand text-lg font-semibold text-[#69766d] mt-2">
                    Belum ada klik
                  </div>
                  <p className="text-xs text-[#69766d] mt-1">Menunggu klik pesan pelanggan</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-[#dde5db] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#2f4a3d] text-[#fbfaf6]'
                : 'bg-white border border-[#dde5db] text-[#1f2a24] hover:bg-[#eef3ec]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Kelola Produk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#2f4a3d] text-[#fbfaf6]'
                : 'bg-white border border-[#dde5db] text-[#1f2a24] hover:bg-[#eef3ec]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Toko</span>
          </button>
        </div>

        {/* Products Management Tab */}
        {activeTab === 'products' ? (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif-brand text-xl text-[#1f2a24]">Daftar Produk</h2>
                <p className="text-xs text-[#69766d]">
                  Tambah, ubah, atau hapus tas. Perubahan langsung tampil di katalog pelanggan.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-sm font-medium hover:bg-[#c8643f] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk</span>
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white border border-[#dde5db] p-8 text-center text-sm text-[#69766d]">
                Memuat daftar produk...
              </div>
            ) : !dashboard || dashboard.products.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[#dde5db] p-8 text-center text-sm text-[#69766d]">
                Belum ada produk. Klik "Tambah Produk" untuk mulai menambahkan.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-2xl bg-white border border-[#dde5db] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#dde5db] bg-[#eef3ec]/60 text-xs font-medium text-[#69766d]">
                          <th className="py-3.5 px-4">Produk</th>
                          <th className="py-3.5 px-4">Kategori</th>
                          <th className="py-3.5 px-4">Harga</th>
                          <th className="py-3.5 px-4">Status & Stok</th>
                          <th className="py-3.5 px-4 text-right">Klik WA</th>
                          <th className="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef3ec] text-sm">
                        {dashboard.products.map((product) => (
                          <tr key={product.id} className="hover:bg-[#fbfaf6]">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#eef3ec] shrink-0">
                                  <BagImage
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-serif-brand font-semibold text-[#1f2a24]">
                                    {product.name}
                                  </div>
                                  {product.label && (
                                    <div className="text-xs text-[#c8643f]">{product.label}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#69766d]">{product.category}</td>
                            <td className="py-3.5 px-4 font-medium text-[#2f4a3d] tabular-nums">
                              {formatRupiah(product.price)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-xs font-medium ${
                                  product.is_available ? 'text-[#2f4a3d]' : 'text-[#c8643f]'
                                }`}
                              >
                                {product.is_available ? `Tersedia (${product.stock})` : 'Stok Habis'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right tabular-nums font-medium">
                              {product.whatsapp_clicks}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(product)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dde5db] text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec] cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(product)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dde5db] text-xs font-medium text-[#c8643f] hover:bg-[#f4c9b0]/35 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Product Cards */}
                <div className="md:hidden space-y-3">
                  {dashboard.products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl bg-white border border-[#dde5db] p-4 space-y-3"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#eef3ec] shrink-0">
                          <BagImage
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif-brand font-semibold text-[#1f2a24] truncate">
                            {product.name}
                          </div>
                          <div className="text-xs text-[#69766d]">
                            {product.category} · {formatRupiah(product.price)}
                          </div>
                          <div className="text-xs mt-1 flex items-center gap-2">
                            <span className={product.is_available ? 'text-[#2f4a3d]' : 'text-[#c8643f]'}>
                              {product.is_available ? `Tersedia (${product.stock})` : 'Stok Habis'}
                            </span>
                            <span className="text-[#69766d] tabular-nums">
                              · {product.whatsapp_clicks} klik WA
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#eef3ec]">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#dde5db] text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#dde5db] text-xs font-medium text-[#c8643f] hover:bg-[#f4c9b0]/35"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          /* Store Settings Tab */
          <section className="max-w-2xl">
            <div className="rounded-2xl bg-white border border-[#dde5db] p-6 sm:p-7 space-y-5">
              <div>
                <h2 className="font-serif-brand text-xl text-[#1f2a24]">Pengaturan Toko</h2>
                <p className="text-xs text-[#69766d] mt-1">
                  Nomor WhatsApp di sini digunakan oleh seluruh tombol pemesanan pelanggan.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label htmlFor="setting-wa" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Nomor WhatsApp Toko (format internasional, mis. 6281234567890)
                  </label>
                  <input
                    id="setting-wa"
                    type="text"
                    value={settingsForm.whatsapp_number}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, whatsapp_number: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] tabular-nums focus:outline-none focus:border-[#2f4a3d]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="setting-name" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                      Nama Toko
                    </label>
                    <input
                      id="setting-name"
                      type="text"
                      value={settingsForm.store_name}
                      onChange={(e) => setSettingsForm((s) => ({ ...s, store_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="setting-tagline" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                      Tagline
                    </label>
                    <input
                      id="setting-tagline"
                      type="text"
                      value={settingsForm.store_tagline}
                      onChange={(e) => setSettingsForm((s) => ({ ...s, store_tagline: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="setting-address" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Alamat Toko (Footer)
                  </label>
                  <input
                    id="setting-address"
                    type="text"
                    value={settingsForm.footer_address}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, footer_address: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="setting-contact" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Kontak & Jam Operasional (Footer)
                  </label>
                  <input
                    id="setting-contact"
                    type="text"
                    value={settingsForm.footer_contact}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, footer_contact: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-sm font-medium hover:bg-[#c8643f] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Product Add/Edit Modal */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f2a24]/55 backdrop-blur-xs"
          onClick={() => setProductModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[#fbfaf6] border border-[#dde5db] shadow-xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-serif-brand text-xl text-[#1f2a24]">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-[#dde5db] flex items-center justify-center hover:bg-[#eef3ec] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#f4c9b0]/45 border border-[#c8643f]/50 text-xs text-[#1f2a24]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Luna Mini Handbag"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((f) => ({ ...f, category: e.target.value as ProductCategoryOption }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  >
                    {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={formState.price}
                    onChange={(e) => setFormState((f) => ({ ...f, price: e.target.value }))}
                    placeholder="245000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm tabular-nums focus:outline-none focus:border-[#2f4a3d]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Label (opsional)
                  </label>
                  <input
                    type="text"
                    value={formState.label}
                    onChange={(e) => setFormState((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Best Seller / New / Favorit"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.stock}
                    onChange={(e) => setFormState((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm tabular-nums focus:outline-none focus:border-[#2f4a3d]"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  id="prod-available"
                  type="checkbox"
                  checked={formState.is_available}
                  onChange={(e) => setFormState((f) => ({ ...f, is_available: e.target.checked }))}
                  className="w-4 h-4 accent-[#2f4a3d] rounded"
                />
                <label htmlFor="prod-available" className="text-xs font-medium text-[#1f2a24]">
                  Tampilkan sebagai Tersedia untuk dipesan
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Jelaskan bahan, ukuran, dan keunggulan tas..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  required
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                  Foto Produk (JPG, PNG, atau WebP · Maks 2 MB)
                </label>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#eef3ec] border border-[#dde5db] shrink-0">
                    {photoPreviewUrl ? (
                      <BagImage
                        src={photoPreviewUrl}
                        alt="Pratinjau foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-[#69766d]">
                        Belum ada
                      </div>
                    )}
                  </div>

                  <label className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#a9bfa8] bg-white hover:bg-[#eef3ec]/55 text-xs font-medium text-[#2f4a3d] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{photoFile ? photoFile.name : 'Pilih File Foto...'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#dde5db] bg-white text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2.5 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-xs font-medium hover:bg-[#c8643f] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {savingProduct ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f2a24]/55 backdrop-blur-xs"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#fbfaf6] border border-[#dde5db] shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-brand text-lg font-semibold text-[#1f2a24]">
              Hapus Produk?
            </h3>
            <p className="text-sm text-[#69766d]">
              Produk <strong className="text-[#1f2a24]">{deleteTarget.name}</strong> akan dihapus permanen dari katalog dan database.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#dde5db] bg-white text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#c8643f] text-white text-xs font-medium hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f2a24]/55 backdrop-blur-xs"
          onClick={() => setPasswordModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#fbfaf6] border border-[#dde5db] shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-brand text-xl text-[#1f2a24]">Ganti Password Admin</h3>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-[#dde5db] flex items-center justify-center hover:bg-[#eef3ec] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="px-4 py-2.5 rounded-xl bg-[#f4c9b0]/45 border border-[#c8643f]/50 text-xs text-[#1f2a24]">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1f2a24] mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1f2a24] mb-1">
                  Password Baru (minimal 6 karakter)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1f2a24] mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde5db] text-sm focus:outline-none focus:border-[#2f4a3d]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#dde5db] bg-white text-xs font-medium text-[#1f2a24] hover:bg-[#eef3ec] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-xs font-medium hover:bg-[#c8643f] disabled:opacity-60 cursor-pointer"
                >
                  {savingPassword ? 'Memperbarui...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
