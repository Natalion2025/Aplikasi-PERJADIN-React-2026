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
  FileCheck,
  Ban,
  ArrowLeft,
  Save,
  Upload,
  Info,
  MapPin,
  CheckCircle2,
  Trash,
} from 'lucide-react';

const BuatLaporan = () => {
  // View states: 'list' or 'form'
  const [view, setView] = useState('list');
  const [activeTab, setActiveTab] = useState('laporan'); // 'laporan' or 'pembatalan'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // List States
  const [laporanList, setLaporanList] = useState([]);
  const [canceledList, setCanceledList] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  // Modal Pembatalan States
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSptList, setCancelSptList] = useState([]);
  const [cancelPegawaiList, setCancelPegawaiList] = useState([]);
  const [loadingCancelPegawai, setLoadingCancelPegawai] = useState(false);
  const [cancelEditId, setCancelEditId] = useState(null);
  const [cancelNotif, setCancelNotif] = useState('');
  const [cancelForm, setCancelForm] = useState({
    spt_id: '',
    pegawai_id: '',
    tempat_pembatalan: 'Nanga Pinoh',
    tanggal_pembatalan: new Date().toISOString().split('T')[0],
    alasan: '',
    rincian_biaya: '',
    nominal_biaya: '',
    ambilPanjar: false,
  });

  // Form View States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLaporanId, setEditingLaporanId] = useState(null);
  const [sptOptions, setSptOptions] = useState([]);
  const [selectedSpt, setSelectedSpt] = useState(null);
  const [loadingSptDetails, setLoadingSptDetails] = useState(false);
  const [accommodationStandards, setAccommodationStandards] = useState({});
  const [form, setForm] = useState({
    spt_id: '',
    tanggal_laporan: new Date().toISOString().split('T')[0],
    tempat_laporan: 'Nanga Pinoh',
    judul: '',
    dasar_perjalanan: '',
    tujuan_perjalanan: '',
    lama_dan_tanggal_perjalanan: '',
    tempat_dikunjungi: '',
    deskripsi_kronologis: '',
    hasil_dicapai: '',
    kesimpulan: '',
    kode_anggaran_display: '',
  });

  const [pegawaiList, setPegawaiList] = useState([]); // All employees in selected SPT
  const [selectedSigners, setSelectedSigners] = useState([]); // IDs of checked signers
  const [pegawaiData, setPegawaiData] = useState({}); // Expense data per employee ID

  // Upload States
  const [newFiles, setNewFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // --- Helper Functions ---
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    let number;
    if (typeof value === 'number') {
      number = value;
    } else {
      const str = String(value).trim();
      const cleaned = str.replace(/\./g, '').replace(/[^0-9,-]/g, '').replace(',', '.');
      number = parseFloat(cleaned);
    }
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const parseCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;

    let str = String(value).trim();

    // If it contains a comma, it's Indonesian format (e.g., 1.500,00)
    if (str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
      return parseFloat(str) || 0;
    }

    // If it has multiple dots, they are thousands separators
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      str = str.replace(/\./g, '');
      return parseFloat(str) || 0;
    }

    // If it has a single dot, check if it is followed by exactly 3 digits
    if (dotCount === 1) {
      const parts = str.split('.');
      if (parts[1] && parts[1].length === 3) {
        // Thousands separator
        str = str.replace(/\./g, '');
      }
    }

    // Clean any remaining non-numeric characters except minus and dot
    const cleaned = str.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
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
    if (view === 'list') {
      if (activeTab === 'laporan') {
        fetchLaporan();
      } else {
        fetchCanceledTasks();
      }
    }
  }, [view, activeTab, page, limit, search]);

  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/laporan', {
        params: { page, limit, q: search },
      });
      if (res.data) {
        setLaporanList(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data laporan:', err);
      showNotification('Gagal memuat daftar laporan perjalanan dinas.', false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCanceledTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/spt/canceled', {
        params: { page, limit },
      });
      if (res.data) {
        setCanceledList(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data pembatalan:', err);
      showNotification('Gagal memuat daftar pembatalan tugas.', false);
    } finally {
      setLoading(false);
    }
  };

  // Delete Laporan
  const handleDeleteLaporan = async (id) => {
    if (
      !window.confirm(
        'Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.'
      )
    )
      return;
    try {
      const res = await axios.delete(`/api/laporan/${id}`);
      showNotification(res.data?.message || 'Laporan berhasil dihapus.');
      fetchLaporan();
    } catch (err) {
      console.error('Gagal menghapus laporan:', err);
      const msg = err.response?.data?.message || 'Gagal menghapus laporan.';
      showNotification(msg, false);
    }
  };

  // Delete Pembatalan
  const handleDeleteCanceled = async (item) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus pembatalan untuk SPT "${item.nomor_surat}"? Status SPT akan dikembalikan menjadi aktif.`
      )
    )
      return;
    try {
      const res = await axios.delete(`/api/pembatalan/${item.id}`);
      showNotification(res.data?.message || 'Pembatalan berhasil dihapus.');
      fetchCanceledTasks();
    } catch (err) {
      console.error('Gagal menghapus pembatalan:', err);
      const msg = err.response?.data?.message || 'Gagal menghapus pembatalan.';
      showNotification(msg, false);
    }
  };

  // --- Modal Pembatalan Logic ---
  const openCancelModal = async (id = null) => {
    setCancelEditId(id);
    setCancelNotif('');

    // Load SPTs for dropdown
    try {
      const res = await axios.get('/api/spt?limit=0');
      setCancelSptList(res.data || []);
    } catch (err) {
      console.error('Gagal memuat SPT untuk pembatalan:', err);
    }

    if (id) {
      try {
        const res = await axios.get(`/api/pembatalan/${id}`);
        const data = res.data;
        setCancelForm({
          spt_id: data.spt_id || '',
          pegawai_id: data.pegawai_id || '',
          tempat_pembatalan: data.tempat_pembatalan || 'Nanga Pinoh',
          tanggal_pembatalan: data.tanggal_pembatalan ? data.tanggal_pembatalan.split('T')[0] : '',
          alasan: data.alasan || '',
          rincian_biaya: data.rincian_biaya || '',
          nominal_biaya: formatCurrency(data.nominal_biaya),
          ambilPanjar: false,
        });
        // Populate pegawai list for this SPT
        await loadCancelPegawai(data.spt_id, data.pegawai_id);
      } catch (err) {
        console.error('Gagal memuat detail pembatalan:', err);
      }
    } else {
      setCancelForm({
        spt_id: '',
        pegawai_id: '',
        tempat_pembatalan: 'Nanga Pinoh',
        tanggal_pembatalan: new Date().toISOString().split('T')[0],
        alasan: '',
        rincian_biaya: '',
        nominal_biaya: '',
        ambilPanjar: false,
      });
      setCancelPegawaiList([]);
    }
    setCancelModalOpen(true);
  };

  const loadCancelPegawai = async (sptId, selectedPegawaiId = null) => {
    if (!sptId) {
      setCancelPegawaiList([]);
      return;
    }
    setLoadingCancelPegawai(true);
    setCancelNotif('');
    try {
      const [sptRes, signersRes, canceledRes] = await Promise.all([
        axios.get(`/api/spt/${sptId}`),
        axios.get(`/api/laporan/signers/by-spt/${sptId}`),
        axios.get(`/api/pembatalan/by-spt/${sptId}`),
      ]);

      const sptDetail = sptRes.data || {};
      const signerIds = signersRes.data || [];
      const canceledIds = canceledRes.data || [];

      // Filter out signers who already reported
      const signerSet = new Set(signerIds.map((id) => id.toString()));
      const available = (sptDetail.pegawai || []).filter(
        (p) => !signerSet.has(p.pegawai_id.toString())
      );

      setCancelPegawaiList(available);

      // Cache canceled IDs to show warning if selected
      const isAlreadyCanceled = canceledIds.includes(
        parseInt(selectedPegawaiId || cancelForm.pegawai_id, 10)
      );
      if (isAlreadyCanceled && !cancelEditId) {
        setCancelNotif(
          'Pegawai ini sudah pernah dibuatkan surat pembatalan tugas untuk SPT terkait.'
        );
      }
    } catch (err) {
      console.error('Gagal memuat pegawai untuk pembatalan:', err);
    } finally {
      setLoadingCancelPegawai(false);
    }
  };

  const handleCancelSptChange = (e) => {
    const sptId = e.target.value;
    setCancelForm((prev) => ({
      ...prev,
      spt_id: sptId,
      pegawai_id: '',
      ambilPanjar: false,
      rincian_biaya: '',
      nominal_biaya: '',
    }));
    loadCancelPegawai(sptId);
  };

  const handleCancelPegawaiChange = async (e) => {
    const pegawaiId = e.target.value;
    setCancelForm((prev) => ({
      ...prev,
      pegawai_id: pegawaiId,
      ambilPanjar: false,
      rincian_biaya: '',
      nominal_biaya: '',
    }));
    setCancelNotif('');

    // Check if already canceled in db
    try {
      const canceledRes = await axios.get(`/api/pembatalan/by-spt/${cancelForm.spt_id}`);
      const canceledIds = canceledRes.data || [];
      if (canceledIds.includes(parseInt(pegawaiId, 10)) && !cancelEditId) {
        setCancelNotif(
          'Pegawai ini sudah pernah dibuatkan surat pembatalan tugas untuk SPT terkait.'
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePanjarToggle = async (checked) => {
    setCancelForm((prev) => ({ ...prev, ambilPanjar: checked }));
    if (checked) {
      if (!cancelForm.spt_id || !cancelForm.pegawai_id) {
        alert('Pilih SPT dan Pegawai terlebih dahulu!');
        setCancelForm((prev) => ({ ...prev, ambilPanjar: false }));
        return;
      }
      try {
        const res = await axios.get(
          `/api/panjar/by-spt/${cancelForm.spt_id}/pegawai/${cancelForm.pegawai_id}`
        );
        if (res.data) {
          setCancelForm((prev) => ({
            ...prev,
            rincian_biaya: res.data.uraian || '',
            nominal_biaya: formatCurrency(res.data.total),
          }));
        }
      } catch (err) {
        console.error(err);
        alert(
          'Info: ' + (err.response?.data?.message || 'Uang muka tidak ditemukan untuk pegawai ini.')
        );
        setCancelForm((prev) => ({ ...prev, ambilPanjar: false }));
      }
    } else {
      setCancelForm((prev) => ({ ...prev, rincian_biaya: '', nominal_biaya: '' }));
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (
      !cancelForm.spt_id ||
      !cancelForm.pegawai_id ||
      !cancelForm.tempat_pembatalan ||
      !cancelForm.tanggal_pembatalan
    ) {
      alert('Mohon isi semua data wajib.');
      return;
    }

    const payload = {
      spt_id: cancelForm.spt_id,
      pegawai_id: cancelForm.pegawai_id,
      tempat_pembatalan: cancelForm.tempat_pembatalan,
      tanggal_pembatalan: cancelForm.tanggal_pembatalan,
      alasan: cancelForm.alasan,
      rincian_biaya: cancelForm.rincian_biaya,
      nominal_biaya: parseCurrency(cancelForm.nominal_biaya),
    };

    if (!cancelEditId) {
      const confirmText =
        'Apakah Anda yakin ingin membatalkan SPT ini untuk pegawai pelaksana yang dipilih?';
      if (!window.confirm(confirmText)) return;
    }

    try {
      let res;
      if (cancelEditId) {
        res = await axios.put(`/api/pembatalan/${cancelEditId}`, payload);
      } else {
        res = await axios.post('/api/spt/cancel', payload);
      }
      showNotification(res.data?.message || 'Pembatalan tugas berhasil diproses.');
      setCancelModalOpen(false);
      fetchCanceledTasks();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pembatalan: ' + (err.response?.data?.message || err.message));
    }
  };

  // --- Report Form Logic ---
  const openFormView = async (id = null) => {
    setEditingLaporanId(id);
    setIsEditMode(!!id);
    setSelectedSpt(null);
    setPegawaiList([]);
    setSelectedSigners([]);
    setPegawaiData({});
    setNewFiles([]);
    setExistingFiles([]);
    setDeletedFiles([]);
    setError('');

    // Load available SPTs
    try {
      const res = await axios.get('/api/spt?limit=0');
      // Filter out inactive/reported SPTs for create mode. For edit, we will append the current one manually.
      let spts = res.data || [];
      if (!id) {
        spts = spts.filter((spt) => spt.status === 'aktif' && spt.laporan_count === 0);
      }
      setSptOptions(spts);
    } catch (err) {
      console.error('Gagal memuat opsi SPT:', err);
    }

    if (id) {
      // Edit mode: fetch existing report
      try {
        setLoadingSptDetails(true);
        setView('form');
        const res = await axios.get(`/api/laporan/${id}`);
        const laporan = res.data;

        // Force include the current SPT in options if not there
        setSptOptions((prev) => {
          if (!prev.some((opt) => opt.id === laporan.spt_id)) {
            return [
              ...prev,
              { id: laporan.spt_id, nomor_surat: laporan.nomor_surat || 'SPT Terkait' },
            ];
          }
          return prev;
        });

        setForm({
          spt_id: laporan.spt_id || '',
          tanggal_laporan: laporan.tanggal_laporan ? laporan.tanggal_laporan.split('T')[0] : '',
          tempat_laporan: laporan.tempat_laporan || 'Nanga Pinoh',
          judul: laporan.judul || '',
          dasar_perjalanan: laporan.dasar_perjalanan || '',
          tujuan_perjalanan: laporan.tujuan_perjalanan || '',
          lama_dan_tanggal_perjalanan: laporan.lama_dan_tanggal_perjalanan || '',
          tempat_dikunjungi: laporan.tempat_dikunjungi || '',
          deskripsi_kronologis: laporan.deskripsi_kronologis || '',
          hasil_dicapai: laporan.hasil_dicapai || '',
          kesimpulan: laporan.kesimpulan || '',
          kode_anggaran_display: '',
        });

        // Set files
        if (laporan.lampiran) {
          setExistingFiles(laporan.lampiran);
        }

        // Fetch detail SPT to populate layout and standards
        const sptRes = await axios.get(`/api/spt/${laporan.spt_id}`);
        const sptDetail = sptRes.data;
        setSelectedSpt(sptDetail);

        // Fetch Budget display name
        if (sptDetail.anggaran_id) {
          try {
            const anggRes = await axios.get(`/api/anggaran/${sptDetail.anggaran_id}`);
            setForm((prev) => ({
              ...prev,
              kode_anggaran_display: `${anggRes.data.mata_anggaran_kode} - ${anggRes.data.mata_anggaran_nama}`,
            }));
          } catch (e) {
            console.error(e);
          }
        }

        // Fetch accommodation standards
        try {
          const standardsRes = await axios.get(
            `/api/spt/${laporan.spt_id}/accommodation-standards`
          );
          setAccommodationStandards(standardsRes.data || {});
        } catch (e) {
          console.error(e);
        }

        // Map pegawai assignments from SPT
        const allPelaksana = (sptDetail.pegawai || []).sort(
          (a, b) => a.is_pengikut - b.is_pengikut
        );
        setPegawaiList(allPelaksana);

        // Restore signers list
        let signers = [];
        if (laporan.penandatangan_ids) {
          try {
            signers = JSON.parse(laporan.penandatangan_ids);
          } catch (e) {
            console.error('Failed to parse penandatangan_ids:', e);
          }
        }
        setSelectedSigners(signers.map((s) => s.toString()));

        // Restore expense data
        const initialPegawaiData = {};
        allPelaksana.forEach((p) => {
          const pegId = p.pegawai_id.toString();

          const tList = (laporan.transportasi || [])
            .filter((t) => t.pegawai_id == p.pegawai_id)
            .map((t, index) => ({
              id: t.id || index,
              jenis: t.jenis || 'Bus',
              perusahaan: t.perusahaan || '',
              kode_boking: t.kode_boking || '',
              nomor_penerbangan: t.nomor_penerbangan || '',
              nomor_tiket: t.nomor_tiket || '',
              tanggal_tiket: t.tanggal_tiket ? t.tanggal_tiket.split('T')[0] : '',
              terminal_berangkat: t.terminal_berangkat || '',
              terminal_tiba: t.terminal_tiba || '',
              nominal: formatCurrency(t.nominal),
              arah_perjalanan: t.arah_perjalanan || 'berangkat',
            }));

          const aList = (laporan.akomodasi || [])
            .filter((a) => a.pegawai_id == p.pegawai_id)
            .map((a, index) => ({
              id: a.id || index,
              jenis: a.jenis || 'Hotel',
              nama: a.nama || '',
              lokasi_hotel: a.lokasi_hotel || '',
              tanggal_checkIn: a.tanggal_checkIn ? a.tanggal_checkIn.split('T')[0] : '',
              tanggal_checkOut: a.tanggal_checkOut ? a.tanggal_checkOut.split('T')[0] : '',
              harga_satuan: formatCurrency(a.harga_satuan),
              malam: a.malam || '',
              nominal: formatCurrency(a.nominal),
              readOnlyHarga: a.jenis === 'Rumah Warga (30%)',
            }));

          const kList = (laporan.kontribusi || [])
            .filter((k) => k.pegawai_id == p.pegawai_id)
            .map((k, index) => ({
              id: k.id || index,
              jenis: k.jenis || 'Bimbingan Teknis',
              nominal: formatCurrency(k.nominal),
            }));

          const lList = (laporan.lain_lain || [])
            .filter((l) => l.pegawai_id == p.pegawai_id)
            .map((l, index) => {
              let uName = l.uraian || '';
              try {
                const parsed = JSON.parse(uName);
                if (parsed && typeof parsed === 'object' && parsed.uraian) {
                  uName = parsed.uraian;
                }
              } catch (e) {}

              return {
                id: l.id || index,
                uraian: uName,
                tarif_satuan: formatCurrency(l.tarif_satuan),
                jumlah_hari: l.jumlah_hari || '',
                nominal: formatCurrency(l.nominal),
                keterangan: l.keterangan || '',
              };
            });

          initialPegawaiData[pegId] = {
            transportasi:
              tList.length > 0
                ? tList
                : [
                    {
                      jenis: 'Bus',
                      perusahaan: '',
                      kode_boking: '',
                      nomor_penerbangan: '',
                      nomor_tiket: '',
                      tanggal_tiket: '',
                      terminal_berangkat: '',
                      terminal_tiba: '',
                      nominal: '',
                      arah_perjalanan: 'berangkat',
                    },
                  ],
            akomodasi:
              aList.length > 0
                ? aList
                : [
                    {
                      jenis: 'Hotel',
                      nama: '',
                      lokasi_hotel: '',
                      tanggal_checkIn: '',
                      tanggal_checkOut: '',
                      harga_satuan: '',
                      malam: '',
                      nominal: '',
                      readOnlyHarga: false,
                    },
                  ],
            kontribusi: kList.length > 0 ? kList : [{ jenis: 'Bimbingan Teknis', nominal: '' }],
            lain_lain:
              lList.length > 0
                ? lList
                : [{ uraian: '', tarif_satuan: '', jumlah_hari: '', nominal: '', keterangan: '' }],
          };
        });

        setPegawaiData(initialPegawaiData);
      } catch (err) {
        console.error(err);
        showNotification('Gagal memuat data laporan untuk edit.', false);
        setView('list');
      } finally {
        setLoadingSptDetails(false);
      }
    } else {
      // Create mode
      setView('form');
    }
  };

  const handleSptChange = async (e) => {
    const sptId = e.target.value;
    if (!sptId) {
      setSelectedSpt(null);
      setPegawaiList([]);
      setSelectedSigners([]);
      setPegawaiData({});
      setForm((prev) => ({
        ...prev,
        spt_id: '',
        dasar_perjalanan: '',
        tujuan_perjalanan: '',
        lama_dan_tanggal_perjalanan: '',
        tempat_dikunjungi: '',
        kode_anggaran_display: '',
      }));
      return;
    }

    setLoadingSptDetails(true);
    try {
      const res = await axios.get(`/api/spt/${sptId}`);
      const sptDetail = res.data;
      setSelectedSpt(sptDetail);

      // Fetch Budget
      if (sptDetail.anggaran_id) {
        try {
          const anggRes = await axios.get(`/api/anggaran/${sptDetail.anggaran_id}`);
          setForm((prev) => ({
            ...prev,
            kode_anggaran_display: `${anggRes.data.mata_anggaran_kode} - ${anggRes.data.mata_anggaran_nama}`,
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // Fetch accommodation standards
      try {
        const standardsRes = await axios.get(`/api/spt/${sptId}/accommodation-standards`);
        setAccommodationStandards(standardsRes.data || {});
      } catch (e) {
        console.error(e);
      }

      // Set display fields
      const formatDateLong = (dStr) => {
        if (!dStr) return '';
        return new Date(dStr).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      };

      setForm((prev) => ({
        ...prev,
        spt_id: sptId,
        dasar_perjalanan: sptDetail.dasar_surat || '',
        tujuan_perjalanan: sptDetail.maksud_perjalanan || '',
        tempat_dikunjungi: sptDetail.lokasi_tujuan || '',
        lama_dan_tanggal_perjalanan: `${sptDetail.lama_perjalanan} hari, dari ${formatDateLong(sptDetail.tanggal_berangkat)} s/d ${formatDateLong(sptDetail.tanggal_kembali)}`,
      }));

      // Sort employee list: pelaksana first, then pengikut
      const allPelaksana = (sptDetail.pegawai || []).sort((a, b) => a.is_pengikut - b.is_pengikut);
      setPegawaiList(allPelaksana);

      // Default checked signers: non-pengikut (is_pengikut === 0) who are not canceled
      const canceledIds = new Set(
        (sptDetail.pegawai_dibatalkan || []).map((p) => p.pegawai_id.toString())
      );
      const defaultChecked = allPelaksana
        .filter((p) => p.is_pengikut === 0 && !canceledIds.has(p.pegawai_id.toString()))
        .map((p) => p.pegawai_id.toString());
      setSelectedSigners(defaultChecked);

      // Initialize expense structures with single empty rows
      const initData = {};
      allPelaksana.forEach((p) => {
        const pId = p.pegawai_id.toString();
        initData[pId] = {
          transportasi: [
            {
              jenis: 'Bus',
              perusahaan: '',
              kode_boking: '',
              nomor_penerbangan: '',
              nomor_tiket: '',
              tanggal_tiket: '',
              terminal_berangkat: '',
              terminal_tiba: '',
              nominal: '',
              arah_perjalanan: 'berangkat',
            },
          ],
          akomodasi: [
            {
              jenis: 'Hotel',
              nama: '',
              lokasi_hotel: '',
              tanggal_checkIn: '',
              tanggal_checkOut: '',
              harga_satuan: '',
              malam: '',
              nominal: '',
              readOnlyHarga: false,
            },
          ],
          kontribusi: [{ jenis: 'Bimbingan Teknis', nominal: '' }],
          lain_lain: [
            { uraian: '', tarif_satuan: '', jumlah_hari: '', nominal: '', keterangan: '' },
          ],
        };
      });
      setPegawaiData(initData);
    } catch (err) {
      console.error(err);
      showNotification('Gagal mengambil rincian SPT.', false);
    } finally {
      setLoadingSptDetails(false);
    }
  };

  const handleSignerCheckboxChange = (pegawaiId, checked) => {
    setSelectedSigners((prev) => {
      if (checked) {
        return [...prev, pegawaiId];
      } else {
        return prev.filter((id) => id !== pegawaiId);
      }
    });
  };

  // --- Dynamic Form Add/Remove Row Operations ---
  const addExpenseRow = (pegawaiId, category) => {
    setPegawaiData((prev) => {
      const currentObj = prev[pegawaiId];
      let newRow = {};
      if (category === 'transportasi') {
        newRow = {
          jenis: 'Bus',
          perusahaan: '',
          kode_boking: '',
          nomor_penerbangan: '',
          nomor_tiket: '',
          tanggal_tiket: '',
          terminal_berangkat: '',
          terminal_tiba: '',
          nominal: '',
          arah_perjalanan: 'berangkat',
        };
      } else if (category === 'akomodasi') {
        newRow = {
          jenis: 'Hotel',
          nama: '',
          lokasi_hotel: '',
          tanggal_checkIn: '',
          tanggal_checkOut: '',
          harga_satuan: '',
          malam: '',
          nominal: '',
          readOnlyHarga: false,
        };
      } else if (category === 'kontribusi') {
        newRow = { jenis: 'Bimbingan Teknis', nominal: '' };
      } else if (category === 'lain_lain') {
        newRow = { uraian: '', tarif_satuan: '', jumlah_hari: '', nominal: '', keterangan: '' };
      }
      return {
        ...prev,
        [pegawaiId]: {
          ...currentObj,
          [category]: [...currentObj[category], newRow],
        },
      };
    });
  };

  const removeExpenseRow = (pegawaiId, category, index) => {
    setPegawaiData((prev) => {
      const currentObj = prev[pegawaiId];
      const list = [...currentObj[category]];
      if (list.length <= 1) return prev; // Do not empty
      list.splice(index, 1);
      return {
        ...prev,
        [pegawaiId]: {
          ...currentObj,
          [category]: list,
        },
      };
    });
  };

  const handleExpenseInputChange = (pegawaiId, category, index, field, value) => {
    setPegawaiData((prev) => {
      const currentObj = prev[pegawaiId];
      const list = [...currentObj[category]];
      const item = { ...list[index], [field]: value };

      // Automatic calculations and standard cost updates
      if (category === 'akomodasi') {
        if (field === 'jenis') {
          if (value === 'Rumah Warga (30%)') {
            const standard = accommodationStandards[pegawaiId] || 0;
            const calculatedCost = standard * 0.3;
            item.harga_satuan = formatCurrency(calculatedCost);
            item.readOnlyHarga = true;
          } else {
            item.harga_satuan = '';
            item.readOnlyHarga = false;
          }
        }

        // Recalc total accommodation row
        const price = parseCurrency(item.harga_satuan);
        const qty = parseInt(item.malam) || 0;
        item.nominal = formatCurrency(price * qty);
      }

      if (category === 'lain_lain') {
        // Recalc total lain-lain
        const price = parseCurrency(item.tarif_satuan);
        const qty = parseInt(item.jumlah_hari) || 0;
        item.nominal = formatCurrency(price * qty);
      }

      list[index] = item;
      return {
        ...prev,
        [pegawaiId]: {
          ...currentObj,
          [category]: list,
        },
      };
    });
  };

  // --- Files Drag & Drop ---
  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeExistingFile = (fileId) => {
    setDeletedFiles((prev) => [...prev, fileId]);
    setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // --- Form Submission ---
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (selectedSigners.length === 0) {
      alert('Pilih minimal satu penandatangan laporan.');
      return;
    }

    // Validation: make sure there is at least one positive expense value per signer
    let missingSigners = [];
    selectedSigners.forEach((id) => {
      const data = pegawaiData[id];
      if (data) {
        const hasTransport = data.transportasi.some((t) => parseCurrency(t.nominal) > 0);
        const hasAkomodasi = data.akomodasi.some((a) => parseCurrency(a.nominal) > 0);
        const hasKontribusi = data.kontribusi.some((k) => parseCurrency(k.nominal) > 0);
        const hasLainLain = data.lain_lain.some((l) => parseCurrency(l.nominal) > 0);

        if (!hasTransport && !hasAkomodasi && !hasKontribusi && !hasLainLain) {
          const emp = pegawaiList.find((p) => p.pegawai_id.toString() === id);
          missingSigners.push(emp ? emp.nama_lengkap : `ID ${id}`);
        }
      }
    });

    if (missingSigners.length > 0) {
      alert(
        `Validasi Gagal:\n\nHarap isi minimal satu rincian pengeluaran dengan nominal > 0 untuk penandatangan berikut:\n- ${missingSigners.join('\n- ')}`
      );
      return;
    }

    setSubmitting(true);
    try {
      // If edit mode, double check if already paid
      if (isEditMode) {
        try {
          const paidCheck = await axios.get(`/api/pembayaran/check/by-spt/${form.spt_id}`);
          if (paidCheck.data && paidCheck.data.exists) {
            alert(
              'Aksi Diblokir: Laporan ini tidak dapat diubah karena sudah memiliki bukti bayar terkait. Hapus terlebih dahulu bukti bayar jika ingin mengedit laporan.'
            );
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.warn('Pengecekan bukti bayar gagal, lanjut...', err);
        }
      }

      const formData = new FormData();
      formData.append('spt_id', form.spt_id);
      formData.append('tanggal_laporan', form.tanggal_laporan);
      formData.append('tempat_laporan', form.tempat_laporan);
      formData.append('judul', form.judul);
      formData.append('dasar_perjalanan', form.dasar_perjalanan);
      formData.append('tujuan_perjalanan', form.tujuan_perjalanan);
      formData.append('lama_dan_tanggal_perjalanan', form.lama_dan_tanggal_perjalanan);
      formData.append('tempat_dikunjungi', form.tempat_dikunjungi);
      formData.append('deskripsi_kronologis', form.deskripsi_kronologis);
      formData.append('hasil_dicapai', form.hasil_dicapai);
      formData.append('kesimpulan', form.kesimpulan);
      formData.append('penandatangan_ids', JSON.stringify(selectedSigners));

      if (isEditMode) {
        formData.append('deleted_files', JSON.stringify(deletedFiles));
      }

      // Append files
      newFiles.forEach((file) => {
        formData.append('lampiran', file);
      });

      // Append nested expense details
      Object.keys(pegawaiData).forEach((pegawaiId) => {
        const p = pegawaiData[pegawaiId];

        // Append Transportasi
        p.transportasi.forEach((item, index) => {
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][jenis]`,
            item.jenis || 'Bus'
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][perusahaan]`,
            item.perusahaan || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][kode_boking]`,
            item.kode_boking || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][nomor_penerbangan]`,
            item.nomor_penerbangan || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][nomor_tiket]`,
            item.nomor_tiket || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][tanggal_tiket]`,
            item.tanggal_tiket || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][terminal_berangkat]`,
            item.terminal_berangkat || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][terminal_tiba]`,
            item.terminal_tiba || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][nominal]`,
            parseCurrency(item.nominal)
          );
          formData.append(
            `pegawai[${pegawaiId}][transportasi][${index}][arah_perjalanan]`,
            item.arah_perjalanan || 'berangkat'
          );
        });

        // Append Akomodasi
        p.akomodasi.forEach((item, index) => {
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][jenis]`,
            item.jenis || 'Hotel'
          );
          formData.append(`pegawai[${pegawaiId}][akomodasi][${index}][nama]`, item.nama || '');
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][lokasi_hotel]`,
            item.lokasi_hotel || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][tanggal_checkIn]`,
            item.tanggal_checkIn || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][tanggal_checkOut]`,
            item.tanggal_checkOut || ''
          );
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][harga_satuan]`,
            parseCurrency(item.harga_satuan)
          );
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][malam]`,
            parseInt(item.malam) || 0
          );
          formData.append(
            `pegawai[${pegawaiId}][akomodasi][${index}][nominal]`,
            parseCurrency(item.nominal)
          );
        });

        // Append Kontribusi
        p.kontribusi.forEach((item, index) => {
          formData.append(
            `pegawai[${pegawaiId}][kontribusi][${index}][jenis]`,
            item.jenis || 'Bimbingan Teknis'
          );
          formData.append(
            `pegawai[${pegawaiId}][kontribusi][${index}][nominal]`,
            parseCurrency(item.nominal)
          );
        });

        // Append Lain Lain
        p.lain_lain.forEach((item, index) => {
          formData.append(`pegawai[${pegawaiId}][lain_lain][${index}][uraian]`, item.uraian || '');
          formData.append(
            `pegawai[${pegawaiId}][lain_lain][${index}][tarif_satuan]`,
            parseCurrency(item.tarif_satuan)
          );
          formData.append(
            `pegawai[${pegawaiId}][lain_lain][${index}][jumlah_hari]`,
            parseInt(item.jumlah_hari) || 0
          );
          formData.append(
            `pegawai[${pegawaiId}][lain_lain][${index}][nominal]`,
            parseCurrency(item.nominal)
          );
          formData.append(
            `pegawai[${pegawaiId}][lain_lain][${index}][keterangan]`,
            item.keterangan || ''
          );
        });
      });

      let res;
      if (isEditMode) {
        res = await axios.put(`/api/laporan/${editingLaporanId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await axios.post('/api/laporan', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      showNotification(res.data?.message || 'Laporan berhasil disimpan.');
      setView('list');
      fetchLaporan();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan laporan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* --- LIST VIEW --- */}
      {view === 'list' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                HASIL PERJALANAN DINAS
              </h1>
              <p className="text-sm text-slate-500">
                Kelola Laporan Perjalanan Dinas Jabatan dan Pembatalan Tugas.
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={() => openCancelModal()}
                className="flex items-center gap-2 px-4 py-2.5 bg-yellow-300   text-orange-600 rounded-xl text-sm font-semibold border border-orange-100 shadow-sm transition-all duration-200"
              >
                <Ban size={16} />
                <span>Batal Tugas</span>
              </button>
              <button
                onClick={() => openFormView()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-800 to-green-600 hover:from-indigo-900 hover:to-green-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all duration-200"
              >
                <Plus size={16} />
                <span>Buat Laporan</span>
              </button>
            </div>
          </div>

          {/* Tabs header & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-2 gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('laporan');
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-t-2xl rounded-l-none transition-all duration-200 ${
                  activeTab === 'laporan'
                    ? 'bg-mauve-500 text-white'
                    : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                }`}
              >
                Daftar Laporan
              </button>
              <button
                onClick={() => {
                  setActiveTab('pembatalan');
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-t-2xl rounded-l-none transition-all duration-200 ${
                  activeTab === 'pembatalan'
                    ? 'bg-mauve-500 text-white'
                    : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                }`}
              >
                Daftar Pembatalan Tugas
              </button>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'laporan' && (
                <div className="relative w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari laporan..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-none focus:ring-1 focus:ring-mauve-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Limit:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-600 focus:outline-none focus:border-none focus:ring-1 focus:ring-mauve-500"
                >
                  <option value={5}>5</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Area */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Memuat Data...
              </p>
            </div>
          ) : activeTab === 'laporan' ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl rounded-b-none">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="">
                    <tr className="bg-mauve-500 text-slate-100 border-b-2 border-mauve-500 border-double text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff]">
                        No
                      </th>
                      <th className="py-3 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Judul Laporan
                      </th>
                      <th className="py-3 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Nomor SPT Terkait
                      </th>
                      <th className="py-3 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Tanggal Laporan
                      </th>
                      <th className="py-3 px-6 pl-16 text-center shadow-[inset_0_-2px_0_0_#ffffff]">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {laporanList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          Belum ada laporan dibuat.
                        </td>
                      </tr>
                    ) : (
                      laporanList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-800 align-top">
                            {(page - 1) * limit + idx + 1}.
                          </td>
                          <td className="py-3 px-4 text-slate-800 align-top">{item.judul}</td>
                          <td className="py-3 px-4 text-slate-800 align-top">{item.nomor_surat}</td>
                          <td className="py-3 px-4 text-slate-800 align-top">
                            {formatDate(item.tanggal_laporan)}
                          </td>
                          <td className="py-3 px-4 text-right align-top">
                            <div className="flex items-center justify-end gap-3.5">
                              <a
                                href={`/cetak/laporan/${item.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-mauve-900/90 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Cetak Laporan"
                              >
                                <Printer size={16} />
                              </a>
                              <button
                                onClick={() => openFormView(item.id)}
                                className="p-1.5 text-mauve-900/90 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit Laporan"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteLaporan(item.id)}
                                className="p-1.5 text-mauve-900/90 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Hapus Laporan"
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

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-1">
                  <span className="text-xs text-slate-400">
                    Menampilkan <span className="font-semibold">{laporanList.length}</span> dari{' '}
                    <span className="font-semibold">{totalItems}</span> laporan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => setPage(num)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                          page === num
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl rounded-b-none">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="">
                    <tr className="bg-mauve-500 text-slate-100 border-b-2 border-mauve-500 border-double text-xs uppercase font-bold tracking-wider">
                      <th className="py-3.5 px-4 text-center w-12 shadow-[inset_0_-2px_0_0_#ffffff]">
                        No
                      </th>
                      <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Nomor SPT
                      </th>
                      <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Tanggal Batal
                      </th>
                      <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Nama Pelaksana
                      </th>
                      <th className="py-3.5 px-4 text-left shadow-[inset_0_-2px_0_0_#ffffff]">
                        Alasan
                      </th>
                      <th className="py-3.5 px-4 text-right shadow-[inset_0_-2px_0_0_#ffffff]">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {canceledList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          Tidak ada data pembatalan.
                        </td>
                      </tr>
                    ) : (
                      canceledList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 text-center font-medium text-slate-400">
                            {(page - 1) * limit + idx + 1}.
                          </td>
                          <td className="py-4 px-4 text-slate-800 font-mono text-xs">
                            {item.nomor_surat}
                          </td>
                          <td className="py-4 px-4 text-slate-500">
                            {formatDate(item.tanggal_pembatalan)}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {item.pegawai_nama}
                          </td>
                          <td
                            className="py-4 px-4 text-slate-500 truncate max-w-[200px]"
                            title={item.alasan}
                          >
                            {item.alasan || '-'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-3.5">
                              <a
                                href={`/cetak/pembatalan/${item.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Cetak Surat Pembatalan"
                              >
                                <Printer size={16} />
                              </a>
                              <button
                                onClick={() => openCancelModal(item.id)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit Pembatalan"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteCanceled(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Hapus Pembatalan"
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

              {/* Pagination canceled */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-1">
                  <span className="text-xs text-slate-400">
                    Menampilkan <span className="font-semibold">{canceledList.length}</span> dari{' '}
                    <span className="font-semibold">{totalItems}</span> data pembatalan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => setPage(num)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                          page === num
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- FORM VIEW (ADD / EDIT) --- */}
      {view === 'form' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('list')}
                className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  {isEditMode ? 'EDIT LAPORAN PERJADIN' : 'BUAT LAPORAN BARU'}
                </h1>
                <p className="text-xs text-slate-500">
                  Isi data laporan perjalanan dinas dan sesuaikan biaya realisasinya.
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmitReport}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Laporan</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-8">
            {/* 1. Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Nomor SPT
                </label>
                <select
                  value={form.spt_id}
                  onChange={handleSptChange}
                  disabled={isEditMode}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-800 font-medium"
                >
                  <option value="">-- Pilih SPT --</option>
                  {sptOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.nomor_surat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Tanggal Laporan
                </label>
                <input
                  type="date"
                  value={form.tanggal_laporan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tanggal_laporan: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Tempat Laporan Dibuat
                </label>
                <input
                  type="text"
                  value={form.tempat_laporan}
                  onChange={(e) => setForm((prev) => ({ ...prev, tempat_laporan: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                />
              </div>
            </div>

            {loadingSptDetails ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Mengambil Detail SPT...
                </p>
              </div>
            ) : selectedSpt ? (
              <>
                {/* 2. Informasi Dasar */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-md font-bold text-slate-800">1. Informasi Dasar</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Judul Laporan
                      </label>
                      <input
                        type="text"
                        placeholder="Judul laporan yang mencerminkan isi perjalanan dinas"
                        value={form.judul}
                        onChange={(e) => setForm((prev) => ({ ...prev, judul: e.target.value }))}
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 shadow-sm"
                      />
                    </div>

                    {/* Penandatangan Checkbox Container */}
                    <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Pilih penandatangan laporan (otomatis dicentang dari pelaksana SPT):
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pegawaiList.map((p) => {
                          const isCanceled = (selectedSpt.pegawai_dibatalkan || []).some(
                            (cp) => cp.pegawai_id === p.pegawai_id
                          );
                          return (
                            <label
                              key={p.pegawai_id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                isCanceled
                                  ? 'border-red-100 bg-red-50/20 opacity-60 cursor-not-allowed'
                                  : selectedSigners.includes(p.pegawai_id.toString())
                                    ? 'border-indigo-100 bg-indigo-50/30'
                                    : 'border-slate-100 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                value={p.pegawai_id}
                                disabled={isCanceled}
                                checked={selectedSigners.includes(p.pegawai_id.toString())}
                                onChange={(e) =>
                                  handleSignerCheckboxChange(
                                    p.pegawai_id.toString(),
                                    e.target.checked
                                  )
                                }
                                className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="text-xs">
                                <span className="font-bold text-slate-800 block">
                                  {p.nama_lengkap}
                                </span>
                                <span className="text-slate-500 block">
                                  NIP. {p.nip || '-'} | {p.jabatan}
                                </span>
                                {isCanceled && (
                                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-red-100 text-red-600 rounded">
                                    BATAL TUGAS
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Dasar Perjalanan Dinas (Otomatis)
                        </label>
                        <textarea
                          readOnly
                          rows={2}
                          value={form.dasar_perjalanan}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-sm cursor-not-allowed focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Tujuan Perjalanan Dinas (Otomatis)
                        </label>
                        <textarea
                          readOnly
                          rows={2}
                          value={form.tujuan_perjalanan}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-sm cursor-not-allowed focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Lama & Tanggal Perjalanan (Otomatis)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={form.lama_dan_tanggal_perjalanan}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-sm cursor-not-allowed focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Mata Anggaran yang Dipakai (Otomatis)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={form.kode_anggaran_display}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-sm cursor-not-allowed focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Rincian Kegiatan */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Info className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-md font-bold text-slate-800">2. Rincian Kegiatan</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Deskripsi Perjalanan (Secara Kronologis)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Uraikan kronologis perjalanan dinas..."
                        value={form.deskripsi_kronologis}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, deskripsi_kronologis: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Tempat yang Dikunjungi (Otomatis)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={form.tempat_dikunjungi}
                        className="w-full px-3 py-2.5 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-sm cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Hasil yang Dicapai
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Hasil yang dicapai selama melakukan perjalanan dinas..."
                        value={form.hasil_dicapai}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, hasil_dicapai: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Rincian Pengeluaran Per Pegawai */}
                {selectedSigners.length > 0 && (
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                      <Coins className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-md font-bold text-slate-800">3. Rincian Pengeluaran</h3>
                    </div>

                    <div className="space-y-8">
                      {selectedSigners.map((signerId) => {
                        const peg = pegawaiList.find((p) => p.pegawai_id.toString() === signerId);
                        const expData = pegawaiData[signerId];
                        if (!peg || !expData) return null;

                        return (
                          <div
                            key={signerId}
                            className="border border-slate-100 rounded-3xl p-5 md:p-6 bg-slate-50/20 space-y-6"
                          >
                            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                              <h4 className="text-md font-bold text-indigo-700">
                                Rincian Pengeluaran Untuk: {peg.nama_lengkap}
                              </h4>
                              <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1 rounded-xl">
                                NIP: {peg.nip || '-'}
                              </span>
                            </div>

                            {/* Transportasi */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Transportasi (Pergi & Pulang)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addExpenseRow(signerId, 'transportasi')}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                  <Plus size={14} /> Add Transportasi
                                </button>
                              </div>
                              <div className="space-y-3">
                                {expData.transportasi.map((row, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white border border-slate-100 rounded-2xl relative"
                                  >
                                    <div className="md:col-span-2">
                                      <select
                                        value={row.jenis}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'jenis',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl"
                                      >
                                        <option>Bus</option>
                                        <option>Taksi</option>
                                        <option>Kereta Api</option>
                                        <option>Kapal</option>
                                        <option>Pesawat</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="text"
                                        placeholder="Maskapai/Perusahaan"
                                        value={row.perusahaan}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'perusahaan',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="text"
                                        placeholder="Kode Booking"
                                        value={row.kode_boking}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'kode_boking',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="text"
                                        placeholder="No Tiket"
                                        value={row.nomor_tiket}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'nomor_tiket',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="date"
                                        value={row.tanggal_tiket}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'tanggal_tiket',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl text-slate-600"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="text"
                                        placeholder="Nominal (Rp)"
                                        value={row.nominal}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'nominal',
                                            formatCurrency(e.target.value)
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl text-right font-medium text-slate-800"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Terminal Berangkat"
                                        value={row.terminal_berangkat}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'terminal_berangkat',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Terminal Tiba"
                                        value={row.terminal_tiba}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'transportasi',
                                            idx,
                                            'terminal_tiba',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-4 flex items-center gap-4">
                                      <div className="flex gap-3">
                                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                                          <input
                                            type="radio"
                                            name={`arah_${signerId}_${idx}`}
                                            value="berangkat"
                                            checked={row.arah_perjalanan === 'berangkat'}
                                            onChange={() =>
                                              handleExpenseInputChange(
                                                signerId,
                                                'transportasi',
                                                idx,
                                                'arah_perjalanan',
                                                'berangkat'
                                              )
                                            }
                                            className="text-indigo-600"
                                          />
                                          <span>Berangkat</span>
                                        </label>
                                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                                          <input
                                            type="radio"
                                            name={`arah_${signerId}_${idx}`}
                                            value="kembali"
                                            checked={row.arah_perjalanan === 'kembali'}
                                            onChange={() =>
                                              handleExpenseInputChange(
                                                signerId,
                                                'transportasi',
                                                idx,
                                                'arah_perjalanan',
                                                'kembali'
                                              )
                                            }
                                            className="text-indigo-600"
                                          />
                                          <span>Kembali</span>
                                        </label>
                                      </div>
                                    </div>
                                    {expData.transportasi.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeExpenseRow(signerId, 'transportasi', idx)
                                        }
                                        className="absolute -top-2.5 -right-2.5 p-1 bg-white border border-slate-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 rounded-full shadow-sm transition-all"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Akomodasi */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Akomodasi / Penginapan
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addExpenseRow(signerId, 'akomodasi')}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                  <Plus size={14} /> Add Akomodasi
                                </button>
                              </div>
                              <div className="space-y-3">
                                {expData.akomodasi.map((row, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white border border-slate-100 rounded-2xl relative"
                                  >
                                    <div className="md:col-span-3">
                                      <select
                                        value={row.jenis}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'jenis',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl"
                                      >
                                        <option>Hotel</option>
                                        <option>Ditanggung Panitia</option>
                                        <option>Rumah Warga (30%)</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Nama Penginapan"
                                        value={row.nama}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'nama',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Lokasi (Kota)"
                                        value={row.lokasi_hotel}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'lokasi_hotel',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Harga Satuan (Rp)"
                                        value={row.harga_satuan}
                                        readOnly={row.readOnlyHarga}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'harga_satuan',
                                            formatCurrency(e.target.value)
                                          )
                                        }
                                        className={`w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl text-right font-medium ${
                                          row.readOnlyHarga
                                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                            : 'text-slate-800'
                                        }`}
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="date"
                                        title="Tanggal Check In"
                                        value={row.tanggal_checkIn}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'tanggal_checkIn',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl text-slate-600"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="date"
                                        title="Tanggal Check Out"
                                        value={row.tanggal_checkOut}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'tanggal_checkOut',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl text-slate-600"
                                      />
                                    </div>
                                    <div className="md:col-span-2 flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        placeholder="Qty"
                                        value={row.malam}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'akomodasi',
                                            idx,
                                            'malam',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl text-center font-bold"
                                      />
                                      <span className="text-xs text-slate-400">malam</span>
                                    </div>
                                    <div className="md:col-span-4">
                                      <input
                                        type="text"
                                        placeholder="Total Akomodasi"
                                        readOnly
                                        value={row.nominal}
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-xl text-right font-bold"
                                      />
                                    </div>
                                    {expData.akomodasi.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeExpenseRow(signerId, 'akomodasi', idx)}
                                        className="absolute -top-2.5 -right-2.5 p-1 bg-white border border-slate-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 rounded-full shadow-sm transition-all"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Kontribusi */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Kontribusi (BIMTEK/Diklat/Kursus)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addExpenseRow(signerId, 'kontribusi')}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                  <Plus size={14} /> Add Kontribusi
                                </button>
                              </div>
                              <div className="space-y-3">
                                {expData.kontribusi.map((row, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white border border-slate-100 rounded-2xl relative"
                                  >
                                    <div className="md:col-span-6">
                                      <select
                                        value={row.jenis}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'kontribusi',
                                            idx,
                                            'jenis',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl"
                                      >
                                        <option>Bimbingan Teknis</option>
                                        <option>Kursus</option>
                                        <option>Pelatihan/Diklat</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-6 flex items-center gap-2">
                                      <input
                                        type="text"
                                        placeholder="Nominal (Rp)"
                                        value={row.nominal}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'kontribusi',
                                            idx,
                                            'nominal',
                                            formatCurrency(e.target.value)
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl text-right font-medium text-slate-800"
                                      />
                                      <span className="text-xs text-slate-400">/kegiatan</span>
                                    </div>
                                    {expData.kontribusi.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeExpenseRow(signerId, 'kontribusi', idx)
                                        }
                                        className="absolute -top-2.5 -right-2.5 p-1 bg-white border border-slate-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 rounded-full shadow-sm transition-all"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Lain-Lain */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Pengeluaran Lain-lain (Sewa Mobil, dll)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addExpenseRow(signerId, 'lain_lain')}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                  <Plus size={14} /> Add Lain-lain
                                </button>
                              </div>
                              <div className="space-y-3">
                                {expData.lain_lain.map((row, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white border border-slate-100 rounded-2xl relative"
                                  >
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Uraian Biaya"
                                        value={row.uraian}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'lain_lain',
                                            idx,
                                            'uraian',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="text"
                                        placeholder="Tarif Satuan"
                                        value={row.tarif_satuan}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'lain_lain',
                                            idx,
                                            'tarif_satuan',
                                            formatCurrency(e.target.value)
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl text-right font-medium text-slate-800"
                                      />
                                    </div>
                                    <div className="md:col-span-2 flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        placeholder="Qty"
                                        value={row.jumlah_hari}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'lain_lain',
                                            idx,
                                            'jumlah_hari',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2 py-2 border border-slate-200 rounded-xl text-center font-bold"
                                      />
                                      <span className="text-xs text-slate-400">hari</span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <input
                                        type="text"
                                        placeholder="Total (Rp)"
                                        readOnly
                                        value={row.nominal}
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-xl text-right font-bold"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <input
                                        type="text"
                                        placeholder="Keterangan"
                                        value={row.keterangan}
                                        onChange={(e) =>
                                          handleExpenseInputChange(
                                            signerId,
                                            'lain_lain',
                                            idx,
                                            'keterangan',
                                            e.target.value
                                          )
                                        }
                                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl"
                                      />
                                    </div>
                                    {expData.lain_lain.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeExpenseRow(signerId, 'lain_lain', idx)}
                                        className="absolute -top-2.5 -right-2.5 p-1 bg-white border border-slate-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 rounded-full shadow-sm transition-all"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Kesimpulan */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <FileCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-md font-bold text-slate-800">4. Kesimpulan</h3>
                  </div>
                  <div>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan kesimpulan dan saran/rekomendasi..."
                      value={form.kesimpulan}
                      onChange={(e) => setForm((prev) => ({ ...prev, kesimpulan: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 shadow-sm"
                    />
                  </div>
                </div>

                {/* 6. Lampiran (Bukti Perjalanan) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Upload className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-md font-bold text-slate-800">
                      5. Lampiran (Bukti Perjalanan)
                    </h3>
                  </div>

                  {/* Drop area */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl bg-slate-50/20 transition-all cursor-pointer text-center relative"
                  >
                    <Upload className="w-10 h-10 text-slate-300 mb-3" />
                    <div className="flex flex-wrap items-center justify-center text-sm font-semibold text-slate-600 gap-1">
                      <label className="text-indigo-600 hover:underline cursor-pointer">
                        <span>Pilih file untuk diupload</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          accept="image/jpeg,image/png,application/pdf"
                          className="hidden"
                        />
                      </label>
                      <span>atau seret dan lepas di sini</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Format PNG, JPG, PDF (Maksimal 10MB per file)
                    </p>
                  </div>

                  {/* List of files */}
                  {(existingFiles.length > 0 || newFiles.length > 0) && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Daftar Lampiran:
                      </p>

                      {/* Existing files */}
                      {existingFiles.map((file) => {
                        const isImage = file.file_name?.match(/\.(jpeg|jpg|png|gif|webp)$/i);
                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              {isImage ? (
                                <img
                                  src={`/${file.file_path}`}
                                  alt={file.file_name}
                                  className="w-10 h-10 object-cover rounded-lg border"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg border uppercase">
                                  PDF
                                </div>
                              )}
                              <div>
                                <a
                                  href={`/${file.file_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-semibold text-indigo-600 hover:underline truncate block max-w-xs"
                                >
                                  {file.file_name}
                                </a>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                  Tersimpan di server
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingFile(file.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        );
                      })}

                      {/* New files */}
                      {newFiles.map((file, idx) => {
                        const isImage = file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              {isImage ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-10 h-10 object-cover rounded-lg border"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 text-[10px] font-bold rounded-lg border uppercase">
                                  {file.name.split('.').pop() || 'FILE'}
                                </div>
                              )}
                              <div>
                                <span className="text-sm font-semibold text-slate-700 truncate block max-w-xs">
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider block">
                                  Siap diupload
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNewFile(idx)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Simpan Laporan</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
                Silakan pilih Nomor SPT terlebih dahulu untuk mengisi data laporan.
              </div>
            )}
          </form>
        </div>
      )}

      {/* --- MODAL PEMBATALAN TUGAS --- */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-red-600 to-rose-500 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {cancelEditId ? 'Edit Formulir Pembatalan Tugas' : 'Formulir Pembatalan Tugas'}
                </h3>
                <p className="text-xs text-red-100 mt-0.5">
                  Batalkan tugas pegawai pada SPT dan kelola biaya hangus.
                </p>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="text-red-100 hover:text-white p-1 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleCancelSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-4 text-left"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Nomor SPT yang Dibatalkan
                </label>
                <select
                  value={cancelForm.spt_id}
                  onChange={handleCancelSptChange}
                  required
                  disabled={!!cancelEditId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Pilih SPT --</option>
                  {cancelSptList.map((spt) => (
                    <option key={spt.id} value={spt.id}>
                      {spt.nomor_surat} {spt.status === 'dibatalkan' ? ' (Dibatalkan)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Pegawai yang Dibatalkan
                </label>
                <select
                  value={cancelForm.pegawai_id}
                  onChange={handleCancelPegawaiChange}
                  required
                  disabled={!cancelForm.spt_id || loadingCancelPegawai || !!cancelEditId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {loadingCancelPegawai ? (
                    <option>Memuat Pegawai...</option>
                  ) : cancelPegawaiList.length === 0 ? (
                    <option value="">
                      {cancelForm.spt_id
                        ? '-- Semua pegawai sudah melapor --'
                        : '-- Pilih SPT terlebih dahulu --'}
                    </option>
                  ) : (
                    <>
                      <option value="">-- Pilih Pegawai --</option>
                      {cancelPegawaiList.map((p) => (
                        <option key={p.pegawai_id} value={p.pegawai_id}>
                          {p.nama_lengkap} (NIP: {p.nip || '-'})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {cancelNotif && (
                <div className="p-3 text-xs border border-red-200 bg-red-50 text-red-700 rounded-2xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{cancelNotif}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Tempat Pembatalan
                  </label>
                  <input
                    type="text"
                    value={cancelForm.tempat_pembatalan}
                    onChange={(e) =>
                      setCancelForm((prev) => ({ ...prev, tempat_pembatalan: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Tanggal Pembatalan
                  </label>
                  <input
                    type="date"
                    value={cancelForm.tanggal_pembatalan}
                    onChange={(e) =>
                      setCancelForm((prev) => ({ ...prev, tanggal_pembatalan: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Alasan Pembatalan
                </label>
                <textarea
                  rows={3}
                  value={cancelForm.alasan}
                  onChange={(e) => setCancelForm((prev) => ({ ...prev, alasan: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Rincian Biaya Hangus */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Perincian Biaya Hangus
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cancelForm.ambilPanjar}
                      onChange={(e) => handlePanjarToggle(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">
                      Ambil dari Uang Muka
                    </span>
                  </label>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Uraian Biaya (misal: Tiket Pesawat, Reservasi Hotel)"
                    value={cancelForm.rincian_biaya}
                    readOnly={cancelForm.ambilPanjar}
                    onChange={(e) =>
                      setCancelForm((prev) => ({ ...prev, rincian_biaya: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-sm ${
                      cancelForm.ambilPanjar
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'bg-white'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Nominal Biaya (Rp)"
                    value={cancelForm.nominal_biaya}
                    readOnly={cancelForm.ambilPanjar}
                    onChange={(e) =>
                      setCancelForm((prev) => ({
                        ...prev,
                        nominal_biaya: formatCurrency(e.target.value),
                      }))
                    }
                    className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-right font-medium ${
                      cancelForm.ambilPanjar
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'bg-white text-slate-800'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Isi manual jika tidak ada uang muka, atau aktifkan checkbox untuk mengambil data
                  otomatis dari data Panjar yang ada.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={!!cancelNotif && !cancelEditId}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelEditId ? 'Simpan Perubahan' : 'Batalkan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuatLaporan;
