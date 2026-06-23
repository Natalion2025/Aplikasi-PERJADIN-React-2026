import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

const Setelan = () => {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load theme settings from localStorage on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (passwords.newPassword.length < 6) {
      setError('Password baru minimal harus 6 karakter.');
      setLoading(false);
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Konfirmasi password tidak sesuai.');
      setLoading(false);
      return;
    }

    try {
      // Put to /api/user/profile with password fields
      const response = await axios.put('/api/user/profile', {
        name: user.name,
        username: user.username,
        nip: user.nip || '',
        jabatan: user.jabatan || '',
        newPassword: passwords.newPassword
      });

      setSuccess(response.data.message || 'Password berhasil diperbarui.');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Gagal merubah password:', err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat memperbarui password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Setelan Akun</h1>
        <p className="text-sm text-slate-500">Kelola keamanan akun dan preferensi tampilan aplikasi Anda.</p>
      </div>

      {/* Theme Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Tampilan & Preferensi</h3>
          <p className="text-xs text-slate-400 mt-0.5">Atur tema gelap dan kustomisasi visual.</p>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700 pt-4">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            {darkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <span className="text-sm font-medium">Mode Tampilan Gelap</span>
          </div>
          <button
            onClick={handleToggleTheme}
            className={`w-12 h-6.5 rounded-full p-1 transition-all ${
              darkMode ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <div
              className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${
                darkMode ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Keamanan & Ubah Password</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ubah kata sandi secara berkala untuk menjaga keamanan akses sistem.</p>
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

        <form onSubmit={handleSubmitPassword} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                required
                placeholder="Minimal 6 karakter"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="password"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                required
                placeholder="Ketik ulang password baru"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
              />
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
              <span>Ubah Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Setelan;
