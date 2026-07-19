import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Plus,
  Printer,
  Edit,
  Trash2,
  FileText,
  Coins,
  X,
  Check,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  AlertCircle,
  Users,
  Calendar,
  MapPin,
  FileCheck,
  Search,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import IconCetakVisum from '../components/IconCetakVisum';
import IconBuatLaporan from '../components/IconBuatLaporan';

const SptRegister = () => {
  const navigate = useNavigate();

  // Tabs: 'spt' or 'sppd'
  const [activeTab, setActiveTab] = useState('spt');

  // Dropdown Action state
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Data lists
  const [sptList, setSptList] = useState([]);
  const [sppdList, setSppdList] = useState([]);

  // Pagination & limit
  const [sptPage, setSptPage] = useState(1);
  const [sppdPage, setSppdPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [sptPagination, setSptPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [sppdPagination, setSppdPagination] = useState({ totalPages: 1, totalItems: 0 });

  // Loading & search
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState('user');

  // Modal Panjar (Uang Muka) State
  const [panjarModalOpen, setPanjarModalOpen] = useState(false);
  const [allSptsForPanjar, setAllSptsForPanjar] = useState([]);
  const [allPegawai, setAllPegawai] = useState([]);
  const [availablePelaksana, setAvailablePelaksana] = useState([]);
  const [loadingPelaksana, setLoadingPelaksana] = useState(false);
  const [panjarForm, setPanjarForm] = useState({
    spt_id: '',
    tempat: 'Nanga Pinoh',
    tanggal_panjar: new Date().toISOString().split('T')[0],
    bendahara_id: '',
    pelaksana_id: '',
    pejabat_id: '',
    rincian: [{ uraian: '', jumlah: '', keterangan: '' }],
  });
  const [panjarNotif, setPanjarNotif] = useState('');
  const [panjarError, setPanjarError] = useState('');

  // Conflict/Alert Modal State
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch session role
  const fetchSession = async () => {
    try {
      const res = await axios.get('/api/user/session');
      if (res.data && res.data.user) {
        setUserRole(res.data.user.role);
      }
    } catch (err) {
      console.error('Gagal memuat sesi user:', err);
    }
  };

  // Fetch SPT List
  const fetchSpts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/spt', {
        params: {
          page: sptPage,
          limit: limit,
          q: searchQuery,
        },
      });
      if (res.data) {
        setSptList(res.data.data || []);
        if (res.data.pagination) {
          setSptPagination({
            totalPages: res.data.pagination.totalPages || 1,
            totalItems: res.data.pagination.totalItems || 0,
          });
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data SPT:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch SPPD List
  const fetchSppds = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/sppd', {
        params: {
          page: sppdPage,
          limit: limit,
          q: searchQuery,
        },
      });
      if (res.data) {
        setSppdList(res.data.data || []);
        if (res.data.pagination) {
          setSppdPagination({
            totalPages: res.data.pagination.totalPages || 1,
            totalItems: res.data.pagination.totalItems || 0,
          });
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data SPPD:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.dropdown-trigger') && !e.target.closest('.dropdown-menu')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // PERBAIKAN: Pisahkan useEffect untuk setiap tab agar dependensi lebih jelas dan efisien.
  // useEffect untuk tab SPT
  useEffect(() => {
    if (activeTab === 'spt') {
      fetchSpts();
    }
  }, [activeTab, sptPage, limit, searchQuery]);

  // useEffect untuk tab SPPD
  useEffect(() => {
    if (activeTab === 'sppd') {
      fetchSppds();
    }
  }, [activeTab, sppdPage, limit, searchQuery]);

  // Handle SPT Delete
  const handleDeleteSpt = async (id, nomor) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus SPT dengan nomor "${nomor}"?`)) {
      return;
    }
    try {
      const res = await axios.delete(`/api/spt/${id}`);
      alert(res.data.message || 'SPT berhasil dihapus.');
      fetchSpts();
    } catch (err) {
      console.error('Error saat menghapus SPT:', err);
      if (err.response && err.response.status === 409) {
        setAlertMessage(err.response.data.message || 'Tidak dapat menghapus SPT.');
        setAlertModalOpen(true);
      } else {
        alert(err.response?.data?.message || 'Gagal menghapus SPT.');
      }
    }
  };

  // Load Dropdowns for Panjar Modal
  const openPanjarModal = async () => {
    setPanjarError('');
    setPanjarNotif('');

    // Fetch all SPTs (limit=0 to fetch all)
    try {
      const [sptRes, pegawaiRes] = await Promise.all([
        axios.get('/api/spt?limit=0'),
        axios.get('/api/pegawai?limit=1000'),
      ]);

      const spts = sptRes.data || [];
      const pegawais = pegawaiRes.data?.data || pegawaiRes.data || [];

      setAllSptsForPanjar(spts);
      setAllPegawai(pegawais);

      // Find Bendahara (title contains 'bendahara pengeluaran')
      const bendahara = pegawais.find(
        (p) => p.jabatan && p.jabatan.toLowerCase().includes('bendahara pengeluaran')
      );

      // Find Kepala Dinas (title equals 'kepala dinas' or similar)
      const kadis = pegawais.find(
        (p) => p.jabatan && p.jabatan.toLowerCase().includes('kepala dinas')
      );

      setPanjarForm({
        spt_id: '',
        tempat: 'Nanga Pinoh',
        tanggal_panjar: new Date().toISOString().split('T')[0],
        bendahara_id: bendahara ? bendahara.id : '',
        pelaksana_id: '',
        pejabat_id: kadis ? kadis.id : '',
        rincian: [{ uraian: '', jumlah: '', keterangan: '' }],
      });
      setAvailablePelaksana([]);
      setPanjarModalOpen(true);
    } catch (err) {
      console.error('Error loading panjar dropdowns:', err);
      alert('Gagal memuat data untuk modal uang muka.');
    }
  };

  // Handle SPT selection in Panjar form
  const handlePanjarSptChange = async (sptId) => {
    if (!sptId) {
      setAvailablePelaksana([]);
      setPanjarForm((prev) => ({ ...prev, spt_id: '', pelaksana_id: '' }));
      return;
    }

    setLoadingPelaksana(true);
    setPanjarNotif('');
    try {
      const [sptDetailRes, existingPanjarRes] = await Promise.all([
        axios.get(`/api/spt/${sptId}`),
        axios.get(`/api/panjar/by-spt/${sptId}`),
      ]);

      const sptDetail = sptDetailRes.data;
      const existingPanjarMap = existingPanjarRes.data || {};
      const pegawaiDenganPanjar = Object.keys(existingPanjarMap);

      // Filter employees who don't have advance payment yet
      const filtered = (sptDetail.pegawai || []).filter(
        (p) => !pegawaiDenganPanjar.includes(p.pegawai_id.toString())
      );

      setAvailablePelaksana(filtered);
      setPanjarForm((prev) => ({
        ...prev,
        spt_id: sptId,
        pelaksana_id: filtered.length > 0 ? filtered[0].pegawai_id : '',
      }));

      if (filtered.length === 0) {
        setPanjarNotif('Semua pegawai dalam SPT ini telah menerima uang muka.');
      }
    } catch (err) {
      console.error('Error fetching SPT detail for panjar:', err);
    } finally {
      setLoadingPelaksana(false);
    }
  };

  // Handle Rincian Item changes
  const handleRincianChange = (index, field, value) => {
    const newRincian = [...panjarForm.rincian];
    if (field === 'jumlah') {
      // Allow only numbers
      const numValue = value.replace(/[^0-9]/g, '');
      newRincian[index][field] = numValue;
    } else {
      newRincian[index][field] = value;
    }
    setPanjarForm((prev) => ({ ...prev, rincian: newRincian }));
  };

  const addRincianRow = () => {
    setPanjarForm((prev) => ({
      ...prev,
      rincian: [...prev.rincian, { uraian: '', jumlah: '', keterangan: '' }],
    }));
  };

  const removeRincianRow = (index) => {
    if (panjarForm.rincian.length === 1) return;
    const newRincian = panjarForm.rincian.filter((_, i) => i !== index);
    setPanjarForm((prev) => ({ ...prev, rincian: newRincian }));
  };

  // Submit Panjar Form
  const handlePanjarSubmit = async (e) => {
    e.preventDefault();
    setPanjarError('');

    if (
      !panjarForm.spt_id ||
      !panjarForm.pelaksana_id ||
      !panjarForm.bendahara_id ||
      !panjarForm.pejabat_id
    ) {
      setPanjarError('Semua field wajib diisi.');
      return;
    }

    // Validate details
    const isRincianValid = panjarForm.rincian.every(
      (item) => item.uraian.trim() !== '' && item.jumlah > 0
    );
    if (!isRincianValid) {
      setPanjarError('Setiap baris rincian harus diisi Uraian dan Jumlah (harus > 0).');
      return;
    }

    try {
      const payload = {
        ...panjarForm,
        rincian: panjarForm.rincian.map((item) => ({
          ...item,
          jumlah: parseFloat(item.jumlah),
        })),
      };

      const res = await axios.post('/api/panjar', payload);
      alert(res.data.message || 'Uang muka berhasil disimpan.');
      setPanjarModalOpen(false);
    } catch (err) {
      console.error('Error saving panjar:', err);
      setPanjarError(err.response?.data?.message || 'Gagal menyimpan uang muka.');
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight dark:text-white">
            Register Surat Tugas & SPD
          </h1>
          <p className="text-slate-500 text-sm mt-1 dark:text-slate-400">
            Kelola data Surat Perintah Tugas (SPT) dan Surat Perjalanan Dinas (SPD) Pemkab Melawi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(userRole === 'admin' || userRole === 'superadmin') && (
            <button
              onClick={openPanjarModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-semibold shadow-md shadow-orange-500/15 transition-all text-sm transform hover:-translate-y-0.5"
            >
              <Coins className="h-4 w-4" />
              Buat Uang Muka
            </button>
          )}

          <Link
            to="/tambah-spt"
            className="flex items-center gap-2 px-5 py-2.5 bg-mauve-100 hover:bg-mauve-200 text-mauve-700 rounded-2xl font-semibold shadow-md border border-mauve-300 transition-all text-sm transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Buat Surat Tugas
          </Link>
        </div>
      </div>

      {/* Tabs and Filtering Control */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700/50 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('spt');
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 rounded-t-2xl rounded-l-none  text-sm font-semibold tracking-wide transition-all ${
                activeTab === 'spt'
                  ? 'bg-mauve-500 dark:bg-slate-100 dark:text-mauve-700 text-white'
                  : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
              }`}
            >
              Register Surat Tugas (ST)
            </button>
            <button
              onClick={() => {
                setActiveTab('sppd');
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 rounded-t-2xl rounded-l-none text-sm font-semibold tracking-wide transition-all ${
                activeTab === 'sppd'
                  ? 'bg-mauve-500 dark:bg-slate-100 dark:text-mauve-700 text-white'
                  : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
              }`}
            >
              Register Perjalanan Dinas (SPD)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2  -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'spt' ? 'Cari No ST atau Maksud...' : 'Cari No SPD atau Pegawai...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600/50 dark:placeholder:text-slate-500/50  border dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:focus:ring-emerald-600/20 dark:focus:bg-slate-900 focus:border-transparent dark:focus:border-emerald-500"
              />
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-shrink-0">
              <span>Tampilkan:</span>
              <div className="relative border border-slate-300 px-1 py-2 dark:bg-slate-900  dark:border-slate-600/50 focus-within:outline-none focus-within:ring-2 focus-within:ring-mauve-500 focus-within:border-transparent rounded-xl dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setSptPage(1);
                    setSppdPage(1);
                  }}
                  className=" bg-white dark:bg-slate-900 outline-none text-slate-800  dark:text-slate-200 "
                >
                  <option value={5}>5</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 pt-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <span className="text-sm font-medium">Memuat data...</span>
            </div>
          ) : activeTab === 'spt' ? (
            /* ================= REGISTER SPT TABLE ================= */
            <div className="overflow-x-auto rounded-2xl rounded-b-none ">
              <table className="min-w-full text-left border-collapse text-sm">
                <thead className="text-xs uppercase">
                  <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold">
                    <th className="py-3 pl-6 pr-3 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      No.
                    </th>
                    <th className="py-3 px-4 w-60 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Nomor & Tgl Surat
                    </th>
                    <th className="py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Maksud Perjalanan
                    </th>
                    <th className="py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Pegawai Ditugaskan
                    </th>
                    <th className="py-3 whitespace-nowrap px-4 w-52 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Lokasi Tujuan
                    </th>
                    <th className="py-3 px-6 w-64 text-center shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {sptList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-slate-400 dark:text-slate-500"
                      >
                        Tidak ada data Surat Perintah Tugas yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    sptList.map((spt, idx) => {
                      const isCancelled = spt.status === 'dibatalkan';
                      const hasReport = spt.laporan_count > 0;
                      const hasPayment = spt.pembayaran_count > 0;

                      // Highlight classes based on status
                      let rowBgClass = 'hover:bg-slate-50/40 dark:hover:bg-slate-700/20';
                      if (isCancelled) {
                        rowBgClass = 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/60';
                      } else if (hasPayment) {
                        rowBgClass =
                          'bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/60';
                      }

                      const canceledPegawaiSet = new Set(spt.pegawai_dibatalkan || []);

                      return (
                        <tr key={spt.id} className={`transition-all ${rowBgClass}`}>
                          <td className="py-3 pl-6 pr-3 text-center text-slate-800 dark:text-slate-400 font-medium align-top">
                            {(sptPage - 1) * limit + idx + 1}.
                          </td>
                          <td className="py-3 px-4 align-top">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                              {spt.nomor_surat}
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {formatDate(spt.tanggal_surat)}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-800 dark:text-slate-300 align-top">
                            <div className="flex flex-col">
                              <span
                                className="block font-medium  max-w-sm text-xs"
                                title={spt.maksud_perjalanan}
                              >
                                {spt.maksud_perjalanan && spt.maksud_perjalanan.length > 25
                                  ? `${spt.maksud_perjalanan.substring(0, 25)}...`
                                  : spt.maksud_perjalanan}
                              </span>{' '}
                              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {formatDate(spt.tanggal_berangkat)} -{' '}
                                {formatDate(spt.tanggal_kembali)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <ul className="space-y-1">
                              {spt.pegawai && spt.pegawai.length > 0 ? (
                                spt.pegawai.map((p) => {
                                  const isCanceled = canceledPegawaiSet.has(p.nama_lengkap);
                                  return (
                                    <li
                                      key={p.id}
                                      className={`text-xs ${
                                        isCanceled
                                          ? 'line-through whitespace-nowrap text-red-500 font-medium'
                                          : 'text-slate-800 font-medium whitespace-nowrap dark:text-slate-400'
                                      }`}
                                    >
                                      • {p.nama_lengkap}
                                    </li>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  Tidak ada pegawai
                                </span>
                              )}
                            </ul>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 align-top">
                            <div
                              className="font-medium whitespace-nowrap text-slate-800 dark:text-slate-200 flex gap-1.5 text-xs"
                              title={spt.lokasi_tujuan}
                            >
                              <MapPin className="h-3 w-3 text-slate-800 " />
                              {spt.lokasi_tujuan && spt.lokasi_tujuan.length > 25
                                ? `${spt.lokasi_tujuan.substring(0, 25)}...`
                                : spt.lokasi_tujuan}
                            </div>
                          </td>
                          <td className="py-3 px-6 text-right align-top relative">
                            <div className="inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === spt.id ? null : spt.id);
                                }}
                                className="dropdown-trigger inline-flex items-center gap-1.5 px-3 py-2 bg-red-100/40 hover:bg-indigo-100/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-red-900/90 dark:text-emerald-500 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                              >
                                <span>Aksi</span>
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdownId === spt.id ? 'rotate-180' : ''}`}
                                />
                              </button>
                              {/*Dropdowm Aksi*/}
                              {openDropdownId === spt.id && (
                                <div className="dropdown-menu absolute shrink-0 z-150 right-6 mt-1.5 w-52 bg-mauve-500 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-2xl py-1.5 text-left divide-y divide-slate-100 dark:divide-slate-700/50">
                                  {/* Section Cetak */}
                                  <div className="py-1">
                                    <div className="px-3 py-1 text-[9px] font-bold text-slate-200 uppercase tracking-wider">
                                      Cetak Dokumen
                                    </div>
                                    <a
                                      href={`/cetak/spt/${spt.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2.5 px-3 py-2 text-white dark:text-slate-200 hover:bg-mauve-200/20 dark:hover:bg-slate-700/50 text-xs font-semibold transition-colors"
                                    >
                                      <Printer className="h-4 w-4 text-green-300" />
                                      <span>Cetak SPT</span>
                                    </a>
                                    <a
                                      href={`/cetak/sppd/${spt.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2.5 px-3 py-2 text-white dark:text-slate-200 hover:bg-mauve-200/20 dark:hover:bg-slate-700/50 text-xs font-semibold transition-colors"
                                    >
                                      <Users className="h-4 w-4 text-green-300" />
                                      <span>Cetak SPD Kolektif</span>
                                    </a>
                                    {(userRole === 'admin' || userRole === 'superadmin') && (
                                      <a
                                        href={`/cetak/visum/${spt.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2.5 px-3 py-2 text-white dark:text-slate-200 hover:bg-mauve-200/20 dark:hover:bg-slate-700/50 text-xs font-semibold transition-colors"
                                      >
                                        <IconCetakVisum className="h-5 w-5 text-green-300" />
                                        <span>Cetak Visum</span>
                                      </a>
                                    )}
                                  </div>

                                  {/* Section Tindakan */}
                                  <div className="py-1">
                                    <div className="px-3 py-1 text-[9px] font-bold text-slate-200 uppercase tracking-wider">
                                      Tindakan & Laporan
                                    </div>
                                    {isCancelled ? (
                                      <div className="flex items-center gap-2.5 px-3 py-2 text-red-500 text-xs font-bold">
                                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                        <span>SPT Batal</span>
                                      </div>
                                    ) : hasReport ? (
                                      <div className="flex items-center gap-2.5 px-3 py-2 text-white text-xs font-semibold">
                                        <FileCheck className="h-4 w-4 text-slate-400" />
                                        <span>Sudah Dilaporkan</span>
                                      </div>
                                    ) : (
                                      <Link
                                        to={`/buat-laporan?spt_id=${spt.id}`}
                                        className="flex items-center gap-2.5 px-3 py-2 text-white dark:text-blue-400 hover:bg-mauve-200/20 dark:hover:bg-slate-700/50 text-xs font-semibold transition-colors"
                                      >
                                        <IconBuatLaporan className="h-4 w-4 text-sky-300" />
                                        <span>Buat Laporan</span>
                                      </Link>
                                    )}
                                  </div>

                                  {/* Section Admin */}
                                  {(userRole === 'admin' || userRole === 'superadmin') &&
                                    !isCancelled && (
                                      <div className="py-1">
                                        <div className="px-3 py-1 text-[9px] font-bold text-slate-200 uppercase tracking-wider">
                                          Kelola
                                        </div>
                                        <Link
                                          to={`/edit-spt/${spt.id}`}
                                          className="flex items-center gap-2.5 px-3 py-2 text-white dark:text-amber-400 hover:bg-mauve-200/20 dark:hover:bg-slate-700/50 text-xs font-semibold transition-colors"
                                        >
                                          <Edit className="h-4 w-4 text-orange-200" />
                                          <span>Edit SPT</span>
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenDropdownId(null);
                                            handleDeleteSpt(spt.id, spt.nomor_surat);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-white dark:text-red-400 hover:bg-mauve-200/20 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors text-left"
                                        >
                                          <Trash2 className="h-4 w-4 text-orange-200" />
                                          <span>Hapus SPT</span>
                                        </button>
                                      </div>
                                    )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ================= REGISTER SPPD TABLE ================= */
            <div className="overflow-x-auto rounded-2xl rounded-b-none">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="text-xs uppercase">
                  <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold">
                    <th className="py-3 px-6 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      No.
                    </th>
                    <th className="py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Nomor SPD
                    </th>
                    <th className="py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Nomor Surat Tugas
                    </th>
                    <th className="py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Pegawai
                    </th>
                    <th className="py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Maksud Perjalanan
                    </th>
                    <th className="py-3 px-6 text-center w-28 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {sppdList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-slate-400 dark:text-slate-500"
                      >
                        Tidak ada data Surat Perjalanan Dinas (SPPD) yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    sppdList.map((sppd, idx) => {
                      const isCanceled = sppd.is_canceled === 1;
                      return (
                        <tr
                          key={sppd.id}
                          className={`hover:bg-slate-50/40 dark:hover:bg-slate-700/20 transition-all ${
                            isCanceled ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-6 text-center text-slate-700 text-sm dark:text-slate-400 font-medium align-top">
                            {(sppdPage - 1) * limit + idx + 1}.
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium dark:text-slate-200 align-top">
                            <div className="flex flex-col whitespace-nowrap">
                              {sppd.nomor_sppd}
                              {isCanceled && (
                                <span className="inline-block text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-md ml-2">
                                  Dibatalkan
                                </span>
                              )}
                              <span className="text-xs text-slate-500 dark:text-slate-500">
                                {formatDate(sppd.tanggal_sppd)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium dark:text-slate-200 align-top">
                            {sppd.nomor_surat}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="flex flex-col ">
                              <span className="font-semibold whitespace-nowrap text-slate-700 text-xs dark:text-slate-200 align-top">
                                {sppd.pegawai_nama}
                              </span>
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                NIP. {sppd.pegawai_nip}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium dark:text-slate-200 align-top">
                            {sppd.maksud_perjalanan}
                          </td>
                          <td className="py-3 px-6 text-right align-top">
                            {/* Print Individual SPPD sheet */}
                            <button
                              href={`/cetak/sppd-detail/${sppd.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex flex-row gap-2 whitespace-nowrap items-center font-medium justify-center p-1.5 text-mauve-700 hover:text-green-600 dark:text-green-400 dark:hover:text-green-400 text-xs hover:bg-green-50 dark:hover:bg-slate-100/10 rounded-lg transition-colors"
                              title="Cetak SPPD Individu"
                            >
                              <Printer className="h-4 w-4" />
                              Cetak SPD
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/10 gap-4">
            <span className="text-xs dark:text-slate-400 text-slate-500 font-medium">
              Menampilkan Halaman{' '}
              <span className="font-bold ">{activeTab === 'spt' ? sptPage : sppdPage}</span> dari{' '}
              <span className="font-bold ">
                {activeTab === 'spt' ? sptPagination.totalPages : sppdPagination.totalPages}
              </span>{' '}
              (
              <span className="font-bold">
                {activeTab === 'spt' ? sptPagination.totalItems : sppdPagination.totalItems}
              </span>{' '}
              total data)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={(activeTab === 'spt' ? sptPage : sppdPage) === 1}
                onClick={() => (activeTab === 'spt' ? setSptPage(1) : setSppdPage(1))}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  activeTab === 'spt'
                    ? setSptPage((prev) => Math.max(prev - 1, 1))
                    : setSppdPage((prev) => Math.max(prev - 1, 1))
                }
                disabled={activeTab === 'spt' ? sptPage === 1 : sppdPage === 1}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
                title="Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from(
                {
                  length:
                    activeTab === 'spt' ? sptPagination.totalPages : sppdPagination.totalPages,
                },
                (_, i) => i + 1
              ).map((num) => (
                <button
                  key={num}
                  onClick={() => (activeTab === 'spt' ? setSptPage(num) : setSppdPage(num))}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    (activeTab === 'spt' ? sptPage : sppdPage) === num
                      ? 'bg-indigo-600 dark:bg-indigo-800 text-white border-indigo-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() =>
                  activeTab === 'spt'
                    ? setSptPage((prev) => Math.min(prev + 1, sptPagination.totalPages))
                    : setSppdPage((prev) => Math.min(prev + 1, sppdPagination.totalPages))
                }
                disabled={
                  activeTab === 'spt'
                    ? sptPage === sptPagination.totalPages
                    : sppdPage === sppdPagination.totalPages
                }
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
                title="Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                disabled={
                  (activeTab === 'spt' ? sptPage : sppdPage) ===
                  (activeTab === 'spt' ? sptPagination.totalPages : sppdPagination.totalPages)
                }
                onClick={() =>
                  activeTab === 'spt'
                    ? setSptPage(sptPagination.totalPages)
                    : setSppdPage(sppdPagination.totalPages)
                }
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL TAMBAH PANJAR (UANG MUKA) ================= */}
      {panjarModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPanjarModalOpen(false);
          }}
        >
          <div className="bg-mauve-200 dark:bg-slate-800 rounded-3xl dark:border dark:border-slate-700 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 bg-linear-to-l/hsl from-rose-300 to-rose-900 dark:bg-gradient-to-r dark:from-emerald-800 dark:to-teal-700 text-white">
              <div>
                <h3 className="text-xl font-bold text-slate-100 dark:text-white">
                  Rincian Biaya Perjalanan Dinas (Uang Muka)
                </h3>
                <p className="text-slate-200 text-xs mt-1 dark:text-slate-300">
                  Formulir pengajuan uang panjar pelaksana perjalanan dinas.
                </p>
              </div>
              <button
                onClick={() => setPanjarModalOpen(false)}
                className="p-1.5 text-slate-200 dark:hover:text-slate-200 hover:bg-slate-200/10 rounded-full dark:hover:bg-slate-200/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {panjarError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{panjarError}</span>
                </div>
              )}

              {panjarNotif && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm border border-amber-100 dark:border-amber-900/30">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{panjarNotif}</span>
                </div>
              )}

              <form onSubmit={handlePanjarSubmit} id="panjar-form" className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Tempat
                    </label>
                    <input
                      type="text"
                      required
                      value={panjarForm.tempat}
                      onChange={(e) =>
                        setPanjarForm((prev) => ({ ...prev, tempat: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-mauve-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Tanggal Panjar
                    </label>
                    <input
                      type="date"
                      required
                      value={panjarForm.tanggal_panjar}
                      onChange={(e) =>
                        setPanjarForm((prev) => ({ ...prev, tanggal_panjar: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-mauve-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500
                        bg-no-repeat bg-right 
                    [background-position-x:calc(100%-0.75rem)] 
                    
                    dark:[background-image:url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2724%27%20height=%2724%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%2364748b%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3e%3crect%20x=%273%27%20y=%274%27%20width=%2718%27%20height=%2718%27%20rx=%272%27%20ry=%272%27%3e%3c/rect%3e%3cline%20x1=%2716%27%20y1=%272%27%20x2=%2716%27%20y2=%276%27%3e%3c/line%3e%3cline%20x1=%278%27%20y1=%272%27%20x2=%278%27%20y2=%276%27%3e%3c/line%3e%3cline%20x1=%273%27%20y1=%2710%27%20x2=%2721%27%20y2=%2710%27%3e%3c/line%3e%3c/svg%3e')]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Nomor SPT / SPD Terkait
                  </label>
                  <div className="px-4 py-2 border border-mauve-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-mauve-500 focus-within:border-transparent dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                    <select
                      required
                      value={panjarForm.spt_id}
                      onChange={(e) => handlePanjarSptChange(e.target.value)}
                      className="w-full  text-sm outline-none "
                    >
                      <option value="" className="dark:bg-slate-900 dark:text-slate-200">
                        -- Pilih SPT --
                      </option>
                      {allSptsForPanjar.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          className="dark:bg-slate-900 dark:text-slate-200"
                        >
                          {s.nomor_surat} (Tujuan: {s.lokasi_tujuan})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pelaksana Perjalanan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Pegawai Pelaksana Perjalanan
                    </label>
                    <div className="px-1 py-2 border border-mauve-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-mauve-500 focus-within:border-transparent disabled:opacity-50 dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                      <select
                        required
                        disabled={loadingPelaksana || availablePelaksana.length === 0}
                        value={panjarForm.pelaksana_id}
                        onChange={(e) =>
                          setPanjarForm((prev) => ({ ...prev, pelaksana_id: e.target.value }))
                        }
                        className="w-full  text-sm outline-none "
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
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Bendahara Pengeluaran
                    </label>
                    <div className="px-1 py-2 border border-mauve-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-mauve-500 focus-within:border-transparent dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                      <select
                        required
                        value={panjarForm.bendahara_id}
                        onChange={(e) =>
                          setPanjarForm((prev) => ({ ...prev, bendahara_id: e.target.value }))
                        }
                        className="w-full  text-sm outline-none "
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Pejabat Berwenang / Kepala Dinas
                  </label>
                  <div className="px-4 py-2 border border-mauve-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-mauve-500 focus-within:border-transparent dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                    <select
                      required
                      value={panjarForm.pejabat_id}
                      onChange={(e) =>
                        setPanjarForm((prev) => ({ ...prev, pejabat_id: e.target.value }))
                      }
                      className="w-full  text-sm outline-none "
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
                </div>

                {/* Perincian Biaya Dinamis */}
                <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Perincian Biaya Perjalanan
                    </span>
                    <button
                      type="button"
                      onClick={addRincianRow}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      + Tambah Baris
                    </button>
                  </div>

                  <div className="space-y-3">
                    {panjarForm.rincian.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Uraian Biaya (misal: Uang Harian)"
                          value={item.uraian}
                          onChange={(e) => handleRincianChange(idx, 'uraian', e.target.value)}
                          className="w-full sm:flex-1 px-3 py-2 border border-mauve-300 dark:placeholder:text-slate-500/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Jumlah (Rp)"
                          value={item.jumlah ? formatNumber(item.jumlah) : ''}
                          onChange={(e) => handleRincianChange(idx, 'jumlah', e.target.value)}
                          className="w-full sm:w-44 px-3 py-2 border border-mauve-300 dark:placeholder:text-slate-500/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-mauve-500 text-right font-medium dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Keterangan"
                          value={item.keterangan}
                          onChange={(e) => handleRincianChange(idx, 'keterangan', e.target.value)}
                          className="w-full sm:w-48 px-3 py-2 border border-mauve-300 dark:placeholder:text-slate-500/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-mauve-500 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          disabled={panjarForm.rincian.length === 1}
                          onClick={() => removeRincianRow(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 dark:text-slate-300 dark:hover:text-slate-200 dark:hover:bg-slate-200/10 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end items-center gap-3 p-6 border-t border-slate-100 dark:border-t-0 dark:bg-slate-800 dark:border-slate-700 bg-mauve-200 dark:bg-slate-850">
              <button
                type="button"
                onClick={() => setPanjarModalOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:shadow-lg hover:shadow-mauve-700/20 dark:border-slate-700 bg-white hover:bg-slate-100 dark:hover:bg-slate-200/10 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-semibold transition-all duration-200 transition-all ease-in-out"
              >
                Batal
              </button>
              <button
                type="submit"
                form="panjar-form"
                disabled={availablePelaksana.length === 0}
                className="px-5 py-2 hover:shadow-lg bg-white hover:shadow-mauve-700/20 dark:shadow-none dark:border-0 border duration-200 transition-all ease-in-out  border-mauve-700 hover:bg-mauve-100 text-mauve-700 dark:text-slate-200 dark:bg-emerald-800 dark:hover:bg-emerald-700  rounded-2xl text-sm font-semibold   disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan Uang Muka
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFLICT ALERT DIALOG ================= */}
      {alertModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAlertModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl w-full max-w-md mx-auto flex flex-col p-6 animate-zoomIn">
            <div className="text-center space-y-3">
              <div className="h-12 w-12 bg-red-100 dark:bg-red-950/25 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Peringatan Penghapusan
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {alertMessage}
              </p>
            </div>
            <button
              onClick={() => setAlertModalOpen(false)}
              className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-750 text-white dark:bg-slate-750 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all shadow-md"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SptRegister;
