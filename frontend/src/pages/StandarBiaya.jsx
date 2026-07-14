import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

const SBU_CATEGORIES = [
  {
    tipe: 'A',
    title: 'A. SATUAN BIAYA UANG HARIAN PERJALANAN DINAS DALAM KOTA/KABUPATEN LEBIH DARI 8 JAM',
    templateName: 'A_Template Uang Harian Dalam Kota_Kabupaten.xlsx',
  },
  {
    tipe: 'B',
    title: 'B. SATUAN BIAYA PENGINAPAN PERJALANAN DINAS DALAM KOTA/KABUPATEN LEBIH DARI 8 JAM',
    templateName: 'B_Template Biaya Penginapan Dalam Kota_Kabupaten.xlsx',
  },
  {
    tipe: 'C',
    title: 'C. SATUAN BIAYA UANG HARIAN PERJALANAN DINAS DALAM NEGERI',
    templateName: 'C_Template Uang Harian Dalam Negeri.xlsx',
  },
  {
    tipe: 'D',
    title: 'D. SATUAN BIAYA UANG REPRESENTASI',
    templateName: 'D_Template Biaya Uang Representasi.xlsx',
  },
  {
    tipe: 'E',
    title: 'E. SATUAN BIAYA PENGINAPAN PERJALANAN DINAS DALAM NEGERI',
    templateName: 'E_Template Biaya Penginapan Dalam Negeri.xlsx',
  },
  {
    tipe: 'F',
    title:
      'F. SATUAN BIAYA TRANSPORTASI PERJALANAN DINAS DARI IBUKOTA KABUPATEN MELAWI KE IBUKOTA KECAMATAN',
    templateName: 'F_Template Biaya Transportasi Kab_Kecamatan.xlsx',
  },
  {
    tipe: 'G',
    title: 'G. SATUAN BIAYA TRANSPORTASI PERJALANAN DINAS DARI IBUKOTA KECAMATAN KE DESA',
    templateName: 'G_Template Biaya Transportasi Ibu Kota_Kecamatan_Desa.xlsx',
  },
  {
    tipe: 'H',
    title: 'H. SATUAN BIAYA TIKET PESAWAT PERJALANAN DINAS DALAM NEGERI PP DARI PONTIANAK',
    templateName: 'H_Template Biaya Tiket Pesawat Dalam Negeri PP dari Pontianak.xlsx',
  },
  {
    tipe: 'I',
    title: 'I. SATUAN BIAYA TIKET PESAWAT PERJALANAN DINAS DALAM NEGERI PP DARI JAKARTA (TRANSIT)',
    templateName: 'I_Template Biaya Tiket Pesawat Dalam Negeri PP dari Jakarta (Transit).xlsx',
  },
  {
    tipe: 'J',
    title:
      'J. SATUAN BIAYA TRANSPORTASI PERJALANAN DINAS LUAR DAERAH DALAM PROVINSI PP DARI MELAWI',
    templateName: 'J_Template Biaya Transportasi Dalam Provinsi PP dari Melawi.xlsx',
  },
  {
    tipe: 'K',
    title: 'K. SATUAN BIAYA TAKSI PERJALANAN DINAS DALAM NEGERI',
    templateName: 'K_Template Biaya Taksi Dalam Negeri.xlsx',
  },
];

