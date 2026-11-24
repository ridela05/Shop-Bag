import { useState, type FormEvent } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { secureJsonRequest } from '../lib/e2ee.ts';

interface AdminLoginProps {
  storeName: string;
  onLoginSuccess: (token: string, username: string) => void;
  onBackToStore: () => void;
}

export function AdminLogin({ storeName, onLoginSuccess, onBackToStore }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await secureJsonRequest<{
        token?: string;
        username?: string;
        error?: string;
      }>('/api/admin/login', {
        method: 'POST',
        body: {
          username: username.trim(),
          password,
        },
      });

      if (!res.ok || !res.data.token || !res.data.username) {
        setError(res.data.error || 'Login gagal. Periksa kembali username dan password.');
        return;
      }

      onLoginSuccess(res.data.token, res.data.username);
    } catch {
      setError('Tidak dapat terhubung ke server. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#1f2a24] flex flex-col justify-between px-4 py-8">
      <div className="max-w-md w-full mx-auto my-auto">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-sm text-[#69766d] hover:text-[#2f4a3d] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Toko</span>
        </button>

        <div className="rounded-2xl bg-white border border-[#dde5db] shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef3ec] text-[#2f4a3d] mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <div className="font-serif-brand text-2xl font-bold text-[#2f4a3d]">
              {storeName}
            </div>
            <h1 className="font-serif-brand text-lg text-[#1f2a24] mt-1">
              Masuk Dashboard Admin
            </h1>
            <p className="text-xs text-[#69766d] mt-1">
              Kelola katalog tas, pantau klik WhatsApp, dan perbarui pengaturan toko.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-xl bg-[#f4c9b0]/45 border border-[#c8643f]/40 text-xs sm:text-sm text-[#1f2a24]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-[#1f2a24] mb-1.5">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbfaf6] border border-[#dde5db] text-sm text-[#1f2a24] focus:outline-none focus:border-[#2f4a3d]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#2f4a3d] text-[#fbfaf6] text-sm font-medium hover:bg-[#c8643f] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#eef3ec] flex items-center justify-center gap-1.5 text-[11px] text-[#69766d]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2f4a3d]" />
            <span>Kredensial dikirim dengan enkripsi ujung-ke-ujung</span>
          </div>
        </div>
      </div>
    </div>
  );
}
