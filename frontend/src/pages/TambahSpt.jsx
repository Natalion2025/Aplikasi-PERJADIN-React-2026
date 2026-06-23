import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  FileText, 
  Users, 
  MapPin, 
  Wallet, 
  Info, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';

const TambahSpt = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const isEditMode = !!id;

  // Form states
  const [form, setForm] = useState({
    nomor_surat: '',
    tanggal_surat: '',
    dasar_surat: '',
    pejabat_pemberi_tugas_id: '',
    maksud_perjalanan: '',
    lokasi_tujuan: '',
    tempat_berangkat: 'Nanga Pinoh',
    tanggal_berangkat: '',
    tanggal_kembali: '',
    lama_perjalanan: '',
    sumber_dana: 'APBD Murni',
    kendaraan: 'Transportasi Umum',
    anggaran_id: '',
    keterangan: ''
  });

  // Dynamic pegawai assignments
  // Each element is { id: '', pengikut: '1' } (first one default is '0' - Bukan Pengikut)
  const [pegawaiAssignments, setPegawaiAssignments] = useState([
    { id: '', pengikut: '0' }
  ]);

  // Options & static data lists
  const [pejabatList, setPejabatList] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [anggaranList, setAnggaranList] = useState([]);
  const [locations, setLocations] = useState([]); // from locations.json
  
  // Custom searchable selects state
  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationDropdownOpen, setDestinationDropdownOpen] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');

  // Fetch dropdown options and static locations
  const loadOptions = async () => {
    try {
      setLoading(true);
      const [pejabatRes, pegawaiRes, anggaranRes, locationsRes] = await Promise.all([
        axios.get('/api/pejabat'),
        axios.get('/api/pegawai?limit=1000'),
        axios.get('/api/anggaran/options'),
        axios.get('/data/locations.json')
      ]);

      const semuaPegawai = pegawaiRes.data?.data || pegawaiRes.data || [];
      const pejabatDaerah = pejabatRes.data || [];
      
      // Add Sekda to Pejabat Pemberi Tugas if found
      const sekda = semuaPegawai.find(p => p.jabatan && p.jabatan.toLowerCase() === 'sekretaris daerah');
      const pemberiTugas = [...pejabatDaerah];
      if (sekda) {
        pemberiTugas.push({
          id: sekda.id,
          nama: sekda.nama_lengkap,
          jabatan: sekda.jabatan
        });
      }

      setPejabatList(pemberiTugas);
      
      // Filter out Sekda from regular pegawai list
      const pegawaiPelaksana = semuaPegawai.filter(
        p => !(p.jabatan && p.jabatan.toLowerCase() === 'sekretaris daerah')
      );
      setPegawaiList(pegawaiPelaksana);
      setAnggaranList(anggaranRes.data || []);
      
      // Flatten locations
      const flattenedLocations = [];
      if (Array.isArray(locationsRes.data)) {
        locationsRes.data.forEach(group => {
          group.locations.forEach(loc => {
            flattenedLocations.push({
              text: `${loc}, ${group.group}`,
              value: `${loc}, ${group.group}`
            });
          });
        });
      }
      setLocations(flattenedLocations);

    } catch (err) {
      console.error('Error loading options:', err);
      setError('Gagal memuat opsi form. Harap hubungi administrator.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch single SPT detail for edit mode
  const fetchSptDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/spt/${id}`);
      if (res.data) {
        const spt = res.data;
        setForm({
          nomor_surat: spt.nomor_surat || '',
          tanggal_surat: spt.tanggal_surat || '',
          dasar_surat: spt.dasar_surat || '',
          pejabat_pemberi_tugas_id: spt.pejabat_pemberi_tugas_id || '',
          maksud_perjalanan: spt.maksud_perjalanan || '',
          lokasi_tujuan: spt.lokasi_tujuan || '',
          tempat_berangkat: spt.tempat_berangkat || 'Nanga Pinoh',
          tanggal_berangkat: spt.tanggal_berangkat || '',
          tanggal_kembali: spt.tanggal_kembali || '',
          lama_perjalanan: spt.lama_perjalanan || '',
          sumber_dana: spt.sumber_dana || 'APBD Murni',
          kendaraan: spt.kendaraan || 'Transportasi Umum',
          anggaran_id: spt.anggaran_id || '',
          keterangan: spt.keterangan || ''
        });

        setDestinationSearch(spt.lokasi_tujuan || '');

        // Map pegawai
        if (spt.pegawai && spt.pegawai.length > 0) {
          setPegawaiAssignments(
            spt.pegawai.map(p => ({
              id: p.pegawai_id.toString(),
              pengikut: p.is_pengikut.toString()
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching SPT detail:', err);
      setError('Gagal memuat detail SPT yang ingin diedit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadOptions();
      if (isEditMode) {
        await fetchSptDetail();
      }
    };
    initialize();
  }, [id]);

  // Calculate travel duration automatically when dates change
  useEffect(() => {
    const startDate = form.tanggal_berangkat;
    const endDate = form.tanggal_kembali;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        setForm(prev => ({ ...prev, lama_perjalanan: '', tanggal_kembali: '' }));
        alert('Tanggal kembali tidak boleh sebelum tanggal berangkat.');
      } else {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
        setForm(prev => ({ ...prev, lama_perjalanan: diffDays }));
      }
    } else {
      setForm(prev => ({ ...prev, lama_perjalanan: '' }));
    }
  }, [form.tanggal_berangkat, form.tanggal_kembali]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Pegawai Rows operations
  const handleAddPegawaiRow = () => {
    setPegawaiAssignments(prev => [...prev, { id: '', pengikut: '1' }]);
  };

  const handleRemovePegawaiRow = (index) => {
    if (pegawaiAssignments.length === 1) return;
    setPegawaiAssignments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePegawaiChange = (index, value) => {
    const updated = [...pegawaiAssignments];
    updated[index].id = value;
    setPegawaiAssignments(updated);
  };

  const handlePengikutChange = (index, value) => {
    const updated = [...pegawaiAssignments];
    updated[index].pengikut = value;
    setPegawaiAssignments(updated);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConflictMessage('');
    
    // Validate employees
    const filteredPegawai = pegawaiAssignments.filter(p => p.id !== '');
    if (filteredPegawai.length === 0) {
      setError('Harap pilih minimal satu pegawai yang ditugaskan.');
      return;
    }

    const hasNonFollower = filteredPegawai.some(p => p.pengikut === '0');
    if (!hasNonFollower) {
      setError('Harus ada minimal satu pegawai yang ditugaskan sebagai Pelaksana Utama (Bukan Pengikut).');
      return;
    }

    // Validate duplicate employees inside the form itself
    const assignedIds = filteredPegawai.map(p => p.id);
    const uniqueIds = new Set(assignedIds);
    if (assignedIds.length !== uniqueIds.size) {
      setError('Ada pegawai yang dipilih lebih dari sekali. Harap periksa kembali.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        pegawai: filteredPegawai.map(p => ({
          id: parseInt(p.id, 10),
          pengikut: parseInt(p.pengikut, 10)
        }))
      };

      const url = isEditMode ? `/api/spt/${id}` : '/api/spt';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await axios({
        url,
        method,
        data: payload
      });

      alert(res.data.message || 'SPT berhasil disimpan.');
      navigate('/spt');
    } catch (err) {
      console.error('Error saving SPT:', err);
      if (err.response && err.response.status === 409) {
        setConflictMessage(err.response.data.message || 'Jadwal penugasan bentrok.');
      } else {
        setError(err.response?.data?.message || 'Gagal menyimpan SPT. Pastikan data lengkap.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filter locations based on search query
  const filteredLocations = locations.filter(loc =>
    loc.text.toLowerCase().includes(destinationSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Breadcrumb / Back */}
      <div className="flex items-center justify-between">
        <Link to="/spt" className="flex items-center gap-2 text-sm text-slate-500 font-semibold hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Register SPT
        </Link>
        <span className="text-xs text-slate-400">ID SPT: {isEditMode ? id : 'Baru'}</span>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight dark:text-white">
          {isEditMode ? 'Edit Surat Perintah Tugas' : 'Buat Surat Perintah Tugas (SPT)'}
        </h1>
        <p className="text-slate-500 text-sm mt-1 dark:text-slate-400">
          {isEditMode ? 'Perbarui informasi detail penugasan perjalanan dinas.' : 'Buat perintah tugas kedinasan baru untuk pegawai Pemkab Melawi.'}
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
          <span className="text-sm font-medium">Memuat data formulir...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Informasi Surat */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Informasi Surat Tugas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Detail penomoran dan dasar hukum pembuatan surat.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Nomor Surat
                </label>
                <input
                  type="text"
                  name="nomor_surat"
                  required
                  placeholder="Contoh: 090/10/SPT/2026"
                  value={form.nomor_surat}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tanggal Surat
                </label>
                <input
                  type="date"
                  name="tanggal_surat"
                  required
                  value={form.tanggal_surat}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Dasar Surat Tugas
              </label>
              <textarea
                name="dasar_surat"
                required
                rows={3}
                placeholder="Contoh: Menindaklanjuti Surat Undangan Rapat dari Sekretaris Daerah Pemkab Melawi nomor 005/12/Setda..."
                value={form.dasar_surat}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Section 2: Pihak Terkait */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Pemberi Tugas & Pelaksana</h3>
                <p className="text-xs text-slate-400 mt-0.5">Siapa yang bertanda tangan dan siapa yang ditugaskan.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Pejabat Pemberi Tugas
              </label>
              <select
                name="pejabat_pemberi_tugas_id"
                required
                value={form.pejabat_pemberi_tugas_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              >
                <option value="">-- Pilih Pejabat --</option>
                {pejabatList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama} - {p.jabatan}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Daftar Pegawai yang Ditugaskan
                </label>
                <button
                  type="button"
                  onClick={handleAddPegawaiRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400 dark:hover:bg-slate-650 rounded-lg text-xs font-bold transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Pegawai
                </button>
              </div>

              <div className="space-y-3.5">
                {pegawaiAssignments.map((assignment, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-700/30">
                    {/* Pegawai select */}
                    <div className="flex-1">
                      <select
                        required
                        value={assignment.id}
                        onChange={(e) => handlePegawaiChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Pilih Pegawai --</option>
                        {pegawaiList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nama_lengkap} (NIP: {p.nip})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role options */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name={`pengikut_${index}`}
                          value="0"
                          checked={assignment.pengikut === '0'}
                          onChange={() => handlePengikutChange(index, '0')}
                          className="h-3.5 w-3.5 text-indigo-600"
                        />
                        Utama (Bukan Pengikut)
                      </label>

                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name={`pengikut_${index}`}
                          value="1"
                          checked={assignment.pengikut === '1'}
                          onChange={() => handlePengikutChange(index, '1')}
                          className="h-3.5 w-3.5 text-indigo-600"
                        />
                        Pengikut
                      </label>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={pegawaiAssignments.length === 1}
                      onClick={() => handleRemovePegawaiRow(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg disabled:opacity-50 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Informasi Perjalanan Dinas */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Rincian Perjalanan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tujuan, waktu pelaksanaan, dan jenis transportasi.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Maksud & Tujuan Perjalanan Dinas
              </label>
              <textarea
                name="maksud_perjalanan"
                required
                rows={3}
                placeholder="Contoh: Melakukan koordinasi sistem informasi Command Center di Dinas Kominfo Kota Pontianak..."
                value={form.maksud_perjalanan}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
            </div>

            {/* Custom Searchable Dropdown for Destination */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Lokasi Tujuan
              </label>
              <input
                type="text"
                required
                placeholder="Ketik untuk mencari atau menambah lokasi..."
                value={destinationSearch}
                onChange={(e) => {
                  setDestinationSearch(e.target.value);
                  setForm(prev => ({ ...prev, lokasi_tujuan: e.target.value }));
                  setDestinationDropdownOpen(true);
                }}
                onFocus={() => setDestinationDropdownOpen(true)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />

              {destinationDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredLocations.map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, lokasi_tujuan: loc.value }));
                        setDestinationSearch(loc.text);
                        setDestinationDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium block"
                    >
                      {loc.text}
                    </button>
                  ))}

                  {destinationSearch.trim() !== '' && !locations.some(l => l.value === destinationSearch) && (
                    <button
                      type="button"
                      onClick={() => setDestinationDropdownOpen(false)}
                      className="w-full px-4 py-2.5 text-left text-xs bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold block"
                    >
                      + Gunakan Baru: "{destinationSearch}"
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tempat Berangkat
                </label>
                <input
                  type="text"
                  name="tempat_berangkat"
                  required
                  value={form.tempat_berangkat}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tanggal Berangkat
                </label>
                <input
                  type="date"
                  name="tanggal_berangkat"
                  required
                  value={form.tanggal_berangkat}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tanggal Kembali
                </label>
                <input
                  type="date"
                  name="tanggal_kembali"
                  required
                  value={form.tanggal_kembali}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Lama Perjalanan (Hari)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="lama_perjalanan"
                    readOnly
                    placeholder="Otomatis dihitung"
                    value={form.lama_perjalanan ? `${form.lama_perjalanan} Hari` : ''}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Transportasi / Kendaraan
                </label>
                <select
                  name="kendaraan"
                  value={form.kendaraan}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                  <option value="Transportasi Umum">Transportasi Umum</option>
                  <option value="Kendaraan Pribadi">Kendaraan Pribadi</option>
                  <option value="Kendaraan Dinas">Kendaraan Dinas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Informasi Anggaran */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Pembebanan Anggaran</h3>
                <p className="text-xs text-slate-400 mt-0.5">Sumber dana DPA dan pos mata anggaran kegiatan.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Sumber Dana
                </label>
                <div className="flex gap-6 mt-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="sumber_dana"
                      value="APBD Murni"
                      checked={form.sumber_dana === 'APBD Murni'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600"
                    />
                    APBD Murni
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="sumber_dana"
                      value="APBD Perubahan"
                      checked={form.sumber_dana === 'APBD Perubahan'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600"
                    />
                    APBD Perubahan
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Kode Mata Anggaran
                </label>
                <select
                  name="anggaran_id"
                  required
                  value={form.anggaran_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                  <option value="">-- Pilih Mata Anggaran --</option>
                  {anggaranList.map(a => {
                    const infoKegiatan = [a.kegiatan, a.sub_kegiatan].filter(Boolean).join(' / ');
                    return (
                      <option key={a.id} value={a.id}>
                        {a.mata_anggaran_kode} - {a.mata_anggaran_nama} ({infoKegiatan})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Keterangan */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Keterangan Tambahan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Catatan pendukung lainnya untuk Surat Perintah Tugas.</p>
              </div>
            </div>

            <div>
              <textarea
                name="keterangan"
                rows={3}
                placeholder="Isi keterangan lain jika diperlukan..."
                value={form.keterangan}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to="/spt"
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan SPT'}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Conflict Alert Modal */}
      {conflictMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl w-full max-w-md mx-auto flex flex-col p-6 animate-zoomIn">
            <div className="text-center space-y-3">
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-950/25 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Jadwal Bentrok Terdeteksi
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {conflictMessage}
              </p>
            </div>
            <button
              onClick={() => setConflictMessage('')}
              className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
            >
              Perbaiki Jadwal / Pegawai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TambahSpt;