const StandarBiaya = () => {
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [categoryData, setCategoryData] = useState({});
  const [loadingCategory, setLoadingCategory] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedTipe, setSelectedTipe] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(parseFloat(amount))) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchCategoryData = async (tipe) => {
    try {
      setLoadingCategory((prev) => ({ ...prev, [tipe]: true }));
      const response = await axios.get(`/api/standar-biaya/${tipe}`);
      setCategoryData((prev) => ({ ...prev, [tipe]: response.data || [] }));
    } catch (err) {
      console.error(`Error loading SBU ${tipe}:`, err);
    } finally {
      setLoadingCategory((prev) => ({ ...prev, [tipe]: false }));
    }
  };

  const handleToggleAccordion = (tipe) => {
    if (activeAccordion === tipe) {
      setActiveAccordion(null);
    } else {
      setActiveAccordion(tipe);
      if (!categoryData[tipe]) {
        fetchCategoryData(tipe);
      }
    }
  };

  const openUploadModal = (tipe) => {
    setSelectedTipe(tipe);
    setUploadModalOpen(true);
    setUploadProgress(0);
    setFeedback({ type: '', message: '' });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('tipe_biaya', selectedTipe);

    try {
      setUploading(true);
      setUploadProgress(0);
      setFeedback({ type: '', message: '' });

      const response = await axios.post('/api/standar-biaya/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setFeedback({
        type: 'success',
        message: response.data.message || 'File berhasil diupload dan disimpan.',
      });

      // Reload SBU data
      fetchCategoryData(selectedTipe);

      setTimeout(() => {
        setUploadModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Gagal mengupload SBU:', err);
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message ||
          'Terjadi kesalahan saat mengunggah file. Pastikan format kolom sesuai.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Render content table based on type
  const renderTable = (tipe, data) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-400" />
          <p className="font-medium">Belum ada data standar biaya.</p>
          <p className="text-xs">Silakan unduh template lalu unggah data Excel yang sesuai.</p>
        </div>
      );
    }

    const filtered = data.filter((item) => {
      const u = (item.uraian || '').toLowerCase();
      const p = (item.provinsi || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return u.includes(q) || p.includes(q);
    });

    if (filtered.length === 0) {
      return (
        <div className="text-center py-6 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          Tidak ditemukan data yang cocok dengan "{searchQuery}"
        </div>
      );
    }

    switch (tipe) {
      case 'A':
      case 'B':
      case 'F':
      case 'G':
      case 'H':
      case 'I':
      case 'J':
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th
                    className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700"
                    rowSpan={2}
                  >
                    No.
                  </th>
                  <th
                    className="px-6 py-3 border-r border-slate-200 dark:border-slate-700"
                    rowSpan={2}
                  >
                    {tipe === 'H' || tipe === 'I' || tipe === 'J' ? 'Kota Tujuan' : 'Tempat Tujuan'}
                  </th>
                  <th
                    className="px-6 py-3 border-r border-slate-200 dark:border-slate-700"
                    rowSpan={2}
                  >
                    Satuan
                  </th>
                  <th
                    className="px-6 py-3 text-center border-b border-slate-200 dark:border-slate-700"
                    colSpan={4}
                  >
                    Tarif Per Golongan
                  </th>
                  {tipe === 'A' && (
                    <th
                      className="px-6 py-3 text-center border-l border-slate-200 dark:border-slate-700"
                      rowSpan={2}
                    >
                      Diklat/Bimtek/Lainnya
                    </th>
                  )}
                </tr>
                <tr>
                  <th className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    A
                  </th>
                  <th className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    B
                  </th>
                  <th className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    C
                  </th>
                  <th className="px-4 py-2 text-center">D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {item.uraian}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {item.satuan}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_a)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_b)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_c)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_d)}
                    </td>
                    {tipe === 'A' && (
                      <td className="px-6 py-3.5 text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                        {formatCurrency(item.biaya_kontribusi)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'C':
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                    No.
                  </th>
                  <th className="px-6 py-3 border-r border-slate-200 dark:border-slate-700">
                    Provinsi
                  </th>
                  <th className="px-6 py-3 border-r border-slate-200 dark:border-slate-700">
                    Satuan
                  </th>
                  <th className="px-6 py-3 text-right border-r border-slate-200 dark:border-slate-700">
                    Besaran
                  </th>
                  <th className="px-6 py-3 text-right">Diklat / Bimtek (Kontribusi)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {item.provinsi}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {item.satuan}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-900 dark:text-slate-100 font-semibold">
                      {formatCurrency(item.besaran)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.biaya_kontribusi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'D':
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                    No.
                  </th>
                  <th className="px-6 py-3 border-r border-slate-200 dark:border-slate-700">
                    Uraian
                  </th>
                  <th className="px-6 py-3 border-r border-slate-200 dark:border-slate-700">
                    Satuan
                  </th>
                  <th className="px-6 py-3 text-right border-r border-slate-200 dark:border-slate-700">
                    Luar Daerah (PP)
                  </th>
                  <th className="px-6 py-3 text-right">Dalam Kota &gt; 8 Jam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {item.uraian}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {item.satuan}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-950 dark:text-slate-50 font-bold">
                      {formatCurrency(item.besaran)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.biaya_kontribusi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'E':
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th
                    className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700"
                    rowSpan={2}
                  >
                    No.
                  </th>
                  <th
                    className="px-6 py-3 border-r border-slate-200 dark:border-slate-700"
                    rowSpan={2}
                  >
                    Provinsi
                  </th>
                  <th
                    className="px-6 py-3 border-r border-slate-200 dark:border-slate-700"
                    rowSpan={2}
                  >
                    Satuan
                  </th>
                  <th
                    className="px-6 py-3 text-center border-b border-slate-200 dark:border-slate-700"
                    colSpan={4}
                  >
                    Tarif Hotel Per Golongan
                  </th>
                </tr>
                <tr>
                  <th className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    A
                  </th>
                  <th className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    B
                  </th>
                  <th className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    C
                  </th>
                  <th className="px-4 py-2 text-center">D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {item.provinsi}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {item.satuan}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_a)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_b)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_c)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.gol_d)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'K':
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                    No.
                  </th>
                  <th className="px-6 py-3 border-r border-slate-200 dark:border-slate-700">
                    Provinsi Tujuan
                  </th>
                  <th className="px-6 py-3 border-r border-slate-200 dark:border-slate-700">
                    Satuan
                  </th>
                  <th className="px-6 py-3 text-right">Besaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {item.provinsi}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {item.satuan}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-900 dark:text-slate-100 font-bold">
                      {formatCurrency(item.besaran)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Standar Biaya Umum (SBU)
          </h1>
          <p className="text-sm text-slate-500">
            Referensi satuan biaya perjalanan dinas Kabupaten Melawi tahun anggaran 2026.
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari dalam tabel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700/50 dark:placeholder:text-slate-500/50 bg-white dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent dark:text-slate-100 dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Perbup Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl text-center space-y-2 shadow-sm">
        <span className="inline-block text-xs font-semibold tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-3 py-1 rounded-full">
          ACUAN PERATURAN RESMI
        </span>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
          BERDASARKAN PERATURAN BUPATI MELAWI TAHUN 2026
          <br />
          TENTANG PERJALANAN DINAS ATAS BEBAN ANGGARAN PENDAPATAN DAN BELANJA DAERAH
        </h2>
      </div>

      {/* Accordions */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {SBU_CATEGORIES.map((category) => {
          const isOpen = activeAccordion === category.tipe;
          const isLoading = loadingCategory[category.tipe];

          return (
            <div key={category.tipe} className="transition-all">
              {/* Header Button */}
              <div
                onClick={() => handleToggleAccordion(category.tipe)}
                className={`flex items-center justify-between p-5 cursor-pointer select-none transition-all hover:bg-slate-50/80 dark:hover:bg-slate-900/30 ${
                  isOpen ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''
                }`}
              >
                <div className="flex-1 pr-6">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {category.title}
                  </h3>
                </div>
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  {/* Download Template */}
                  <a
                    href={`/api/standar-biaya/template/${category.tipe}`}
                    download={category.templateName}
                    title="Unduh Template Excel"
                    className="p-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {/* Upload SBU */}
                  <button
                    onClick={() => openUploadModal(category.tipe)}
                    title="Unggah Data Baru (Excel)"
                    className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 rounded-xl transition-all"
                  >
                    <Upload className="w-4 h-4" />
                  </button>

                  {/* Chevron Toggle */}
                  <button
                    onClick={() => handleToggleAccordion(category.tipe)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                  >
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Accordion Content */}
              {isOpen && (
                <div className="p-6 bg-slate-50/30 dark:bg-slate-900/5 border-t border-slate-100 dark:border-slate-800 transition-all duration-300">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12 gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-sm font-medium">Memuat data standar biaya...</span>
                    </div>
                  ) : (
                    renderTable(category.tipe, categoryData[category.tipe])
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload Confirmation Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !uploading) setUploadModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="flex justify-between items-start p-2 -m-2 rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6" />
                <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">
                  Upload Standar Biaya ({selectedTipe})
                </h3>
              </div>
              <button
                onClick={() => !uploading && setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Unggah dokumen Excel untuk memperbarui data kategori{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  SBU Tipe {selectedTipe}
                </strong>
                . data lama di kategori ini akan digantikan secara penuh.
              </p>
              <div className="text-xs p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <strong>Peringatan:</strong> Pastikan Anda menggunakan file Excel yang diisi
                mengikuti template unduhan agar tidak terjadi error format baris dan kolom.
              </div>
            </div>

            {/* Progress / Feedback Area */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Mengunggah berkas...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {feedback.message && (
              <div
                className={`p-4 rounded-xl flex items-start gap-2.5 text-sm ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Input & Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploading}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <label
                className={`px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl text-sm font-semibold cursor-pointer shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5 ${
                  uploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Pilih Berkas Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandarBiaya;
