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
  Save,
  Info,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

const Pembayaran = () => {
  const [activeTab, setActiveTab] = useState('pembayaran'); // 'pembayaran' or 'riil'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination & limits
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Lists
  const [pembayaranList, setPembayaranList] = useState([]);
  const [riilList, setRiilList] = useState([]);

  // Modal 1: Pembayaran (Bukti Bayar) Form
  const [pembayaranModalOpen, setPembayaranModalOpen] = useState(false);
  const [pembayaranEditId, setPembayaranEditId] = useState(null);
  const [allSpts, setAllSpts] = useState([]);
  const [allAnggaran, setAllAnggaran] = useState([]);
  const [allPptk, setAllPptk] = useState([]);
  const [pembayaranForm, setPembayaranForm] = useState({
    nomor_bukti: '',
    tanggal_bukti: new Date().toISOString().split('T')[0],
    spt_id: '',
    anggaran_id: '',
    nama_penerima: '',
    uraian_pembayaran: '',
    pptk_id: '',
    nominal_bayar: 0,
    panjar_data: [],
  });
  const [rincianPengeluaran, setRincianPengeluaran] = useState({ penerima: [], pengeluaran: [] });
  const [loadingRincian, setLoadingRincian] = useState(false);
  const [panjarValues, setPanjarValues] = useState({}); // mapping pegawai_id -> panjar value input
  const [dibayarOverrides, setDibayarOverrides] = useState({}); // mapping pegawai_id_type -> dibayar override input

  // Modal 2: Pengeluaran Riil Form
  const [riilModalOpen, setRiilModalOpen] = useState(false);
  const [riilEditId, setRiilEditId] = useState(null);
  const [riilSptList, setRiilSptList] = useState([]);
  const [riilPelaksanaList, setRiilPelaksanaList] = useState([]);
  const [loadingRiilPelaksana, setLoadingRiilPelaksana] = useState(false);
  const [riilForm, setRiilForm] = useState({
    spt_id: '',
    pegawai_id: '',
    uraian: '',
    jumlah: '',
  });

  const parseCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;

    const str = String(value).trim();

    // PERBAIKAN BARU: Logika yang lebih ketat.
    // 1. Cek apakah string hanya berisi angka, titik, koma, dan simbol "Rp".
    // Jika ada karakter lain (seperti huruf 'a'-'z', atau simbol lain), anggap tidak valid.
    if (/[^0-9.,\sRp-]/i.test(str)) {
      return 0;
    }

    // 2. Bersihkan dari "Rp" dan spasi
    let cleaned = str.replace(/Rp\.?\s*/g, '').trim();

    // 3. Logika baru untuk menangani titik dan koma
    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');

    if (hasDot && hasComma) {
      // Format Indonesia: "1.500.000,50" -> "1500000.50"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      // Format hanya koma: "1500000,50" -> "1500000.50"
      cleaned = cleaned.replace(',', '.');
    } else if (hasDot && !hasComma && cleaned.lastIndexOf('.') < cleaned.length - 3) {
      // Format hanya titik ribuan: "1.500.000" -> "1500000"
      cleaned = cleaned.replace(/\./g, '');
    }

    // 3. Konversi ke angka. Jika hasilnya bukan angka (NaN), kembalikan 0.
    return parseFloat(cleaned) || 0;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'Rp 0';
    // Gunakan nilai asli angka, jangan lakukan parse ulang jika value sudah berupa number
    const number = typeof value === 'number' ? value : parseCurrency(value);
    if (isNaN(number)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const formatInputCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const number = typeof value === 'number' ? value : parseCurrency(value);
    return isNaN(number) ? '' : new Intl.NumberFormat('id-ID').format(number);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const showNotification = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 5000);
    }
  };

  // --- Initial Data Fetching ---
  useEffect(() => {
    if (activeTab === 'pembayaran') {
      fetchPembayaran();
    } else {
      fetchRiil();
    }
  }, [activeTab, page, limit]);

  const fetchPembayaran = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/pembayaran', {
        params: { page, limit },
      });
      if (res.data) {
        setPembayaranList(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('Gagal memuat data bukti pembayaran.', false);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiil = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/pengeluaran-riil', {
        params: { page, limit },
      });
      if (res.data) {
        setRiilList(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('Gagal memuat data pengeluaran riil.', false);
    } finally {
      setLoading(false);
    }
  };

  // Delete actions
  const handleDeletePembayaran = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus bukti pembayaran ini?')) return;
    try {
      const res = await axios.delete(`/api/pembayaran/${id}`);
      showNotification(res.data?.message || 'Data pembayaran berhasil dihapus.');
      fetchPembayaran();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Gagal menghapus data pembayaran.', false);
    }
  };

  const handleDeleteRiil = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data pengeluaran riil ini?')) return;
    try {
      const res = await axios.delete(`/api/pengeluaran-riil/${id}`);
      showNotification(res.data?.message || 'Data pengeluaran riil berhasil dihapus.');
      fetchRiil();
    } catch (err) {
      console.error(err);
      showNotification(
        err.response?.data?.message || 'Gagal menghapus data pengeluaran riil.',
        false
      );
    }
  };

  // --- Modal Pembayaran Logic ---
  const openPembayaranModal = async (id = null) => {
    setPembayaranEditId(id);
    setRincianPengeluaran({ penerima: [], pengeluaran: [] });
    setPanjarValues({});
    setDibayarOverrides({});

    // Load dropdown options
    try {
      const [sptRes, anggRes, pegRes] = await Promise.all([
        axios.get('/api/spt?limit=1000'),
        axios.get('/api/anggaran/options'),
        axios.get('/api/pegawai?limit=1000'),
      ]);
      setAllSpts(sptRes.data?.data || sptRes.data || []);
      setAllAnggaran(anggRes.data || []);
      setAllPptk(pegRes.data?.data || pegRes.data || []);
    } catch (err) {
      console.error('Gagal memuat opsi form:', err);
    }

    if (id) {
      try {
        const res = await axios.get(`/api/pembayaran/${id}`);
        const data = res.data;

        setPembayaranForm({
          nomor_bukti: data.nomor_bukti || '',
          tanggal_bukti: data.tanggal_bukti
            ? data.tanggal_bukti.split('T')[0]
            : new Date().toISOString().split('T')[0],
          spt_id: data.spt_id || '',
          anggaran_id: data.anggaran_id || '',
          nama_penerima: data.nama_penerima || '',
          uraian_pembayaran: data.uraian_pembayaran || '',
          pptk_id: data.pptk_id || '',
          nominal_bayar: data.nominal_bayar || 0,
          panjar_data: data.panjar_data ? JSON.parse(data.panjar_data) : [],
        });

        // Load expenditures
        await loadExpenditures(data.spt_id, JSON.parse(data.panjar_data || '[]'));
      } catch (err) {
        console.error(err);
      }
    } else {
      setPembayaranForm({
        nomor_bukti: '',
        tanggal_bukti: new Date().toISOString().split('T')[0],
        spt_id: '',
        anggaran_id: '',
        nama_penerima: '',
        uraian_pembayaran: '',
        pptk_id: '',
        nominal_bayar: 0,
        panjar_data: [],
      });
    }
    setPembayaranModalOpen(true);
  };

  const loadExpenditures = async (sptId, savedPanjars = null) => {
    if (!sptId) return;
    setLoadingRincian(true);
    try {
      const res = await axios.get(`/api/laporan/by-spt/${sptId}`);
      if (res.data) {
        setRincianPengeluaran(res.data);

        // Auto fill receiver names
        const names = (res.data.penerima || [])
          .map((p) => `${p.nama_lengkap} - NIP. ${p.nip}`)
          .join('\n');
        setPembayaranForm((prev) => ({ ...prev, nama_penerima: names }));

        // Map panjar values
        const currentPanjars = {};
        const currentOverrides = {};
        if (savedPanjars) {
          savedPanjars.forEach((item) => {
            currentPanjars[item.pegawai_id.toString()] = formatInputCurrency(item.nilai_panjar);
            if (item.overrides) {
              Object.keys(item.overrides).forEach((type) => {
                currentOverrides[`${item.pegawai_id}_${type}`] = formatInputCurrency(
                  item.overrides[type]
                );
              });
            }
          });
        } else {
          // Fetch existing panjar from backend automatically
          try {
            const panjarRes = await axios.get(`/api/panjar/by-spt/${sptId}`);
            if (panjarRes.data) {
              Object.keys(panjarRes.data).forEach((pId) => {
                currentPanjars[pId] = formatInputCurrency(panjarRes.data[pId]);
              });
            }
          } catch (e) {
            console.warn(e);
          }
        }
        setPanjarValues(currentPanjars);
        setDibayarOverrides(currentOverrides);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404 && !pembayaranEditId) {
        alert(
          'Belum ada laporan yang dibuat untuk SPT ini. Buatlah laporan perjalanan dinas terlebih dahulu.'
        );
        setPembayaranForm((prev) => ({ ...prev, spt_id: '' }));
      }
    } finally {
      setLoadingRincian(false);
    }
  };

  const handleSptChange = (e) => {
    const sptId = e.target.value;
    setPembayaranForm((prev) => ({ ...prev, spt_id: sptId }));

    // Auto-fill budget and purposes if found
    const selected = allSpts.find((s) => s.id.toString() === sptId);
    if (selected) {
      setPembayaranForm((prev) => ({
        ...prev,
        anggaran_id: selected.anggaran_id || '',
        uraian_pembayaran: `Pembayaran Perjalanan Dinas dalam rangka ${selected.maksud_perjalanan || ''}`,
      }));
      // Auto-set PPTK from budget
      const budget = allAnggaran.find((a) => a.id === selected.anggaran_id);
      if (budget && budget.pptk_id) {
        setPembayaranForm((prev) => ({ ...prev, pptk_id: budget.pptk_id }));
      }
    }
    loadExpenditures(sptId);
  };

  const handleAnggaranChange = (e) => {
    const anggId = e.target.value;
    setPembayaranForm((prev) => ({ ...prev, anggaran_id: anggId }));
    const budget = allAnggaran.find((a) => a.id.toString() === anggId);
    if (budget && budget.pptk_id) {
      setPembayaranForm((prev) => ({ ...prev, pptk_id: budget.pptk_id }));
    }
  };

  const getRowDefaultDibayar = (pInfo, rows, row, rowIdx, panjarVal) => {
    if (row.type === 'akomodasi') return 0;

    let remainingPanjar = parseCurrency(panjarVal);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.type === 'akomodasi') continue;

      const cost = r.total || 0;
      if (i === rowIdx) {
        return Math.max(0, cost - remainingPanjar);
      }
      remainingPanjar = Math.max(0, remainingPanjar - cost);
    }
    return 0;
  };

  // --- PERBAIKAN LOGIKA HITUNG TOTAL PEGAWAI (SELISIH TOTAL DIBAYAR - PANJAR) ---
  const calculateEmployeeTotal = (pegId) => {
    if (!pegId || typeof pegId === 'object') return { totalBiaya: 0, panjar: 0, totalBayar: 0 };

    // Pastikan ID dibersihkan menjadi string angka bersih, buang jika mengandung teks non-id
    const targetId = String(pegId).trim();
    if (isNaN(Number(targetId))) return { totalBiaya: 0, panjar: 0, totalBayar: 0 };

    const pInfo = rincianPengeluaran.penerima.find((p) => p.id.toString() === targetId);
    // PERBAIKAN: Ambil data pengeluaran spesifik untuk pegawai ini dari array yang benar.
    const exp =
      rincianPengeluaran.pengeluaran.find((p) => p.pegawai_id.toString() === targetId) || {};

    if (!pInfo) return { totalBiaya: 0, panjar: 0, totalBayar: 0 };

    const harianRate = parseCurrency(pInfo.uang_harian?.harga_satuan || 0);
    const qtyDays = rincianPengeluaran.lama_perjalanan || (exp.akomodasi_malam || 0) + 1;
    const harianTotal = harianRate * qtyDays;

    let representasiTotal = 0;
    const isKadis = pInfo.jabatan && pInfo.jabatan.toLowerCase().includes('kepala dinas');
    if (isKadis && pInfo.biaya_representasi && pInfo.biaya_representasi.harga > 0) {
      representasiTotal = parseCurrency(pInfo.biaya_representasi.harga) * qtyDays;
    }

    // PERBAIKAN: Ambil nilai dari objek 'exp' yang sudah difilter dengan benar.
    const transportTotal = parseCurrency(exp.transportasi_nominal || 0);
    const akomodasiTotal = parseCurrency(exp.akomodasi_nominal || 0);
    const kontribusiTotal = parseCurrency(exp.kontribusi_nominal || 0);
    const lainTotal = parseCurrency(exp.lain_lain_nominal || 0);

    const panjar = parseCurrency(panjarValues[targetId] || 0);

    // Hitung total akumulasi biaya asli pengeluaran riil pegawai
    const totalBiayaRealisasi =
      harianTotal +
      representasiTotal +
      transportTotal +
      akomodasiTotal +
      kontribusiTotal +
      lainTotal;

    // Reconstruct rows for this employee to compute default net paid values
    const rows = [];
    rows.push({ type: 'uang_harian', total: harianTotal });
    if (representasiTotal > 0) {
      rows.push({ type: 'representasi', total: representasiTotal });
    }
    if (transportTotal > 0) {
      rows.push({ type: 'transportasi', total: transportTotal });
    }
    if (akomodasiTotal > 0) {
      rows.push({ type: 'akomodasi', total: akomodasiTotal });
    }
    if (kontribusiTotal > 0) {
      rows.push({ type: 'kontribusi', total: kontribusiTotal });
    }
    if (lainTotal > 0) {
      rows.push({ type: 'lain_lain', total: lainTotal });
    }

    let totalBayar = 0;
    rows.forEach((row) => {
      const key = `${targetId}_${row.type}`;
      if (dibayarOverrides[key] !== undefined && dibayarOverrides[key] !== '') {
        totalBayar += parseCurrency(dibayarOverrides[key]);
      } else {
        totalBayar += 0;
      }
    });

    totalBayar -= panjar;

    return { totalBiaya: totalBiayaRealisasi, panjar, totalBayar };
  };

  const getGrandTotal = () => {
    let grandTotal = 0;
    if (!rincianPengeluaran || !rincianPengeluaran.penerima) return 0;

    rincianPengeluaran.penerima.forEach((p) => {
      if (p && p.id) {
        const { totalBayar } = calculateEmployeeTotal(p.id.toString());
        grandTotal += totalBayar;
      }
    });
    return grandTotal;
  };

  const handlePembayaranSubmit = async (e) => {
    e.preventDefault();
    if (!pembayaranForm.spt_id || !pembayaranForm.anggaran_id || !pembayaranForm.pptk_id) {
      alert('Mohon isi semua field wajib.');
      return;
    }

    // Construct panjar data
    const panjarData = [];
    const allPegIds = new Set([
      ...Object.keys(panjarValues),
      ...Object.keys(dibayarOverrides).map((k) => k.split('_')[0]),
    ]);

    allPegIds.forEach((pegIdStr) => {
      const pegId = parseInt(pegIdStr);
      if (isNaN(pegId)) return;
      const val = parseCurrency(panjarValues[pegIdStr] || '0');

      // Collect overrides for this pegawai
      const employeeOverrides = {};
      let hasOverrides = false;
      Object.keys(dibayarOverrides).forEach((k) => {
        const parts = k.split('_');
        const pId = parts[0];
        const type = parts.slice(1).join('_');
        if (pId === pegIdStr) {
          const overrideVal = parseCurrency(dibayarOverrides[k]);
          employeeOverrides[type] = overrideVal;
          hasOverrides = true;
        }
      });

      if (val > 0 || hasOverrides) {
        panjarData.push({
          pegawai_id: pegId,
          nilai_panjar: val,
          overrides: employeeOverrides,
        });
      }
    });

    const payload = {
      nomor_bukti: pembayaranForm.nomor_bukti,
      tanggal_bukti: pembayaranForm.tanggal_bukti,
      spt_id: pembayaranForm.spt_id,
      anggaran_id: pembayaranForm.anggaran_id,
      nama_penerima: pembayaranForm.nama_penerima,
      uraian_pembayaran: pembayaranForm.uraian_pembayaran,
      pptk_id: pembayaranForm.pptk_id,
      nominal_bayar: getGrandTotal(),
      panjar_data: JSON.stringify(panjarData),
    };

    try {
      let res;
      if (pembayaranEditId) {
        res = await axios.put(`/api/pembayaran/${pembayaranEditId}`, payload);
      } else {
        res = await axios.post('/api/pembayaran', payload);
      }
      showNotification(res.data?.message || 'Data pembayaran berhasil disimpan.');
      setPembayaranModalOpen(false);
      fetchPembayaran();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan bukti pembayaran: ' + (err.response?.data?.message || err.message));
    }
  };

  // --- Modal Pengeluaran Riil Logic ---
  const openRiilModal = async (id = null) => {
    setRiilEditId(id);

    // Load SPTs for dropdown
    try {
      const res = await axios.get('/api/spt?limit=0');
      setRiilSptList(res.data || []);
    } catch (err) {
      console.error(err);
    }

    if (id) {
      try {
        const res = await axios.get(`/api/pengeluaran-riil/${id}`);
        const data = res.data;
        setRiilForm({
          spt_id: data.spt_id || '',
          pegawai_id: data.pegawai_id || '',
          uraian: data.uraian || '',
          jumlah: formatInputCurrency(data.jumlah),
        });
        await loadRiilPelaksana(data.spt_id, data.pegawai_id);
      } catch (err) {
        console.error(err);
      }
    } else {
      setRiilForm({
        spt_id: '',
        pegawai_id: '',
        uraian: '',
        jumlah: '',
      });
      setRiilPelaksanaList([]);
    }
    setRiilModalOpen(true);
  };

  const loadRiilPelaksana = async (sptId, selectedPegawaiId = null) => {
    if (!sptId) {
      setRiilPelaksanaList([]);
      return;
    }
    setLoadingRiilPelaksana(true);

    // Check if report exists
    try {
      const checkRes = await axios.get(`/api/laporan/check/by-spt/${sptId}`);
      if (!checkRes.data || !checkRes.data.exists) {
        alert(
          'Laporan terkait Surat Tugas yang dipilih belum dibuat. Buat laporan terlebih dahulu.'
        );
        setRiilForm((prev) => ({ ...prev, spt_id: '' }));
        setRiilPelaksanaList([]);
        setLoadingRiilPelaksana(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const res = await axios.get(`/api/spt/${sptId}`);
      const sptDetail = res.data || {};
      setRiilPelaksanaList(sptDetail.pegawai || []);
      if (selectedPegawaiId) {
        setRiilForm((prev) => ({ ...prev, pegawai_id: selectedPegawaiId }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRiilPelaksana(false);
    }
  };

  const handleRiilSptChange = (e) => {
    const sptId = e.target.value;
    setRiilForm((prev) => ({ ...prev, spt_id: sptId, pegawai_id: '' }));
    loadRiilPelaksana(sptId);
  };

  const handleRiilSubmit = async (e) => {
    e.preventDefault();
    if (!riilForm.spt_id || !riilForm.pegawai_id || !riilForm.uraian || !riilForm.jumlah) {
      alert('Mohon isi semua field.');
      return;
    }

    const payload = {
      spt_id: riilForm.spt_id,
      pegawai_id: riilForm.pegawai_id,
      uraian: riilForm.uraian,
      jumlah: parseCurrency(riilForm.jumlah),
    };

    try {
      let res;
      if (riilEditId) {
        res = await axios.put(`/api/pengeluaran-riil/${riilEditId}`, payload);
      } else {
        res = await axios.post('/api/pengeluaran-riil', payload);
      }
      showNotification(res.data?.message || 'Data pengeluaran riil berhasil disimpan.');
      setRiilModalOpen(false);
      fetchRiil();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengeluaran riil: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {success && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-semibold">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              MANAJEMEN PEMBAYARAN
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Buat kuitansi bukti pembayaran perjalanan dinas dan bukti pengeluaran riil.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => openRiilModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-200 text-emerald-600 rounded-2xl text-sm font-semibold border border-emerald-100 shadow-sm transition-all duration-200"
            >
              <FileSpreadsheet size={16} />
              <span>Pengeluaran Riil</span>
            </button>
            <button
              onClick={() => openPembayaranModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-mauve-100 hover:bg-mauve-200 hover:border-mauve-300 text-mauve-700 rounded-2xl text-sm font-semibold shadow-sm border border-mauve-200 transition-all duration-200"
            >
              <Plus size={16} />
              <span>Bukti Bayar</span>
            </button>
          </div>
        </div>

        {/* Tabs & Limits */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-600 pb-2 gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('pembayaran');
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-t-2xl rounded-l-none transition-all duration-200 ${
                activeTab === 'pembayaran'
                  ? 'bg-mauve-500 dark:bg-slate-100 text-white dark:text-mauve-700'
                  : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
              }`}
            >
              Daftar Bukti Pembayaran
            </button>
            <button
              onClick={() => {
                setActiveTab('riil');
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-t-2xl rounded-l-none transition-all duration-200 ${
                activeTab === 'riil'
                  ? 'bg-mauve-500 dark:bg-slate-100 text-white dark:text-mauve-700'
                  : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
              }`}
            >
              Daftar Bukti Pengeluaran Riil
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">Tampilkan:</span>
            <div className="px-1 py-1.5 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-mauve-500 dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
                className=" text-sm  dark:text-slate-200  dark:bg-slate-900 text-slate-600 outline-none "
              >
                <option value={5}>5</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lists Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Memuat Data...
            </p>
          </div>
        ) : activeTab === 'pembayaran' ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl rounded-b-none">
              <table className="min-w-full divide-y divide-slate-100 dark:bg-slate-800 text-xs">
                <thead className="uppercase">
                  <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      No
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      No & Tgl ST
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      No & Tgl Bukti
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Penerima
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Nominal
                    </th>
                    <th className="py-3.5 px-4 text-center shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-sm text-slate-600">
                  {pembayaranList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Belum ada data pembayaran kuitansi.
                      </td>
                    </tr>
                  ) : (
                    pembayaranList.map((item, idx) => (
                      <tr key={item.id} className="dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-slate-800 dark:text-slate-200 align-top">
                          {(page - 1) * limit + idx + 1}.
                        </td>
                        <td className="py-3 px-4 align-top">
                          <span className="font-medium text-slate-700 dark:text-slate-200 block text-xs">
                            {item.nomor_surat}
                          </span>
                          <span className="text-xs text-slate-500 font-medium dark:text-slate-400">
                            {formatDate(item.tanggal_surat)}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <span className="font-medium text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap block">
                            {item.nomor_bukti}
                          </span>
                          <span className="text-slate-500 font-medium text-xs dark:text-slate-400">
                            {formatDate(item.tanggal_bukti)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line align-top">
                          {item.nama_penerima}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium align-top">
                          {formatCurrency(item.nominal_bayar)}
                        </td>
                        <td className="py-3  pr-2 pl-6 items-center flex text-center">
                          <div className="flex gap-3">
                            <a
                              href={`/cetak/pembayaran/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-mauve-700 dark:text-green-400 dark:hover:text-green-400 hover:text-green-600 dark:hover:bg-slate-100/10 hover:bg-green-50 rounded-lg transition-all"
                              title="Cetak Bukti Pembayaran"
                            >
                              <Printer size={16} />
                            </a>
                            <button
                              onClick={() => openPembayaranModal(item.id)}
                              className="p-1.5 text-mauve-700 dark:text-yellow-400 dark:hover:text-yellow-400 dark:hover:bg-slate-100/10 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit Bukti Bayar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePembayaran(item.id)}
                              className="p-1.5 text-mauve-700 dark:text-rose-400 dark:hover:text-rose-400 dark:hover:bg-slate-100/10 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Hapus Bukti Bayar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bukti Bayar */}
            {!loading && totalItems > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-none pt-4 px-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan Halaman <span className="font-semibold">{page}</span> dari{' '}
                  <span className="font-semibold">{totalPages}</span> ({totalItems} total data)
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                      const isCurrent = page === num;
                      const baseClasses =
                        'w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200';
                      const activeClasses =
                        'bg-indigo-600 text-white shadow-md shadow-indigo-600/10';
                      const inactiveClasses =
                        'border border-slate-200 text-slate-600 hover:bg-slate-50';
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`${baseClasses} ${isCurrent ? activeClasses : inactiveClasses}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl rounded-b-none">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="uppercase">
                  <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      No
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Nama Pelaksana
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Uraian
                    </th>
                    <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Jumlah
                    </th>
                    <th className="py-3.5 px-4 text-center shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-sm text-slate-600">
                  {riilList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Belum ada data pengeluaran riil.
                      </td>
                    </tr>
                  ) : (
                    riilList.map((item, idx) => (
                      <tr key={item.id} className="dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">
                          {(page - 1) * limit + idx + 1}.
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {item.nama_pegawai}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                          {item.uraian}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">
                          {formatCurrency(item.jumlah)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              href={`/cetak/pengeluaran-riil/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-mauve-700 dark:text-green-400 dark:hover:text-green-400 hover:text-green-600 dark:hover:bg-slate-100/10 hover:bg-slate-100 rounded-lg transition-all"
                              title="Cetak Pengeluaran Riil"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => openRiilModal(item.id)}
                              className="p-1.5 text-mauve-700 dark:text-yellow-400 dark:hover:text-yellow-400 dark:hover:bg-slate-100/10 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-all"
                              title="Edit Pengeluaran Riil"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRiil(item.id)}
                              className="p-1.5 text-mauve-700 dark:text-rose-400 dark:hover:text-rose-400 dark:hover:bg-slate-100/10 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                              title="Hapus Pengeluaran Riil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Riil */}
            {!loading && totalItems > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-none pt-4 px-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan Halaman <span className="font-semibold">{page}</span> dari{' '}
                  <span className="font-semibold">{totalPages}</span> ({totalItems} total data)
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                      const isCurrent = page === num;
                      const baseClasses =
                        'w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200';
                      const activeClasses =
                        'bg-indigo-600 text-white shadow-md shadow-indigo-600/10';
                      const inactiveClasses =
                        'border border-slate-200 text-slate-600 hover:bg-slate-50';
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`${baseClasses} ${isCurrent ? activeClasses : inactiveClasses}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL 1: BUKTI PEMBAYARAN FORM --- */}
      {pembayaranModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPembayaranModalOpen(false);
          }}
        >
          <div className="w-full max-w-5xl bg-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-800 dark:to-teal-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {pembayaranEditId ? 'Edit Bukti Pembayaran' : 'Buat Bukti Pembayaran Baru'}
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Kelola data kuitansi bayar perjalanan dinas secara langsung.
                </p>
              </div>
              <button
                onClick={() => setPembayaranModalOpen(false)}
                className="text-emerald-100 hover:text-white p-1  hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handlePembayaranSubmit}
              className="flex-1  overflow-y-auto dark:bg-slate-800 p-6 pb-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2   gap-4">
                <div>
                  <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5">
                    Nomor Bukti
                  </label>
                  <input
                    type="text"
                    value={pembayaranForm.nomor_bukti}
                    onChange={(e) =>
                      setPembayaranForm((prev) => ({ ...prev, nomor_bukti: e.target.value }))
                    }
                    required
                    placeholder="Contoh: 001/KWT/VI/2026"
                    className="w-full px-3 py-2 border border-slate-200 dark:bg-slate-900/70 dark:border-slate-700/50 focus:ring-mauve-500 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 dark:focus:ring-emerald-600/20 focus:border-transparent bg-white dark:focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500  mb-1.5">
                    Tanggal Bukti
                  </label>
                  <input
                    type="date"
                    value={pembayaranForm.tanggal_bukti}
                    onChange={(e) =>
                      setPembayaranForm((prev) => ({ ...prev, tanggal_bukti: e.target.value }))
                    }
                    required
                    className="w-full  px-3 py-2 border border-slate-200 bg-white dark:bg-slate-900/70 dark:border-slate-700/50 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500
                    
                    /* PERBAIKAN: Menambahkan ikon kalender kustom sebagai background */
                    bg-no-repeat bg-right 
                    [background-position-x:calc(100%-0.75rem)] 
                    
                    dark:[background-image:url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2724%27%20height=%2724%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%2364748b%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3e%3crect%20x=%273%27%20y=%274%27%20width=%2718%27%20height=%2718%27%20rx=%272%27%20ry=%272%27%3e%3c/rect%3e%3cline%20x1=%2716%27%20y1=%272%27%20x2=%2716%27%20y2=%276%27%3e%3c/line%3e%3cline%20x1=%278%27%20y1=%272%27%20x2=%278%27%20y2=%276%27%3e%3c/line%3e%3cline%20x1=%273%27%20y1=%2710%27%20x2=%2721%27%20y2=%2710%27%3e%3c/line%3e%3c/svg%3e')]
                    "
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5">
                    Register SPT
                  </label>
                  <div className="px-3 py-2 border border-slate-200 dark:bg-slate-900/70 dark:border-slate-700/50 focus-within:ring-mauve-500 dark:text-slate-200 rounded-xl dark:focus-within:ring-emerald-600/20 focus-within:border-transparent focus-within:ring-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed dark:focus-within:border-emerald-500">
                    <select
                      value={pembayaranForm.spt_id}
                      onChange={handleSptChange}
                      required
                      disabled={!!pembayaranEditId}
                      className="w-full  text-sm outline-none "
                    >
                      <option value="" className="dark:bg-slate-900">
                        -- Pilih SPT --
                      </option>
                      {allSpts.map((s) => (
                        <option key={s.id} value={s.id} className="dark:bg-slate-900">
                          {s.nomor_surat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5">
                    Kode/Mata Anggaran
                  </label>
                  <div className="px-3 py-2 border border-slate-200 bg-white focus-within:ring-mauve-500 dark:bg-slate-900/70 dark:border-slate-700/50 dark:text-slate-200 rounded-xl dark:focus-within:ring-emerald-600/20 focus-within:border-transparent focus-within:ring-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed dark:focus-within:border-emerald-500">
                    <select
                      value={pembayaranForm.anggaran_id}
                      onChange={handleAnggaranChange}
                      required
                      disabled={!!pembayaranEditId}
                      className="w-full  text-sm outline-none  "
                    >
                      <option value="" className="dark:bg-slate-900">
                        -- Pilih Anggaran --
                      </option>
                      {allAnggaran.map((a) => (
                        <option key={a.id} value={a.id} className="dark:bg-slate-900">
                          {a.mata_anggaran_kode} - {a.mata_anggaran_nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5">
                  Nama Penerima Pembayaran
                </label>
                <textarea
                  rows={2}
                  value={pembayaranForm.nama_penerima}
                  onChange={(e) =>
                    setPembayaranForm((prev) => ({ ...prev, nama_penerima: e.target.value }))
                  }
                  required
                  placeholder="Nama pelaksana yang menerima pembayaran..."
                  className="w-full px-3 py-2 border focus:ring-mauve-500 border-slate-200 dark:bg-slate-900/70 dark:focus:ring-emerald-600/20 focus:border-transparent focus:ring-2 dark:border-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none  bg-white dark:focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5">
                    Uraian Pembayaran
                  </label>
                  <textarea
                    rows={2}
                    value={pembayaranForm.uraian_pembayaran}
                    onChange={(e) =>
                      setPembayaranForm((prev) => ({ ...prev, uraian_pembayaran: e.target.value }))
                    }
                    required
                    placeholder="Uraian kuitansi..."
                    className="w-full px-3 py-2 border border-slate-200 focus:ring-mauve-500 dark:bg-slate-900/70 dark:focus:ring-emerald-600/20 dark:focus:ring-emerald-600/20 focus:border-transparent focus:ring-2 dark:border-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white dark:focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold dark:text-slate-400 text-slate-500 mb-1.5">
                    Pejabat Pembuat Teknis Kegiatan (PPTK)
                  </label>
                  <div className="px-3 py-2 border border-slate-200 focus-within:ring-mauve-500 bg-white dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-200 rounded-xl dark:focus-within:ring-emerald-600/20 focus-within:border-transparent focus-within:ring-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed dark:focus-within:border-emerald-500">
                    <select
                      value={pembayaranForm.pptk_id}
                      onChange={(e) =>
                        setPembayaranForm((prev) => ({ ...prev, pptk_id: e.target.value }))
                      }
                      required
                      disabled={!!pembayaranEditId}
                      className="w-full  text-sm outline-none "
                    >
                      <option value="" className="dark:bg-slate-900">
                        -- Pilih PPTK --
                      </option>
                      {allPptk.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-900">
                          {p.nama_lengkap} (NIP: {p.nip || '-'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rincian table */}
              {loadingRincian ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Memuat Rincian Laporan...
                  </span>
                </div>
              ) : (
                rincianPengeluaran.penerima.length > 0 && (
                  <div className="space-y-4">
                    {/* Uang harian analysis */}
                    <div className="p-4 border border-blue-100 dark:border-slate-700 bg-blue-50/20 dark:bg-slate-700/50 rounded-2xl space-y-1.5 text-xs text-blue-800">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Info size={14} className="text-blue-500 dark:text-yellow-400" />
                        <span className="dark:text-yellow-400">
                          Analisis & Penerapan Uang Harian:
                        </span>
                      </div>
                      {rincianPengeluaran.penerima.map((p) => {
                        const harian = p.uang_harian || {};
                        const hasRepresentasi =
                          p.biaya_representasi && p.biaya_representasi.harga > 0;
                        return (
                          <div key={p.id} className="space-y-0.5 dark:text-yellow-400">
                            <div>
                              •{' '}
                              <span className="font-semibold dark:text-yellow-400">
                                {p.nama_lengkap}
                              </span>
                              : Uang Harian ({harian.golongan || 'N/A'}) ={' '}
                              {formatCurrency(harian.harga_satuan || 0)} / {harian.satuan || 'OH'}.
                            </div>
                            {hasRepresentasi && (
                              <div className="pl-3 text-emerald-700 dark:text-yellow-500">
                                ↳ Ditambahkan Biaya Representasi (Eselon II) ={' '}
                                {formatCurrency(p.biaya_representasi.harga)} /{' '}
                                {p.biaya_representasi.satuan || 'OH'}.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Table */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Rincian Pengeluaran Realisasi
                      </label>
                      <div className="overflow-x-auto rounded-2xl rounded-b-none">
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="">
                            <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double text-xs uppercase font-bold tracking-wider">
                              <th className="py-2.5 px-3 text-center w-10 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                                No
                              </th>
                              <th className="py-2.5 px-3 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] min-w-[150px]">
                                Nama
                              </th>
                              <th className="py-2.5 px-3 text-left shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] min-w-[180px]">
                                Uraian Pengeluaran
                              </th>
                              <th className="py-2.5 px-3 text-right shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] whitespace-nowrap">
                                Tarif Satuan
                              </th>
                              <th className="py-2.5 px-3 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                                Satuan
                              </th>
                              <th className="py-2.5 px-3 text-center w-10 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b]">
                                Qty
                              </th>
                              <th className="py-2.5 px-3 text-right shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] whitespace-nowrap">
                                Jumlah Biaya
                              </th>
                              <th className="py-2.5 px-3 text-center w-32 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] min-w-[120px]">
                                Panjar (Uang Muka)
                              </th>
                              <th className="py-2.5 px-3 text-right shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] whitespace-nowrap">
                                Total Dibayar
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-slate-600">
                            {rincianPengeluaran.penerima.map((pInfo, pIdx) => {
                              const exp =
                                rincianPengeluaran.pengeluaran.find(
                                  (p) => p.pegawai_id === pInfo.id
                                ) || {};

                              const harianRate = pInfo.uang_harian?.harga_satuan || 0;
                              const qtyDays =
                                rincianPengeluaran.lama_perjalanan ||
                                (exp.akomodasi_malam || 0) + 1;
                              const harianTotal = harianRate * qtyDays;

                              const rows = [];

                              // 1. Uang harian
                              rows.push({
                                type: 'uang_harian',
                                uraian: `Uang Harian (${pInfo.uang_harian?.golongan || 'N/A'})`,
                                harga: harianRate,
                                satuan: pInfo.uang_harian?.satuan || 'OH',
                                hari: qtyDays,
                                total: harianTotal,
                              });

                              // 2. Biaya Representasi (jika Kadis)
                              const isKadis =
                                pInfo.jabatan &&
                                pInfo.jabatan.toLowerCase().includes('kepala dinas');
                              if (
                                isKadis &&
                                pInfo.biaya_representasi &&
                                pInfo.biaya_representasi.harga > 0
                              ) {
                                rows.push({
                                  ...pInfo.biaya_representasi,
                                  type: 'representasi',
                                  harga: parseCurrency(pInfo.biaya_representasi.harga),
                                  hari: qtyDays,
                                  total: parseCurrency(pInfo.biaya_representasi.harga) * qtyDays,
                                });
                              }

                              // Menampilkan biaya transportasi secara total saja
                              if (exp.transportasi_nominal > 0) {
                                rows.push({
                                  type: 'transportasi',
                                  uraian: `Biaya Transportasi (Total)`,
                                  harga: parseCurrency(exp.transportasi_nominal),
                                  satuan: 'PP',
                                  hari: '-',
                                  total: parseCurrency(exp.transportasi_nominal),
                                });
                              }

                              // 4. Biaya Akomodasi
                              if (exp.akomodasi_nominal > 0) {
                                rows.push({
                                  type: 'akomodasi',
                                  uraian: `Biaya Akomodasi (${exp.akomodasi_jenis || 'N/A'})`,
                                  harga: parseCurrency(exp.akomodasi_harga_satuan),
                                  satuan: 'Malam',
                                  hari: exp.akomodasi_malam,
                                  total: parseCurrency(exp.akomodasi_nominal),
                                });
                              }

                              // 5. Biaya Kontribusi
                              if (exp.kontribusi_nominal > 0) {
                                rows.push({
                                  type: 'kontribusi',
                                  uraian: `Biaya Kontribusi (${exp.kontribusi_jenis || 'N/A'})`,
                                  harga: parseCurrency(exp.kontribusi_nominal),
                                  satuan: 'OK',
                                  hari: '-',
                                  total: parseCurrency(exp.kontribusi_nominal),
                                });
                              }

                              // 6. Biaya Lain-lain
                              if (exp.lain_lain_nominal > 0) {
                                rows.push({
                                  type: 'lain_lain',
                                  uraian: `Biaya Lain-lain (${exp.lain_lain_uraian || 'N/A'})`,
                                  harga: parseCurrency(exp.lain_lain_nominal),
                                  satuan: 'OK',
                                  hari: '-',
                                  total: parseCurrency(exp.lain_lain_nominal),
                                });
                              }

                              const { totalBiaya, panjar, totalBayar } = calculateEmployeeTotal(
                                pInfo.id.toString()
                              );

                              return (
                                <React.Fragment key={pInfo.id}>
                                  {rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className="hover:bg-slate-50/30 text-sm dark:hover:bg-slate-700/20"
                                    >
                                      {rIdx === 0 && (
                                        <>
                                          <td
                                            className="py-3 px-3 text-center align-top border-x border-slate-800 dark:border-slate-600/60 text-slate-800 dark:text-slate-200 font-medium"
                                            rowSpan={rows.length + 2}
                                          >
                                            {pIdx + 1}.
                                          </td>
                                          <td
                                            className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 border-r dark:border-r-slate-600/60 align-top border-r"
                                            rowSpan={rows.length + 2}
                                          >
                                            {pInfo.nama_lengkap}
                                          </td>
                                        </>
                                      )}
                                      <td className="py-2.5 px-3 text-slate-800 dark:border-b-slate-600/60 dark:border-b border-b border-b-slate-300/60 dark:text-slate-200">
                                        {row.uraian}
                                      </td>
                                      <td className="py-2.5 px-3 text-right text-slate-800 whitespace-nowrap dark:border-b-slate-600/60 dark:border-b border-b border-b-slate-300/60 dark:text-slate-200">
                                        {formatCurrency(row.harga)}
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-slate-800 font-medium dark:border-b-slate-600/60 dark:border-b border-b border-b-slate-300/60 dark:text-slate-200">
                                        {row.satuan}
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-slate-800 font-medium dark:border-b-slate-600/60 dark:border-b border-b border-b-slate-300/60 dark:text-slate-200">
                                        {row.hari}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap dark:border-b border-b border-b-slate-300/60 dark:border-slate-600/60 dark:text-slate-200">
                                        {formatCurrency(row.total)}
                                      </td>
                                      {rIdx === 0 && (
                                        <td
                                          className="py-3 px-3 text-center align-middle border-x dark:border-slate-600/60 w-32 min-w-[120px]"
                                          rowSpan={rows.length}
                                        >
                                          <input
                                            type="text"
                                            placeholder="Rp 0"
                                            value={panjarValues[pInfo.id.toString()] || ''}
                                            onChange={(e) =>
                                              setPanjarValues((prev) => ({
                                                ...prev,
                                                [pInfo.id.toString()]: formatInputCurrency(
                                                  e.target.value
                                                ),
                                              }))
                                            }
                                            className="w-24 text-center px-1.5 py-1 text-xs text-slate-800 dark:text-slate-200 border border-mauve-500 dark:border-slate-500 rounded-lg focus:outline-none focus:border-emerald-500 font-bold dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                                          />
                                        </td>
                                      )}
                                      <td className="py-3 px-3 text-right align-middle border-x border-b border-b border-b-slate-300/60 dark:border-slate-600/60 w-36 min-w-[140px]">
                                        <input
                                          type="text"
                                          placeholder="Rp 0"
                                          value={
                                            dibayarOverrides[`${pInfo.id}_${row.type}`] !==
                                            undefined
                                              ? dibayarOverrides[`${pInfo.id}_${row.type}`]
                                              : ''
                                          }
                                          onChange={(e) => {
                                            const formatted = formatInputCurrency(e.target.value);
                                            setDibayarOverrides((prev) => ({
                                              ...prev,
                                              [`${pInfo.id}_${row.type}`]: formatted,
                                            }));
                                          }}
                                          className="w-28 text-right px-1.5 py-1 text-xs border border-mauve-500 dark:border-slate-500 dark:text-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-bold text-slate-800 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Total Panjar row per employee */}
                                  <tr className="bg-slate-50/50 dark:bg-slate-900 dark:hover:bg-slate-900/70 text-sm border-t dark:border-slate-600/60 border-slate-200">
                                    <td
                                      colSpan={5}
                                      className="py-2 px-3 text-right font-bold text-slate-600 dark:text-slate-400 border-t border-slate-200"
                                    >
                                      Total Panjar Pegawai:
                                    </td>
                                    <td
                                      className="py-2 px-3 text-right font-bold text-rose-600 border-slate-200 border-r dark:border-slate-600/60 border-r-mauve-900/90 border-t  whitespace-nowrap"
                                      colSpan={2}
                                    >
                                      ({formatCurrency(panjar)})
                                    </td>
                                  </tr>
                                  {/* Total Dibayar row per employee */}
                                  <tr className="bg-emerald-50/30 dark:bg-slate-900 dark:hover:bg-slate-900/70 text-sm border-b dark:border-slate-600/60 border-slate-200 border-b-slate-800">
                                    <td
                                      colSpan={5}
                                      className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200"
                                    >
                                      Jumlah Dibayarkan ke Pegawai:
                                    </td>
                                    <td
                                      className="py-2 px-3 text-right font-bold text-emerald-700  border-r dark:border-slate-600/60 whitespace-nowrap dark:text-slate-200"
                                      colSpan={2}
                                    >
                                      {formatCurrency(totalBayar)}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50 dark:bg-slate-900 text-slate-800 font-bold text-sm">
                            <tr>
                              <td
                                colSpan={8}
                                className="py-3.5 px-4 text-right text-sm dark:text-slate-200"
                              >
                                TOTAL KESELURUHAN DIBAYAR KUITANSI:
                              </td>
                              <td className="py-3.5 px-4 text-right text-indigo-700 text-sm font-extrabold whitespace-nowrap dark:text-slate-200">
                                {formatCurrency(getGrandTotal())}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Modal Actions */}
              <div className="flex items-center sticky bottom-0 justify-end gap-3 pt-5 border-t dark:border-none border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setPembayaranModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-100/10 bg-white hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-md shadow-emerald-600/10 transition-all"
                >
                  Simpan Bukti Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: PENGELUARAN RIIL FORM --- */}
      {riilModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRiilModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-3xl dark:bg-slate-800 dark:border-slate-700 border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-800 dark:to-teal-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {riilEditId ? 'Edit Pengeluaran Riil' : 'Tambah Pengeluaran Riil'}
                </h3>
                <p className="text-xs text-teal-100 mt-0.5">
                  Kelola data bukti pengeluaran riil pegawai yang bertugas.
                </p>
              </div>
              <button
                onClick={() => setRiilModalOpen(false)}
                className="text-teal-100 hover:text-white p-1 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleRiilSubmit} className="flex-1  overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Nomor SPT
                </label>
                <div className="px-3 py-2 border border-slate-200 bg-white focus-within:ring-mauve-500 focus-within:ring-2 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-200 rounded-xl dark:focus-within:ring-emerald-600/20 focus-within:border-transparent focus-within:ring-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed dark:focus-within:border-emerald-500">
                  <select
                    value={riilForm.spt_id}
                    onChange={handleRiilSptChange}
                    required
                    disabled={!!riilEditId}
                    className="w-full  text-sm outline-none"
                  >
                    <option value="" className="dark:bg-slate-900">
                      -- Pilih SPT --
                    </option>
                    {riilSptList.map((s) => (
                      <option key={s.id} value={s.id} className="dark:bg-slate-900">
                        {s.nomor_surat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Nama Pelaksana
                </label>
                <div className="px-3 py-2 border border-slate-200 bg-white dark:bg-slate-900/70 focus-within:ring-mauve-500 focus-within:ring-2 dark:border-slate-800 dark:text-slate-200 rounded-xl dark:focus-within:ring-emerald-600/20 focus-within:border-transparent focus-within:ring-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed dark:focus-within:border-emerald-500">
                  <select
                    value={riilForm.pegawai_id}
                    onChange={(e) =>
                      setRiilForm((prev) => ({ ...prev, pegawai_id: e.target.value }))
                    }
                    required
                    disabled={!riilForm.spt_id || loadingRiilPelaksana || !!riilEditId}
                    className="w-full  text-sm outline-none "
                  >
                    {loadingRiilPelaksana ? (
                      <option>Memuat Pelaksana...</option>
                    ) : riilPelaksanaList.length === 0 ? (
                      <option value="" className="dark:bg-slate-900">
                        {riilForm.spt_id
                          ? '-- Semua pelaksana sudah memiliki bukti bayar --'
                          : '-- Pilih SPT terlebih dahulu --'}
                      </option>
                    ) : (
                      <>
                        <option value="" className="dark:bg-slate-900">
                          -- Pilih Pelaksana --
                        </option>
                        {riilPelaksanaList.map((p) => (
                          <option
                            key={p.pegawai_id}
                            value={p.pegawai_id}
                            className="dark:bg-slate-900"
                          >
                            {p.nama_lengkap}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Uraian Pengeluaran
                </label>
                <textarea
                  rows={3}
                  value={riilForm.uraian}
                  onChange={(e) => setRiilForm((prev) => ({ ...prev, uraian: e.target.value }))}
                  required
                  placeholder="Contoh: Biaya taksi bandara ke hotel pergi-pulang"
                  className="w-full px-3 py-2 border border-slate-200 dark:bg-slate-900/70 dark:border-slate-700/50 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-mauve-500 dark:focus:ring-emerald-600/20 focus:border-transparent focus:ring-2  bg-white dark:focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Jumlah Pengeluaran
                </label>
                <input
                  type="text"
                  placeholder="Nominal (Rp)"
                  value={riilForm.jumlah}
                  onChange={(e) =>
                    setRiilForm((prev) => ({
                      ...prev,
                      jumlah: formatInputCurrency(e.target.value),
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:bg-slate-900/70 dark:border-slate-700/50 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-mauve-500 dark:focus:ring-emerald-600/20  focus:border-transparent focus:ring-2 text-right font-medium text-slate-800 bg-white dark:focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-none mt-4">
                <button
                  type="button"
                  onClick={() => setRiilModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-100/10 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/10 transition-all"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pembayaran;
