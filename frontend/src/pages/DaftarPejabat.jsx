import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

const DaftarPejabat = () => {
  const { user } = useAuth();
  const isAdminOrSuper = user && (user.role === 'admin' || user.role === 'superadmin');
  const [pejabatList, setPejabatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = Tambah, otherwise Edit
  const [form, setForm] = useState({
    nama: '',
    jabatan: '',
    nip: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPejabat = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/pejabat');
      setPejabatList(response.data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar pejabat:', err);
      setError('Gagal memuat daftar pejabat penandatangan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPejabat();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      nama: '',
      jabatan: '',
      nip: '',
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleOpenEdit = (pejabat) => {
    setEditingId(pejabat.id);
    setForm({
      nama: pejabat.nama || '',
      jabatan: pejabat.jabatan || '',
      nip: pejabat.nip || '',
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
        // Edit Pejabat
        await axios.put(`/api/pejabat/${editingId}`, form);
        setSuccess('Data pejabat berhasil diperbarui.');
      } else {
        // Tambah Pejabat
        await axios.post('/api/pejabat', form);
        setSuccess('Pejabat baru berhasil ditambahkan.');
      }

      fetchPejabat();
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Gagal menyimpan pejabat:', err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pejabat) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus pejabat "${pejabat.nama}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      try {
        await axios.delete(`/api/pejabat/${pejabat.id}`);
        alert('Data pejabat berhasil dihapus.');
        fetchPejabat();
      } catch (err) {
        console.error('Gagal menghapus pejabat:', err);
        alert(err.response?.data?.message || 'Gagal menghapus pejabat.');
      }
    }
  };

  const filteredPejabat = pejabatList.filter((p) => {
    const n = (p.nama || '').toLowerCase();
    const j = (p.jabatan || '').toLowerCase();
    const nip = (p.nip || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return n.includes(q) || j.includes(q) || nip.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Daftar Pejabat Penandatangan
          </h1>
          <p className="text-sm text-slate-500">
            Kelola daftar pejabat yang berwenang menandatangani SPT, SPPD, dan Kuitansi.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pejabat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-none dark:text-slate-100"
            />
          </div>
          {isAdminOrSuper && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-mauve-100 hover:bg-mauve-200 text-mauve-700 rounded-2xl border border-mauve-300 text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">Tambah Pejabat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Memuat data pejabat...</span>
          </div>
        ) : filteredPejabat.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <UserCheck className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold">Tidak ada pejabat ditemukan</p>
            <p className="text-xs text-slate-400">Silakan tambahkan data pejabat baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl rounded-b-none">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="">
                <tr className="bg-mauve-500 text-slate-100 border-b-2 border-mauve-500 border-double text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-3 text-center w-16 shadow-[inset_0_-2px_0_0_#ffffff]">
                    No
                  </th>
                  <th className="px-6 py-3 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                    Nama Lengkap
                  </th>
                  <th className="px-6 py-3 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                    Jabatan Resmi
                  </th>
                  <th className="px-6 py-3 text-left shadow-[inset_0_-2px_0_0_#ffffff]">NIP</th>
                  {isAdminOrSuper && (
                    <th className="px-6 py-3 text-center w-24 shadow-[inset_0_-2px_0_0_#ffffff]">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPejabat.map((pejabat, idx) => (
                  <tr
                    key={pejabat.id}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-6 py-3 text-center text-sm font-medium text-slate-700">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap font-semibold text-sm text-slate-700 dark:text-slate-100">
                      {pejabat.nama}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 font-semibold dark:text-slate-300">
                      {pejabat.jabatan}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-400">
                      {pejabat.nip || '-'}
                    </td>
                    {isAdminOrSuper && (
                      <td className="px-6 py-3 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(pejabat)}
                          className="p-1.5 text-mauve-700 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/30 rounded-lg transition-all"
                          title="Edit Pejabat"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pejabat)}
                          className="p-1.5 text-mauve-700 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/30 rounded-lg transition-all"
                          title="Hapus Pejabat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH & EDIT PEJABAT */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">
                  {editingId ? 'Edit Data Pejabat' : 'Tambah Pejabat Penandatangan'}
                </h3>
              </div>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
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
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Lengkap Pejabat
                </label>
                <input
                  type="text"
                  name="nama"
                  value={form.nama}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: H. Darno, S.Sos., M.Si."
                  className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Jabatan Dinas Resmi
                </label>
                <input
                  type="text"
                  name="jabatan"
                  value={form.jabatan}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: Kepala Dinas Perhubungan"
                  className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                />
              </div>

              {/* NIP */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  NIP Pejabat (Opsional)
                </label>
                <input
                  type="text"
                  name="nip"
                  value={form.nip}
                  onChange={handleChange}
                  placeholder="Contoh: 19681023 199003 1 002"
                  className="w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:text-slate-100"
                />
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
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Pejabat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DaftarPejabat;
