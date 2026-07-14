import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const Pegawai = () => {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 5;

  // State Form / Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null); // Jika null berarti Tambah, jika ada ID berarti Edit
  const [form, setForm] = useState({
    nama_lengkap: '',
    nip: '',
    pangkat: '',
    golongan: '',
    jabatan: '',
    bidang: '',
  });

  // Feedback State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPegawai = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/pegawai', {
        params: {
          q: search,
          page: currentPage,
          limit: itemsPerPage,
        },
      });

      if (response.data) {
        setPegawaiList(response.data.data || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalItems(response.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data pegawai:', err);
      setError('Gagal memuat data pegawai. Hubungi administrator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPegawai();
  }, [currentPage, search]);

  // Handle input form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Buka modal untuk Tambah baru
  const handleAdd = () => {
    setEditId(null);
    setForm({
      nama_lengkap: '',
      nip: '',
      pangkat: '',
      golongan: '',
      jabatan: '',
      bidang: '',
    });
    setError('');
    setModalOpen(true);
  };

  // Buka modal untuk Edit
  const handleEdit = (pegawai) => {
    setEditId(pegawai.id);
    setForm({
      nama_lengkap: pegawai.nama_lengkap || '',
      nip: pegawai.nip || '',
      pangkat: pegawai.pangkat || '',
      golongan: pegawai.golongan || '',
      jabatan: pegawai.jabatan || '',
      bidang: pegawai.bidang || '',
    });
    setError('');
    setModalOpen(true);
  };

  // Kirim data Form (Tambah / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Validasi Frontend yang Lebih Kuat
    if (!form.nama_lengkap.trim() || !form.nip.trim() || !form.jabatan.trim() || !form.golongan) {
      let missingFields = [];
      if (!form.nama_lengkap.trim()) missingFields.push('Nama Lengkap');
      if (!form.nip.trim()) missingFields.push('NIP');
      if (!form.jabatan.trim()) missingFields.push('Jabatan');
      if (!form.golongan) missingFields.push('Golongan');

      setError(`Data tidak lengkap. Harap isi kolom berikut: ${missingFields.join(', ')}.`);
      setSubmitting(false);
      return;
    }

    try {
      if (editId) {
        // Update
        const res = await axios.put(`/api/pegawai/${editId}`, form);
        setSuccess(res.data.message || 'Data pegawai berhasil diperbarui.');
      } else {
        // Create
        const res = await axios.post('/api/pegawai', form);
        setSuccess(res.data.message || 'Pegawai baru berhasil ditambahkan.');
      }

      // Tutup modal dan refresh data
      setTimeout(() => {
        setModalOpen(false);
        setSuccess('');
        fetchPegawai();
      }, 1000);
    } catch (err) {
      console.error('Error submitting pegawai:', err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setSubmitting(false);
    }
  };

  // Hapus Pegawai
  const handleDelete = async (id, nama) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus data pegawai "${nama}"?`);
    if (!confirmed) return;

    try {
      const res = await axios.delete(`/api/pegawai/${id}`);
      alert(res.data.message || 'Pegawai berhasil dihapus.');
      fetchPegawai();
    } catch (err) {
      console.error('Error deleting pegawai:', err);
      alert(err.response?.data?.message || 'Gagal menghapus pegawai.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Manajemen Data Pegawai
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Kelola informasi pangkat, golongan, jabatan, dan bidang pegawai.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-mauve-100 hover:bg-mauve-200 text-mauve-700 rounded-2xl text-sm font-semibold shadow-md border border-mauve-300 transition-all text-sm w-full sm:w-auto"
        >
          <Plus size={18} />
          <span>Tambah Pegawai</span>
        </button>
      </div>

      {/* Main Area Card */}
      <div className="bg-white p-6 rounded-3xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
        {/* Search & Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Cari nama/NIP/jabatan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset ke halaman pertama saat mencari
              }}
              className="w-[70%] pl-11 pr-4 py-2.5  border border-slate-300 dark:bg-slate-900 dark:focus:bg-slate-900 dark:border-slate-600/50 dark:placeholder:text-slate-500/50 rounded-2xl text-slate-800  placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 dark:focus:ring-emerald-600/20 focus:ring-mauve-500 focus:bg-white transition-all text-sm dark:focus:border-emerald-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-indigo-400 dark:border-indigo-400 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl">
            Total: {totalItems} Pegawai
          </span>
        </div>

        {/* Table Data */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Memuat data...
            </p>
          </div>
        ) : pegawaiList.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
            Tidak ada data pegawai yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl rounded-b-none ">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="text-xs uppercase">
                <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold">
                  <th className="px-5 py-3 text-left tracking-wider w-16 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    No
                  </th>
                  <th className="px-5 py-3 text-left tracking-wider shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Nama Lengkap/NIP
                  </th>
                  <th className="px-5 py-3 text-left tracking-wider shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Pangkat/Gol
                  </th>
                  <th className="px-5 py-3 text-left tracking-wider shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Jabatan
                  </th>
                  <th className="px-5 py-3 text-left tracking-wider shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Bidang
                  </th>
                  <th className="px-5 py-3 text-center tracking-wider w-24 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-600/60 text-sm">
                {pegawaiList.map((pegawai, index) => (
                  <tr
                    key={pegawai.id}
                    className="hover:bg-slate-50/20 dark:hover:bg-slate-700/30  transition-colors"
                  >
                    <td className="px-3 py-3 text-center text-slate-800 dark:text-slate-200 align-top">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {pegawai.nama_lengkap}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {pegawai.nip}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-slate-700 font-medium dark:text-slate-200">
                        {pegawai.pangkat || '-'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {pegawai.golongan ? `Gol. ${pegawai.golongan}` : '-'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200 align-top font-medium capitalize">
                      {pegawai.jabatan?.toLowerCase()}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50/50 border text-mauve-700/90 dark:bg-slate-800 dark:text-emerald-400">
                        {pegawai.bidang || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(pegawai)}
                          className="p-1.5 text-mauve-700 dark:text-yellow-400 dark:hover:text-yellow-400 dark:hover:bg-slate-100/10 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                          title="Ubah Data"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(pegawai.id, pegawai.nama_lengkap)}
                          className="p-1.5 text-mauve-700 dark:text-rose-400 dark:hover:text-rose-400 dark:hover:bg-slate-100/10 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Hapus Data"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalItems > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-none pt-5">
            <span className="text-xs text-slate-400">
              Menampilkan Halaman {currentPage} dari {totalPages} ({totalItems} total data)
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      currentPage === num
                        ? 'bg-indigo-600 dark:bg-indigo-800 dark:text-slate-200 text-white border-indigo-600'
                        : 'border-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL TAMBAH & EDIT PEGAWAI */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          {/* Modal Content Card */}
          <div className=" rounded-3xl w-full max-w-lg shadow-2xl dark:border-slate-700 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-800 dark:to-teal-700 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus size={20} />
                <span>{editId ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-emerald-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1  p-6 space-y-4 dark:bg-slate-800 overflow-y-auto"
            >
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5">
                  <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                  <span>{success}</span>
                </div>
              )}

              <div className=" grid grid-cols-1 gap-4  max-h-[50vh]">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    required
                    value={form.nama_lengkap}
                    onChange={handleChange}
                    placeholder="Contoh: Budi Santoso, S.H."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-700/50 dark:placeholder:text-slate-500/50 dark:focus:bg-slate-900 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 dark:text-slate-200 focus:outline-none focus:border-transparent focus:bg-white transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>

                {/* NIP */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    NIP (Nomor Induk Pegawai) *
                  </label>
                  <input
                    type="text"
                    name="nip"
                    required
                    value={form.nip}
                    onChange={handleChange}
                    placeholder="Contoh: 198001012010011001"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-700/50 dark:placeholder:text-slate-500/50 dark:focus:bg-slate-900 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 dark:text-slate-200 focus:outline-none focus:border-transparent focus:bg-white transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Pangkat */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Pangkat
                    </label>
                    <input
                      type="text"
                      name="pangkat"
                      value={form.pangkat}
                      onChange={handleChange}
                      placeholder="Contoh: Pembina"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-700/50 dark:placeholder:text-slate-500/50 dark:focus:bg-slate-900 dark:text-slate-200 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-mauve-500 focus:outline-none focus:border-transparent focus:bg-white transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                    />
                  </div>

                  {/* Golongan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Golongan
                    </label>
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-700/50 dark:placeholder:text-slate-500/50 dark:focus:bg-slate-900 dark:text-slate-200 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus-within:ring-2 focus-within:ring-mauve-500 focus-within:outline-none focus-within:border-transparent bg-white transition-all text-sm dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                      <select
                        name="golongan"
                        value={form.golongan}
                        onChange={handleChange}
                        className="w-full   focus:outline-none  text-sm dark:bg-slate-900"
                      >
                        <option value="">Pilih Golongan</option>
                        <option value="I/a">I/a - Juru Muda</option>
                        <option value="I/b">I/b - Juru Muda Tingkat I</option>
                        <option value="I/c">I/c - Juru</option>
                        <option value="I/d">I/d - Juru Tingkat I</option>
                        <option value="II/a">II/a - Pengatur Muda</option>
                        <option value="II/b">II/b - Pengatur Muda Tingkat I</option>
                        <option value="II/c">II/c - Pengatur</option>
                        <option value="II/d">II/d - Pengatur Tingkat I</option>
                        <option value="III/a">III/a - Penata Muda</option>
                        <option value="III/b">III/b - Penata Muda Tingkat I</option>
                        <option value="III/c">III/c - Penata</option>
                        <option value="III/d">III/d - Penata Tingkat I</option>
                        <option value="IV/a">IV/a - Pembina</option>
                        <option value="IV/b">IV/b - Pembina Tingkat I</option>
                        <option value="IV/c">IV/c - Pembina Utama Muda</option>
                        <option value="IV/d">IV/d - Pembina Utama Madya</option>
                        <option value="IV/e">IV/e - Pembina Utama</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Jabatan */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Jabatan *
                  </label>
                  <input
                    type="text"
                    name="jabatan"
                    required
                    value={form.jabatan}
                    onChange={handleChange}
                    placeholder="Contoh: Kepala Bidang Keuangan"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:placeholder:text-slate-500/50 dark:border-slate-700/50 dark:focus:bg-slate-900 dark:text-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-transparent focus:ring-2 focus:bg-white transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>

                {/* Bidang / Urusan */}
                <div className="pb-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Bidang / Bagian
                  </label>
                  <input
                    type="text"
                    name="bidang"
                    value={form.bidang}
                    onChange={handleChange}
                    placeholder="Contoh: Bidang Anggaran"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500/50 dark:border-slate-700/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-transparent focus:ring-2 dark:focus:bg-slate-900 focus:bg-white transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  />
                </div>
              </div>
            </form>
            {/* Footer Buttons */}
            <div className="flex gap-3 dark:bg-slate-800 p-4 border-t dark:border-t-0 border-slate-100 ">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 dark:hover:bg-slate-200/10 dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-sm transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 disabled:bg-emerald-600/40 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  'Simpan Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pegawai;
