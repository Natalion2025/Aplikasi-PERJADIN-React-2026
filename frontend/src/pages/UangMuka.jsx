import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Printer,
  Edit,
  Trash2,
  Search,
  X,
  AlertCircle,
  Coins,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  FileText,
} from 'lucide-react';

const UangMuka = () => {
  // Lists
  const [panjarList, setPanjarList] = useState([]);
  const [allSpts, setAllSpts] = useState([]);
  const [allPegawai, setAllPegawai] = useState([]);
  const [availablePelaksana, setAvailablePelaksana] = useState([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal Panjar (Uang Muka) State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null = add, ID = edit
  const [form, setForm] = useState({
    spt_id: '',
    tempat: 'Nanga Pinoh',
    tanggal_panjar: new Date().toISOString().split('T')[0],
    bendahara_id: '',
    pelaksana_id: '',
    pejabat_id: '',
    rincian: [{ uraian: '', jumlah: '', keterangan: '' }],
  });

  // State loading & feedback
  const [loading, setLoading] = useState(true);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadingPelaksana, setLoadingPelaksana] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalNotif, setModalNotif] = useState('');
  const [modalError, setModalError] = useState('');

  // Fetch Panjar list
  const fetchPanjar = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/panjar', {
        params: {
          page,
          limit,
          q: search,
        },
      });
      if (res.data) {
        setPanjarList(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data panjar:', err);
      setError('Gagal memuat daftar uang muka.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanjar();
  }, [page, limit, search]);

  // Load Dropdowns (Spts, Pegawai, Pejabat)
  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true);
      const [sptRes, pegawaiRes] = await Promise.all([
        axios.get('/api/spt?limit=0'), // limit=0 for all
        axios.get('/api/pegawai?limit=1000'),
      ]);

      const spts = sptRes.data || [];
      const pegawais = pegawaiRes.data?.data || pegawaiRes.data || [];

      setAllSpts(spts);
      setAllPegawai(pegawais);

      return { spts, pegawais };
    } catch (err) {
      console.error('Gagal memuat data dropdown:', err);
      alert('Gagal memuat data dropdown.');
      return null;
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Open Add Modal
  const handleAddOpen = async () => {
    setEditId(null);
    setModalError('');
    setModalNotif('');

    const dropdownData = await loadDropdowns();
    if (!dropdownData) return;

    const { pegawais } = dropdownData;

    // Find Bendahara & Kepala Dinas
    const bendahara = pegawais.find(
      (p) => p.jabatan && p.jabatan.toLowerCase().includes('bendahara pengeluaran')
    );
    const kadis = pegawais.find(
      (p) => p.jabatan && p.jabatan.toLowerCase().includes('kepala dinas')
    );

    setForm({
      spt_id: '',
      tempat: 'Nanga Pinoh',
      tanggal_panjar: new Date().toISOString().split('T')[0],
      bendahara_id: bendahara ? bendahara.id : '',
      pelaksana_id: '',
      pejabat_id: kadis ? kadis.id : '',
      rincian: [{ uraian: '', jumlah: '', keterangan: '' }],
    });
    setAvailablePelaksana([]);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleEditOpen = async (id) => {
    setEditId(id);
    setModalError('');
    setModalNotif('');

    const dropdownData = await loadDropdowns();
    if (!dropdownData) return;

    try {
      const res = await axios.get(`/api/panjar/${id}`);
      if (res.data) {
        const panjar = res.data;

        // Fetch pelaksana of this SPT
        const sptDetailRes = await axios.get(`/api/spt/${panjar.spt_id}`);
        const sptDetail = sptDetailRes.data;
        setAvailablePelaksana(sptDetail.pegawai || []);

        setForm({
          spt_id: panjar.spt_id || '',
          tempat: panjar.tempat || 'Nanga Pinoh',
          tanggal_panjar: panjar.tanggal_panjar ? panjar.tanggal_panjar.split('T')[0] : '',
          bendahara_id: panjar.bendahara_id || '',
          pelaksana_id: panjar.pelaksana_id || '',
          pejabat_id: panjar.pejabat_id || '',
          rincian:
            panjar.rincian && panjar.rincian.length > 0
              ? panjar.rincian.map((r) => ({
                  uraian: r.uraian || '',
                  jumlah: r.jumlah ? r.jumlah.toString() : '',
                  keterangan: r.keterangan || '',
                }))
              : [{ uraian: '', jumlah: '', keterangan: '' }],
        });
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching panjar detail for edit:', err);
      alert('Gagal memuat detail uang muka.');
    }
  };

  // Handle SPT Select change
  const handleSptChange = async (sptId) => {
    if (!sptId) {
      setAvailablePelaksana([]);
      setForm((prev) => ({ ...prev, spt_id: '', pelaksana_id: '' }));
      return;
    }

    setLoadingPelaksana(true);
    setModalNotif('');
    try {
      const [sptDetailRes, existingPanjarRes] = await Promise.all([
        axios.get(`/api/spt/${sptId}`),
        axios.get(`/api/panjar/by-spt/${sptId}`),
      ]);

      const sptDetail = sptDetailRes.data;
      const existingPanjarMap = existingPanjarRes.data || {};
      const pegawaiDenganPanjar = Object.keys(existingPanjarMap);

      // Filter pelaksana who don't have panjar (unless it's edit mode for that specific employee)
      let filtered = sptDetail.pegawai || [];
      if (!editId) {
        filtered = filtered.filter((p) => !pegawaiDenganPanjar.includes(p.pegawai_id.toString()));
      }

      setAvailablePelaksana(filtered);
      setForm((prev) => ({
        ...prev,
        spt_id: sptId,
        pelaksana_id: filtered.length > 0 ? filtered[0].pegawai_id : '',
      }));

      if (filtered.length === 0) {
        setModalNotif('Semua pegawai dalam SPT ini telah menerima uang muka.');
      }
    } catch (err) {
      console.error('Error fetching pelaksana for SPT:', err);
    } finally {
      setLoadingPelaksana(false);
    }
  };

  // Rincian Item changes
  const handleRincianChange = (index, field, value) => {
    const newRincian = [...form.rincian];
    if (field === 'jumlah') {
      const numVal = value.replace(/[^0-9]/g, '');
      newRincian[index][field] = numVal;
    } else {
      newRincian[index][field] = value;
    }
    setForm((prev) => ({ ...prev, rincian: newRincian }));
  };

  const addRincianRow = () => {
    setForm((prev) => ({
      ...prev,
      rincian: [...prev.rincian, { uraian: '', jumlah: '', keterangan: '' }],
    }));
  };

  const removeRincianRow = (index) => {
    if (form.rincian.length === 1) return;
    setForm((prev) => ({
      ...prev,
      rincian: prev.rincian.filter((_, i) => i !== index),
    }));
  };

  // Submit Uang Muka Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSuccess('');

    if (!form.spt_id || !form.pelaksana_id || !form.bendahara_id || !form.pejabat_id) {
      setModalError('Semua field utama wajib diisi.');
      return;
    }

    const isRincianValid = form.rincian.every(
      (item) => item.uraian.trim() !== '' && item.jumlah > 0
    );
    if (!isRincianValid) {
      setModalError('Setiap baris rincian harus diisi Uraian dan Jumlah (> 0).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        rincian: form.rincian.map((item) => ({
          ...item,
          jumlah: parseFloat(item.jumlah),
        })),
      };

      if (editId) {
        await axios.put(`/api/panjar/${editId}`, payload);
        setSuccess('Uang muka berhasil diperbarui.');
      } else {
        await axios.post('/api/panjar', payload);
        setSuccess('Uang muka baru berhasil disimpan.');
      }

      setTimeout(() => {
        setModalOpen(false);
        setSuccess('');
        fetchPanjar();
      }, 1000);
    } catch (err) {
      console.error('Error saving panjar:', err);
      setModalError(err.response?.data?.message || 'Gagal menyimpan uang muka.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Panjar
  const handleDelete = async (id, pelaksana) => {
    if (
      !window.confirm(`Apakah Anda yakin ingin menghapus data uang muka pelaksana "${pelaksana}"?`)
    ) {
      return;
    }
    try {
      const res = await axios.delete(`/api/panjar/${id}`);
      alert(res.data.message || 'Uang muka berhasil dihapus.');
      fetchPanjar();
    } catch (err) {
      console.error('Gagal menghapus uang muka:', err);
      alert(err.response?.data?.message || 'Gagal menghapus data uang muka.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight dark:text-white">
            Manajemen Uang Muka (Panjar)
          </h1>
          <p className="text-slate-500 text-sm mt-1 dark:text-slate-400">
            Kelola uang muka / panjar untuk pegawai yang melaksanakan perjalanan dinas luar daerah.
          </p>
        </div>

        <button
          onClick={handleAddOpen}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-mauve-100 hover:bg-mauve-200 text-mauve-700 rounded-2xl font-semibold shadow-md border border-mauve-300 transition-all text-sm transform hover:-translate-y-0.5 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Tambah Uang Muka
        </button>
      </div>

      {/* List Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700/50 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-700 dark:text-white">Daftar Uang Muka</h3>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nomor ST atau Pelaksana..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-none"
              />
            </div>

            {/* Limit selector */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-shrink-0">
              <span>Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-mauve-500 focus:border-none text-slate-800 dark:text-slate-200"
              >
                <option value={5}>5</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table list */}
        <div className="p-6 pt-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <span className="text-sm font-medium">Memuat data panjar...</span>
            </div>
          ) : panjarList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              Tidak ada data uang muka (panjar) yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="">
                  <tr className="bg-mauve-500 text-slate-100 border-b-2  border-mauve-500 border-double dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="py-3 px-6 text-center w-12 uppercase shadow-[inset_0_-2px_0_0_#ffffff]">
                      No.
                    </th>
                    <th className="py-3 px-4 w-44 uppercase shadow-[inset_0_-2px_0_0_#ffffff]">
                      Tgl Panjar
                    </th>
                    <th className="py-3 px-4 uppercase shadow-[inset_0_-2px_0_0_#ffffff]">
                      Surat Tugas Terkait
                    </th>
                    <th className="py-3 px-4 uppercase whitespace-nowrap shadow-[inset_0_-2px_0_0_#ffffff]">
                      Pegawai Pelaksana
                    </th>
                    <th className="py-3 px-4 w-44 uppercase shadow-[inset_0_-2px_0_0_#ffffff]">
                      Total Biaya
                    </th>
                    <th className="py-3 px-6 text-center w-36 uppercase shadow-[inset_0_-2px_0_0_#ffffff]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {panjarList.map((panjar, idx) => (
                    <tr
                      key={panjar.id}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-700/20 transition-all"
                    >
                      <td className="py-3 px-6  text-center text-slate-800 dark:text-slate-400 font-medium align-top">
                        {(page - 1) * limit + idx + 1}.
                      </td>
                      <td className="py-3 px-10 whitespace-nowrap text-slate-800 dark:text-slate-355 font-medium align-top">
                        <div className="flex  items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-800" />
                          {formatDate(panjar.tanggal_panjar)}
                        </div>
                      </td>
                      <td className="py-3 px-8 -mr-[20px] align-top">
                        <span className=" text-slate-800 dark:text-slate-200 block">
                          {panjar.nomor_surat}
                        </span>
                      </td>
                      <td className="py-3 px-5 align-top">
                        <div className="flex -mr-8 font-semibold whitespace-nowrap gap-1.5 text-slate-800 dark:text-slate-200">
                          <User className="h-3.5 w-3.5 text-slate-800" />
                          {panjar.pelaksana_nama}
                        </div>
                      </td>
                      <td className="py-3 px-14   text-slate-800 dark:text-white align-top">
                        {formatCurrency(panjar.total_biaya || 0)}
                      </td>
                      <td className="py-3 px-6 text-center space-x-1.5 whitespace-nowrap align-top flex-wrap">
                        <a
                          href={`/cetak/panjar/${panjar.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-2 pt-0 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="Cetak Kuitansi Panjar"
                        >
                          <Printer className="h-4 w-4 text-mauve-900/90" />
                        </a>
                        <button
                          onClick={() => handleEditOpen(panjar.id)}
                          className="inline-flex items-center justify-center p-2 pt-0 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors "
                          title="Edit Uang Muka"
                        >
                          <Edit className="h-4 w-4 text-mauve-900/90" />
                        </button>
                        <button
                          onClick={() => handleDelete(panjar.id, panjar.pelaksana_nama)}
                          className="inline-flex items-center justify-center p-2 pt-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors "
                          title="Hapus Uang Muka"
                        >
                          <Trash2 className="h-4 w-4 text-mauve-900/90" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/10 gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Menampilkan Halaman{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> dari{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>{' '}
              ({totalItems} total data)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PANJAR MODAL ================= */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editId
                    ? 'Edit Uang Muka (Panjar) Perjalanan'
                    : 'Tambah Uang Muka (Panjar) Perjalanan'}
                </h3>
                <p className="text-slate-500 text-xs mt-1 dark:text-slate-400">
                  Isi rincian pengajuan uang panjar pelaksana tugas luar daerah.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {success && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl text-sm border border-emerald-100 dark:border-emerald-900/30">
                  {success}
                </div>
              )}

              {modalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalNotif && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm border border-amber-100 dark:border-amber-900/30">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{modalNotif}</span>
                </div>
              )}

              {loadingDropdowns ? (
                <div className="py-10 flex justify-center text-indigo-650">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} id="panjar-form" className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Tempat
                      </label>
                      <input
                        type="text"
                        required
                        value={form.tempat}
                        onChange={(e) => setForm((prev) => ({ ...prev, tempat: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Tanggal Panjar
                      </label>
                      <input
                        type="date"
                        required
                        value={form.tanggal_panjar}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, tanggal_panjar: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Nomor SPT / SPD Terkait
                    </label>
                    <select
                      required
                      disabled={!!editId}
                      value={form.spt_id}
                      onChange={(e) => handleSptChange(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-70"
                    >
                      <option value="">-- Pilih SPT --</option>
                      {allSpts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nomor_surat} (Tujuan: {s.lokasi_tujuan})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Pegawai Pelaksana Perjalanan
                      </label>
                      <select
                        required
                        disabled={loadingPelaksana || availablePelaksana.length === 0}
                        value={form.pelaksana_id}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, pelaksana_id: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-50"
                      >
                        {loadingPelaksana ? (
                          <option>Memuat pelaksana...</option>
                        ) : availablePelaksana.length === 0 ? (
                          <option value="">-- Pilih SPT Terlebih Dahulu --</option>
                        ) : (
                          availablePelaksana.map((p) => (
                            <option key={p.pegawai_id} value={p.pegawai_id}>
                              {p.nama_lengkap} (NIP: {p.nip})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Bendahara Pengeluaran
                      </label>
                      <select
                        required
                        value={form.bendahara_id}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, bendahara_id: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      >
                        <option value="">-- Pilih Bendahara --</option>
                        {allPegawai
                          .filter((p) => p.jabatan && p.jabatan.toLowerCase().includes('bendahara'))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama_lengkap} (NIP: {p.nip})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Pejabat Pemberi Tugas / Kepala Dinas
                    </label>
                    <select
                      required
                      value={form.pejabat_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, pejabat_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    >
                      <option value="">-- Pilih Pejabat --</option>
                      {allPegawai
                        .filter(
                          (p) => p.jabatan && p.jabatan.toLowerCase().includes('kepala dinas')
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama_lengkap} - {p.jabatan}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Perincian Biaya */}
                  <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Perincian Biaya Perjalanan
                      </span>
                      <button
                        type="button"
                        onClick={addRincianRow}
                        className="text-xs font-bold text-indigo-650 hover:text-indigo-850 dark:text-indigo-400"
                      >
                        + Tambah Baris
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.rincian.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-center gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Uraian Biaya (misal: Uang Harian)"
                            value={item.uraian}
                            onChange={(e) => handleRincianChange(idx, 'uraian', e.target.value)}
                            className="w-full sm:flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Jumlah (Rp)"
                            value={item.jumlah ? formatNumber(item.jumlah) : ''}
                            onChange={(e) => handleRincianChange(idx, 'jumlah', e.target.value)}
                            className="w-full sm:w-44 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Keterangan"
                            value={item.keterangan}
                            onChange={(e) => handleRincianChange(idx, 'keterangan', e.target.value)}
                            className="w-full sm:w-48 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={form.rincian.length === 1}
                            onClick={() => removeRincianRow(idx)}
                            className="p-1.5 text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end items-center gap-3 p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                form="panjar-form"
                disabled={submitting || availablePelaksana.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Uang Muka'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UangMuka;
