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
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(5);

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
      const response = await axios.get('/api/pejabat', {
        params: { q: searchQuery, page: currentPage, limit: limit },
      });
      if (response.data) {
        setPejabatList(response.data.data || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalItems(response.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar pejabat:', err);
      setError('Gagal memuat daftar pejabat penandatangan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPejabat();
  }, [currentPage, limit, searchQuery]);

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:focus:ring-emerald-600/20 focus:border-transparent dark:placeholder:text-slate-500/50 dark:text-slate-200 dark:focus:border-emerald-500"
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
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-3xl shadow-sm overflow-hidden">
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
          <div className="overflow-x-auto rounded-2xl rounded-b-none ">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="text-xs uppercase">
                <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold tracking-wider">
                  <th className="px-6 py-3 text-center w-16 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    No
                  </th>
                  <th className="px-6 py-3 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Nama Lengkap
                  </th>
                  <th className="px-6 py-3 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Jabatan Resmi
                  </th>
                  <th className="px-6 py-3 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    NIP
                  </th>
                  {isAdminOrSuper && (
                    <th className="px-6 py-3 text-center w-24 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPejabat.map((pejabat, idx) => (
                  <tr
                    key={pejabat.id}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                      {(currentPage - 1) * limit + idx + 1}
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
                          className="p-1.5 text-mauve-700 dark:text-yellow-400 dark:hover:bg-slate-100/10 dark:hover:text-yellow-400 hover:text-amber-600 hover:bg-amber-50 dark:bg-slate-800 rounded-lg transition-all"
                          title="Edit Pejabat"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pejabat)}
                          className="p-1.5 text-mauve-700 dark:text-rose-400 dark:hover:bg-slate-100/10 dark:hover:text-rose-400 hover:text-red-600 hover:bg-red-50 dark:bg-slate-800 rounded-lg transition-all"
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
        {/* Pagination Controls */}
        {!loading && totalItems > 0 && (
          <div className="flex items-center justify-between border-t pb-6 pl-6  border-slate-100 dark:border-none pt-5 px-2">
            <span className="text-xs dark:text-slate-400 text-slate-500 font-medium">
              Menampilkan Halaman <span className="font-bold">{currentPage}</span> dari{' '}
              <span className="font-bold">{totalPages}</span> (
              <span className="font-bold">{totalItems}</span> total data)
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      currentPage === num
                        ? 'bg-indigo-600 dark:bg-indigo-800 text-white border-indigo-600'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
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
          <div className="bg-mauve-200 dark:bg-slate-800 dark:border-slate-700 w-full max-w-md rounded-3xl shadow-xl dark:border   overflow-hidden">
            <div className="flex justify-between items-start p-6 bg-linear-to-l/hsl from-rose-300 to-rose-900  dark:bg-gradient-to-r dark:from-emerald-800 dark:to-teal-700 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-100 dark:text-slate-50">
                  {editingId ? 'Edit Data Pejabat' : 'Tambah Pejabat Penandatangan'}
                </h3>
              </div>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="text-slate-200 p-1  hover:bg-slate-100/30 hover:rounded-full transition-all duration-300"
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
                    className="w-full px-4.5 py-2.5 bg-white dark:bg-slate-900 dark:placeholder:text-slate-500/50 border border-mauve-300 dark:border-slate-800 rounded-xl text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:text-slate-200 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
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
                    className="w-full px-4.5 py-2.5 bg-white dark:bg-slate-900 dark:placeholder:text-slate-500/50 border border-mauve-300 dark:border-slate-800 rounded-xl text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:text-slate-200 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
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
                    className="w-full px-4.5 py-2.5 bg-white dark:bg-slate-900 dark:placeholder:text-slate-500/50 border border-mauve-300 dark:border-slate-800 rounded-xl text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:text-slate-200 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    className="px-4.5 py-2 border border-slate-300 bg-white dark:bg-slate-800 dark:shadow-none hover:shadow-lg hover:shadow-mauve-700/20 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-mauve-100 dark:bg-emerald-800 dark:shadow-none dark:hover:bg-emerald-700  rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-mauve-700/20 dark:text-slate-200 text-mauve-700 dark:border-0 border border-mauve-700  hover:shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingId ? 'Simpan Perubahan' : 'Tambah Pejabat'}</span>
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

export default DaftarPejabat;
