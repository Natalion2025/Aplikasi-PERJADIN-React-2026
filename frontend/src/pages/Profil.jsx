import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Briefcase,
  Hash,
  Shield,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import profilePic from '../assets/pns_female_profile.png';

const getAvatarUrl = (photoPath) => {
  if (!photoPath) return '';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `${cleanBase}${cleanPath}`;
};

const Profil = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    username: '',
    nip: '',
    jabatan: '',
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        username: user.username || '',
        nip: user.nip || '',
        jabatan: user.jabatan || '',
      });
      setPreviewUrl(
        user.foto_profil ? getAvatarUrl(user.foto_profil) : ''
      );
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran file foto maksimal adalah 5MB.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('username', form.username);
    formData.append('nip', form.nip || '');
    formData.append('jabatan', form.jabatan || '');
    if (selectedFile) {
      formData.append('foto_profil', selectedFile);
    }

    try {
      const response = await axios.put('/api/user/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess(response.data.message || 'Profil berhasil diperbarui.');

      // Fetch the updated session data to update context
      const sessionRes = await axios.get('/api/user/session');
      if (sessionRes.data && sessionRes.data.user) {
        setUser(sessionRes.data.user);
      }
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Profil Saya</h1>
        <p className="text-sm text-slate-500">
          Lihat dan perbarui informasi pribadi serta pengaturan kepegawaian Anda.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Display */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative group">
            <img
              src={
                previewUrl ||
                (user?.foto_profil
                  ? getAvatarUrl(user.foto_profil)
                  : profilePic)
              }
              alt={user?.name}
              className="w-36 h-36 rounded-full object-cover border-4 border-slate-50 dark:border-slate-700 shadow-md"
            />

            <label className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer shadow-lg transition-all">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500" />
            </label>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-850 dark:text-slate-50">{user?.name}</h2>
            <p className="text-xs text-slate-400 font-mono">@{user?.username}</p>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400 px-3.5 py-2 rounded-xl">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>
                Hak Akses:{' '}
                <strong className="capitalize text-slate-700 dark:text-slate-300">
                  {user?.role}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Update Details Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-base font-bold text-slate-850 dark:text-slate-50">
              Detail Informasi Akun
            </h3>
            <p className="text-xs text-slate-400">
              Silakan ubah field di bawah ini kemudian klik Simpan Perubahan.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-xl flex items-center gap-2.5 text-sm border border-red-100 dark:border-red-900/40">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2.5 text-sm border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    disabled={user?.role === 'superadmin'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed font-mono dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>
                {user?.role === 'superadmin' && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    Username Super Admin tidak dapat diubah demi alasan keamanan.
                  </p>
                )}
              </div>

              {/* NIP */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  NIP
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    name="nip"
                    value={form.nip}
                    onChange={handleChange}
                    placeholder="Masukkan NIP Anda"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Jabatan */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Jabatan Kepegawaian
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    name="jabatan"
                    value={form.jabatan}
                    onChange={handleChange}
                    placeholder="Contoh: Staff Sub-Bagian Keuangan"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profil;
