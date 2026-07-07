import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Printer,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Plane,
  Building,
  Coins,
  Wallet,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'Rp 0';
  let number;
  if (typeof value === 'number') {
    number = value;
  } else {
    const str = String(value).trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      number = parseFloat(str);
    } else {
      const cleaned = str.replace(/[^0-9,-]/g, '').replace(',', '.');
      number = parseFloat(cleaned);
    }
  }
  if (isNaN(number)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const LaporanBpkApip = () => {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'transport', 'accomodation', 'meal', 'other'
  const [direction, setDirection] = useState('berangkat'); // 'berangkat' or 'kembali' (for transport tab)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data State
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Ekstraksi informasi tab ke dalam struktur data
  const TABS = [
    { id: 'basic', label: 'Informasi Dasar', icon: Info, endpoint: '/api/laporan-bpk-apip' },
    {
      id: 'transport',
      label: 'Transportasi',
      icon: Plane,
      endpoint: '/api/laporan-bpk-apip/transportasi',
    },
    {
      id: 'accomodation',
      label: 'Penginapan',
      icon: Building,
      endpoint: '/api/laporan-bpk-apip/akomodasi',
    },
    {
      id: 'meal',
      label: 'Uang Harian',
      icon: Coins,
      endpoint: '/api/laporan-bpk-apip/uang-harian',
    },
    {
      id: 'other',
      label: 'Biaya Lain-lain',
      icon: Wallet,
      endpoint: '/api/laporan-bpk-apip/lain-lain',
    },
  ];

  // Header tabel untuk setiap tab
  const TABLE_HEADERS = {
    basic: [
      'No',
      'Nama & Jabatan',
      'Pangkat/Gol',
      'No. Surat Tugas',
      'No. SPD',
      'Tgl Mulai - Selesai',
      'Nama Kegiatan',
      'Jenis Perjadin',
    ],
    transport: [
      'No',
      'Nama & Jabatan',
      'No. Surat Tugas',
      'Maskapai',
      'No. Penerbangan',
      'No. Tiket',
      'Rute (Terminal)',
      'Tarif',
    ],
    accomodation: [
      'No',
      'Nama & Jabatan',
      'No. Surat Tugas',
      'Nama Hotel',
      'Nama Kota',
      'Tgl. Check-In/Out',
      'Malam',
      'Tarif',
      'Jumlah',
    ],
    meal: [
      'No',
      'Nama & Jabatan',
      'Nomor Surat Tugas',
      'Hari',
      'Tarif Uang Harian',
      'Total Uang Harian',
      'Uang Representatif',
    ],
    other: [
      'No',
      'Nama & Jabatan',
      'Nomor Surat Tugas',
      'Jenis Biaya',
      'Hari',
      'Tarif Satuan',
      'Total',
      'Keterangan',
    ],
  };

  // Komponen untuk merender baris tabel agar lebih bersih
  const TableRow = ({ item, index, page, limit, activeTab }) => {
    const rowNumber = (page - 1) * limit + index + 1;
    switch (activeTab) {
      case 'basic':
        return <BasicRow item={item} rowNumber={rowNumber} />;
      case 'transport':
        return <TransportRow item={item} rowNumber={rowNumber} />;
      case 'accomodation':
        return <AccomodationRow item={item} rowNumber={rowNumber} />;
      case 'meal':
        return <MealRow item={item} rowNumber={rowNumber} />;
      case 'other':
        return <OtherRow item={item} rowNumber={rowNumber} />;
      default:
        return null;
    }
  };

  // Fetch data depending on activeTab & direction
  useEffect(() => {
    fetchData();
  }, [activeTab, direction, page, limit]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const currentTab = TABS.find((t) => t.id === activeTab);
      if (!currentTab) {
        throw new Error(`Tab dengan id "${activeTab}" tidak ditemukan.`);
      }

      const endpoint = currentTab.endpoint;
      let params = { page, limit };

      if (activeTab === 'transport') {
        params.arah = direction;
      }

      const res = await axios.get(endpoint, { params });
      if (res.data) {
        setData(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data laporan audit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              LAPORAN BPK & APIP
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hasil rekap audit perjalanan dinas Pemkab Melawi terperinci.
            </p>
          </div>
          <a
            href="/cetak/laporan-bpk"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-mauve-100 hover:bg-mauve-200 text-mauve-700 rounded-2xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all duration-200 self-end sm:self-auto"
          >
            <Printer size={16} />
            <span>Cetak Rekap BPK</span>
          </a>
        </div>

        {/* Tab Switching & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-100 dark:border-slate-600 pb-2 gap-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-4 py-2.5 text-xs font-bold uppercase rounded-t-2xl rounded-l-none transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-mauve-500 dark:bg-slate-100 text-white dark:text-mauve-700'
                    : 'text-slate-600 hover:bg-mauve-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 self-end xl:self-auto">
            {activeTab === 'transport' && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => {
                    setDirection('berangkat');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    direction === 'berangkat'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Berangkat
                </button>
                <button
                  onClick={() => {
                    setDirection('kembali');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    direction === 'kembali'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kembali
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-semibold">Tampilkan:</span>
              <div className="px-1 py-1.5 dark:bg-slate-900 bg-white  dark:border-slate-700 border border-slate-200 rounded-xl focus:ring-mauve-500 focus:ring-2 dark:focus-within:ring-emerald-600/20 dark:focus-within:border-emerald-500">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className=" text-sm dark:bg-slate-900 dark:text-slate-200 text-slate-600 outline-none "
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

        {/* Table Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Memuat Data Audit...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 border border-rose-100 bg-rose-50/20 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="overflow-x-auto rounded-2xl rounded-b-none">
              <table className="min-w-full divide-y divide-slate-100 text-slate-600 dark:bg-slate-800 text-xs">
                <thead className="uppercase">
                  <tr className="bg-mauve-500 dark:bg-slate-600/60 dark:text-slate-200 text-slate-100 border-b-2 border-mauve-500 dark:border-slate-600/60 border-double font-bold tracking-wider">
                    {TABLE_HEADERS[activeTab].map((header, i) => (
                      <th
                        key={i}
                        className={`py-3 px-4 shadow-[inset_0_-2px_0_0_#ffffff] dark:shadow-[inset_0_-2px_0_0_#1e293b] ${i === 0 ? 'text-center w-12' : 'text-left'}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-slate-600">
                  {data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={TABLE_HEADERS[activeTab].length}
                        className="py-10 text-center text-slate-400 "
                      >
                        Tidak ada data untuk kategori ini.
                      </td>
                    </tr>
                  ) : (
                    data.map((item, idx) => (
                      <TableRow
                        key={`${item.id || 'item'}-${item.pegawai_id || idx}`}
                        item={item}
                        index={idx}
                        page={page}
                        limit={limit}
                        activeTab={activeTab}
                        className="dark:text-slate-400"
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Audit List */}
            {!loading && totalItems > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-600 pt-4 px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Menampilkan Halaman <span className="font-bold text-slate-500">{page}</span> dari{' '}
                  <span className="font-bold text-slate-500">{totalPages}</span> ({totalItems} total
                  data)
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => setPage(num)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                          page === num
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50"
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
    </div>
  );
};

const BasicRow = ({ item, rowNumber }) => (
  <tr className="dark:hover:bg-slate-700/30 transition-colors ">
    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200 text-sm align-top">
      {rowNumber}.
    </td>
    <td className="py-3 px-4 align-top">
      <span className="font-semibold text-slate-700 dark:text-slate-200 block text-xs ">
        {item.nama_lengkap}
      </span>
      <span
        className="text-[10px] text-slate-500 dark:text-slate-400 text-xs block truncate max-w-[150px]"
        title={item.jabatan}
      >
        {item.jabatan}
      </span>
    </td>
    <td className="py-3 px-4 font-medium flex flex-col text-slate-700 align-top text-xs">
      <span className="whitespace-nowrap dark:text-slate-200">{item.pangkat}</span>
      <span className="text-slate-500 text-xs dark:text-slate-400">{item.golongan}</span>
    </td>
    <td className="py-3 px-4 font-medium text-xs text-slate-700 align-top dark:text-slate-200">
      {item.nomor_surat}
    </td>
    <td className="py-3 px-4 font-medium text-xs text-slate-700 align-top dark:text-slate-200">
      {item.nomor_sppd || '-'}
    </td>
    <td className="py-3 px-4 whitespace-nowrap align-top">
      <span className="text-slate-700 dark:text-slate-200 font-medium block text-xs">
        {formatDate(item.tanggal_berangkat)}
      </span>
      <span className="text-xs text-slate-700 dark:text-slate-200 block font-medium">
        s/d {formatDate(item.tanggal_kembali)}
      </span>
    </td>
    <td
      className="py-3 px-4 max-w-[180px] truncate text-xs font-medium text-slate-700 dark:text-slate-200 align-top"
      title={item.maksud_perjalanan}
    >
      {item.maksud_perjalanan}
    </td>
    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 align-top text-xs whitespace-nowrap">
      {item.mata_anggaran_nama ? 'Dalam Daerah' : 'Luar Daerah'}
    </td>
  </tr>
);

const TransportRow = ({ item, rowNumber }) => (
  <tr className="dark:hover:bg-slate-700/30 transition-colors">
    <td className="py-3 px-4 text-center font-medium text-sm text-slate-700 dark:text-slate-200 align-top">
      {rowNumber}.
    </td>
    <td className="py-3 px-4 align-top">
      <span className="font-semibold text-slate-700 dark:text-slate-200 block text-xs">
        {item.nama_lengkap}
      </span>
      <span
        className="text-xs text-slate-500 dark:text-slate-400 block truncate max-w-[140px]"
        title={item.jabatan}
      >
        {item.jabatan}
      </span>
    </td>
    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-200 align-top">
      {item.nomor_surat}
    </td>
    <td className="py-3 px-4 font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {item.perusahaan}
    </td>
    <td className="py-3 px-4 align-top">
      <span className="text-slate-700 dark:text-slate-200 block font-medium text-xs">
        {item.kode_boking || '-'}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 block">
        {item.nomor_penerbangan || '-'}
      </span>
    </td>
    <td className="py-3 px-4 text-xs align-top">
      <span className="text-slate-700 font-medium block dark:text-slate-200">
        {item.nomor_tiket || '-'}
      </span>
      <span className=" text-slate-500 block font-medium dark:text-slate-200">
        {item.tanggal_tiket ? formatDate(item.tanggal_tiket) : '-'}
      </span>
    </td>
    <td className="py-3 px-4 whitespace-nowrap text-xs align-top">
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {item.terminal_berangkat || '-'}
      </span>
      <span className="text-slate-500 mx-1 dark:text-slate-200">→</span>
      <span className="text-slate-700 font-medium dark:text-slate-200">
        {item.terminal_tiba || '-'}
      </span>
    </td>
    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200 text-xs align-top">
      {formatCurrency(item.nominal)}
    </td>
  </tr>
);

const AccomodationRow = ({ item, rowNumber }) => (
  <tr className="dark:hover:bg-slate-700/30 transition-colors">
    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200 text-sm align-top">
      {rowNumber}.
    </td>
    <td className="py-3 px-4 align-top">
      <span className="font-semibold text-slate-700 block text-xs dark:text-slate-200">
        {item.nama_lengkap}
      </span>
      <span className="text-xs text-slate-700 dark:text-slate-400 block truncate max-w-[140px]">
        {item.jabatan}
      </span>
    </td>
    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-200 font-medium align-top">
      {item.nomor_surat}
    </td>
    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-200 font-medium align-top">
      {item.nama_hotel || '-'}
    </td>
    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-200 font-medium align-top">
      {item.lokasi_hotel || '-'}
    </td>
    <td className="py-3 px-4 text-xs align-top">
      <span className="text-slate-700 dark:text-slate-200 block">
        {formatDate(item.tanggal_checkIn)}
      </span>
      <span className="text-xs text-slate-700 dark:text-slate-200 block font-medium">
        s/d {formatDate(item.tanggal_checkOut)}
      </span>
    </td>
    <td className="py-3 px-4 text-center text-xs font-medium text-slate-700 dark:text-slate-200 align-top">
      {item.malam || 0}
    </td>
    <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-200 align-top">
      {formatCurrency(item.harga_satuan)}
    </td>
    <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-200 align-top">
      {formatCurrency(item.total_harga)}
    </td>
  </tr>
);

const MealRow = ({ item, rowNumber }) => (
  <tr className="dark:hover:bg-slate-700/30 transition-colors">
    <td className="py-3 px-4 text-center font-medium text-sm text-slate-700 dark:text-slate-200 align-top">
      {rowNumber}.
    </td>
    <td className="py-3 px-4 align-top">
      <span className="font-semibold text-slate-700 dark:text-slate-200 block text-xs">
        {item.nama_lengkap}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 block truncate max-w-[150px]">
        {item.jabatan}
      </span>
    </td>
    <td className="py-3 px-4 font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {item.nomor_surat}
    </td>
    <td className="py-3 px-4 text-center font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {item.jumlah_hari || 0}
    </td>
    <td className="py-3 px-4 text-right font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {formatCurrency(item.tarif_satuan)}
    </td>
    <td className="py-3 px-4 text-right font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {formatCurrency(item.total)}
    </td>
    <td className="py-3 px-4 text-right font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {formatCurrency(item.biaya_representatif)}
    </td>
  </tr>
);

const OtherRow = ({ item, rowNumber }) => (
  <tr className="dark:hover:bg-slate-700/30 transition-colors">
    <td className="py-3 px-4 text-center font-medium text-sm text-slate-700 dark:text-slate-200 align-top">
      {rowNumber}.
    </td>
    <td className="py-3 px-4 align-top">
      <span className="font-semibold text-slate-700 dark:text-slate-200 block text-xs">
        {item.nama_lengkap}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 block truncate max-w-[140px]">
        {item.jabatan}
      </span>
    </td>
    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-200 font-medium align-top">
      {item.nomor_surat}
    </td>
    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-200 font-medium align-top">
      {item.uraian || '-'}
    </td>
    <td className="py-3 px-4 text-center text-xs font-medium text-slate-700 dark:text-slate-200 align-top">
      {item.jumlah_hari || '-'}
    </td>
    <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-200 align-top">
      {item.tarif_satuan > 0 ? formatCurrency(item.tarif_satuan) : '-'}
    </td>
    <td className="py-3 px-4 text-right font-medium text-xs text-slate-700 dark:text-slate-200 align-top">
      {formatCurrency(item.total)}
    </td>
    <td
      className="py-3 px-4 text-slate-700 dark:text-slate-200 text-left font-medium italic text-xs truncate align-top max-w-[150px]"
      title={item.keterangan}
    >
      {item.keterangan || '-'}
    </td>
  </tr>
);

export default LaporanBpkApip;
