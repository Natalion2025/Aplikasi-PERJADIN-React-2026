import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  UserPlus,
  UserCheck,
} from 'lucide-react';

const getAvatarUrl = (photoPath) => {
  if (!photoPath) return '';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `${cleanBase}${cleanPath}`;
};

const Pengguna = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = Tambah, otherwise Edit
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user',
    nip: '',
    jabatan: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Gagal memuat pengguna:', err);
      setError('Gagal memuat daftar pengguna. Pastikan Anda memiliki hak akses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      name: '',
      username: '',
      password: '',
      role: 'user',
      nip: '',
      jabatan: '',
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name || '',
      username: user.username || '',
      password: '', // Kosongkan password saat edit, diisi hanya jika ingin merubah
      role: user.role || 'user',
      nip: user.nip || '',
      jabatan: user.jabatan || '',
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        // Edit User
        const response = await axios.put(`/api/users/${editingId}`, form);
        setSuccess(response.data.message || 'Data pengguna berhasil diperbarui.');
      } else {
        // Tambah User
        const response = await axios.post('/api/users', form);
        setSuccess(response.data.message || 'Pengguna baru berhasil ditambahkan.');
      }

      // Reload
      fetchUsers();
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Gagal menyimpan pengguna:', err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus pengguna "${user.name}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      try {
        const response = await axios.delete(`/api/users/${user.id}`);
        alert(response.data.message || 'Pengguna berhasil dihapus.');
        fetchUsers();
      } catch (err) {
        console.error('Gagal menghapus pengguna:', err);
        alert(err.response?.data?.message || 'Gagal menghapus pengguna.');
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    const n = (u.name || '').toLowerCase();
    const us = (u.username || '').toLowerCase();
    const j = (u.jabatan || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return n.includes(q) || us.includes(q) || j.includes(q);
  });

  // Cek Hak Akses Edit/Delete sesuai aturan legacy
  const checkPermissions = (targetUser) => {
    let canEdit = false;
    let canDelete = false;

    if (currentUser?.role === 'superadmin') {
      canEdit = true;
      if (targetUser.role !== 'superadmin' && targetUser.id !== currentUser.id) {
        canDelete = true;
      }
    } else if (currentUser?.role === 'admin') {
      if (targetUser.role === 'user') {
        canEdit = true;
        canDelete = true;
      }
    }

    return { canEdit, canDelete };
  };

  const isAllowedToCreate = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-500">
            Kelola akun administrator, operator, dan pengaudit aplikasi PERJADIN.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-none dark:text-slate-100"
            />
          </div>
          {isAllowedToCreate && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-mauve-100 hover:bg-mauve-200 text-mauve-700 rounded-2xl text-sm font-semibold shadow-md border border-mauve-300 whitespace-nowrap transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pengguna</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Memuat data pengguna...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <UserCheck className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold">Tidak ada pengguna ditemukan</p>
            <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">
                <tr className="bg-mauve-500 text-slate-100 border-b-2 border-mauve-500 border-double text-xs uppercase font-bold">
                  <th className="px-6 py-4 shadow-[inset_0_-2px_0_0_#ffffff]">Nama Lengkap</th>
                  <th className="px-6 py-4 shadow-[inset_0_-2px_0_0_#ffffff]">Username</th>
                  <th className="px-6 py-4 shadow-[inset_0_-2px_0_0_#ffffff]">NIP / Jabatan</th>
                  <th className="px-6 py-4 shadow-[inset_0_-2px_0_0_#ffffff]">Peran (Role)</th>
                  <th className="px-6 py-4 text-center shadow-[inset_0_-2px_0_0_#ffffff]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((userRow) => {
                  const { canEdit, canDelete } = checkPermissions(userRow);
                  return (
                    <tr
                      key={userRow.id}
                      className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <td className="px-6 py-3 whitespace-nowrap align-top">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              userRow.foto_profil
                                ? getAvatarUrl(userRow.foto_profil)
                                : 'https://api.dicebear.com/7.x/adventurer/svg?seed=' +
                                  userRow.username
                            }
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                          />
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {userRow.name}
                            </div>
                            {userRow.id === currentUser?.id && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold dark:text-indigo-400 dark:bg-indigo-950/40">
                                Sesi Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                        @{userRow.username}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap align-top">
                        <div className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                          {userRow.nip || '-'}
                        </div>
                        <div className="text-slate-700 font-medium text-xs mt-0.5">
                          {userRow.jabatan || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            userRow.role === 'superadmin'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-950'
                              : userRow.role === 'admin'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-950'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span className="capitalize">{userRow.role}</span>
                        </span>
                      </td>
                      <td className="pl-10 pr-0 py-3 whitespace-nowrap text-center flex items-center space-x-2 align-top">
                        {canEdit ? (
                          <button
                            onClick={() => handleOpenEdit(userRow)}
                            className="p-1  hover:text-orange-600 bg-slate-50 hover:bg-mauve-50 dark:bg-slate-800 dark:hover:bg-mauve-950/30 rounded-lg transition-all"
                            title="Edit Pengguna"
                          >
                            <Edit className="w-4 h-4 text-mauve-700" />
                          </button>
                        ) : (
                          <span className="p-1  dark:text-slate-600" title="Hak akses ditolak">
                            <Edit className="w-4 h-4 text-mauve-700" />
                          </span>
                        )}

                        {canDelete ? (
                          <button
                            onClick={() => handleDelete(userRow)}
                            className="p-1 hover:text-red-600 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4 text-mauve-700" />
                          </button>
                        ) : (
                          <span className="p-1  dark:text-slate-600 " title="Tidak dapat dihapus">
                            <Trash2 className="w-4 h-4 text-slate-300" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-start p-6 bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-800 dark:to-teal-700 text-white">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-100 dark:text-slate-50">
                  {editingId ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
                </h3>
              </div>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors duration-200 dark:text-slate-200 dark:hover:text-slate-400 p-1 rounded-full hover:bg-slate-100/20"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
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
                <div className="grid grid-cols-2 gap-4">
                  {/* Nama Lengkap */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      required
                      placeholder="budi_s"
                      className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Peran (Role)
                    </label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      required
                      disabled={currentUser?.role === 'admin' && form.role !== 'user'}
                      className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                    >
                      <option value="user">User / Operator</option>
                      {currentUser?.role === 'superadmin' && (
                        <>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Password */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Password{' '}
                      {editingId && (
                        <span className="text-[10px] text-slate-400 lowercase">
                          (kosongkan jika tidak diubah)
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required={!editingId}
                      placeholder="••••••••"
                      className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                    />
                  </div>

                  {/* NIP */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      NIP (Opsional)
                    </label>
                    <input
                      type="text"
                      name="nip"
                      value={form.nip}
                      onChange={handleChange}
                      placeholder="19901234567890"
                      className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                    />
                  </div>

                  {/* Jabatan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Jabatan (Opsional)
                    </label>
                    <input
                      type="text"
                      name="jabatan"
                      value={form.jabatan}
                      onChange={handleChange}
                      placeholder="Contoh: Bendahara Pengeluaran"
                      className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    className="px-4.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 dark:bg-emerald-800/40 dark:hover:bg-emerald-700/40 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pengguna;
