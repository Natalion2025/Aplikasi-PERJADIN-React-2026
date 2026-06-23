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
  ArrowRightLeft
} from 'lucide-react';

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

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'Rp 0';
    const number = parseFloat(String(value).replace(/[^0-9,-]+/g, '').replace(',', '.'));
    if (isNaN(number)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Fetch data depending on activeTab & direction
  useEffect(() => {
    fetchData();
  }, [activeTab, direction, page, limit]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '/api/laporan-bpk-apip';
      let params = { page, limit };

      if (activeTab === 'transport') {
        endpoint = '/api/laporan-bpk-apip/transportasi';
        params.arah = direction;
      } else if (activeTab === 'accomodation') {
        endpoint = '/api/laporan-bpk-apip/akomodasi';
      } else if (activeTab === 'meal') {
        endpoint = '/api/laporan-bpk-apip/uang-harian';
      } else if (activeTab === 'other') {
        endpoint = '/api/laporan-bpk-apip/lain-lain';
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
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">LAPORAN BPK & APIP</h1>
            <p className="text-sm text-slate-500">Hasil rekap audit perjalanan dinas Pemkab Melawi terperinci.</p>
          </div>
          <a
            href="/cetak/laporan-bpk"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all duration-200 self-end sm:self-auto"
          >
            <Printer size={16} />
            <span>Cetak Rekap BPK</span>
          </a>
        </div>

        {/* Tab Switching & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-100 pb-2 gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveTab('basic'); setPage(1); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'basic' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Info size={14} />
              <span>Informasi Dasar</span>
            </button>
            <button
              onClick={() => { setActiveTab('transport'); setPage(1); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'transport' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Plane size={14} />
              <span>Transportasi</span>
            </button>
            <button
              onClick={() => { setActiveTab('accomodation'); setPage(1); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'accomodation' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Building size={14} />
              <span>Penginapan</span>
            </button>
            <button
              onClick={() => { setActiveTab('meal'); setPage(1); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'meal' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Coins size={14} />
              <span>Uang Harian</span>
            </button>
            <button
              onClick={() => { setActiveTab('other'); setPage(1); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'other' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Wallet size={14} />
              <span>Biaya Lain-lain</span>
            </button>
          </div>

          <div className="flex items-center gap-3 self-end xl:self-auto">
            {activeTab === 'transport' && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => { setDirection('berangkat'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    direction === 'berangkat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Berangkat
                </button>
                <button
                  onClick={() => { setDirection('kembali'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    direction === 'kembali' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kembali
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>5</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Memuat Data Audit...</p>
          </div>
        ) : error ? (
          <div className="p-4 border border-rose-100 bg-rose-50/20 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                
                {/* 1. INFORMASI DASAR TAB */}
                {activeTab === 'basic' && (
                  <>
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-12">No</th>
                        <th className="py-3.5 px-4">Nama & Jabatan</th>
                        <th className="py-3.5 px-4">Pangkat/Gol</th>
                        <th className="py-3.5 px-4">No. Surat Tugas</th>
                        <th className="py-3.5 px-4">No. SPD</th>
                        <th className="py-3.5 px-4">Tgl Mulai - Selesai</th>
                        <th className="py-3.5 px-4">Nama Kegiatan</th>
                        <th className="py-3.5 px-4">Jenis Perjadin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada data audit dasar.</td>
                        </tr>
                      ) : (
                        data.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-4 text-center font-medium text-slate-400">{(page - 1) * limit + idx + 1}.</td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800 block text-xs">{item.nama_lengkap}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[150px]" title={item.jabatan}>{item.jabatan}</span>
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-600">{item.pangkat ? `${item.pangkat} / ${item.golongan}` : '-'}</td>
                            <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{item.nomor_surat}</td>
                            <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{item.nomor_sppd || '-'}</td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-slate-600 block">{formatDate(item.tanggal_berangkat)}</span>
                              <span className="text-[10px] text-slate-400 block font-medium">s/d {formatDate(item.tanggal_kembali)}</span>
                            </td>
                            <td className="py-4 px-4 max-w-[180px] truncate text-slate-500" title={item.maksud_perjalanan}>{item.maksud_perjalanan}</td>
                            <td className="py-4 px-4 font-semibold text-slate-600">{item.mata_anggaran_nama ? 'Dalam Daerah' : 'Luar Daerah'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}

                {/* 2. TRANSPORTASI TAB */}
                {activeTab === 'transport' && (
                  <>
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-12">No</th>
                        <th className="py-3.5 px-4">Nama & Jabatan</th>
                        <th className="py-3.5 px-4">Nomor Surat Tugas</th>
                        <th className="py-3.5 px-4">Maskapai/Perusahaan</th>
                        <th className="py-3.5 px-4">Booking & Penerbangan</th>
                        <th className="py-3.5 px-4">No. & Tgl. Tiket</th>
                        <th className="py-3.5 px-4">Rute (Terminal)</th>
                        <th className="py-3.5 px-4 text-right">Tarif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada data transportasi.</td>
                        </tr>
                      ) : (
                        data.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-4 text-center font-medium text-slate-400">{(page - 1) * limit + idx + 1}.</td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800 block text-xs">{item.nama_lengkap}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]" title={item.jabatan}>{item.jabatan}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{item.nomor_surat}</td>
                            <td className="py-4 px-4 font-semibold text-slate-700">{item.perusahaan}</td>
                            <td className="py-4 px-4">
                              <span className="text-slate-800 block font-bold text-xs">{item.kode_boking || '-'}</span>
                              <span className="text-[10px] text-slate-400 block">{item.nomor_penerbangan || '-'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-slate-600 block">{item.nomor_tiket || '-'}</span>
                              <span className="text-[10px] text-slate-400 block font-medium">{item.tanggal_tiket ? formatDate(item.tanggal_tiket) : '-'}</span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-slate-700 font-semibold">{item.terminal_berangkat || '-'}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="text-slate-700 font-semibold">{item.terminal_tiba || '-'}</span>
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">{formatCurrency(item.nominal)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}

                {/* 3. PENGINAPAN TAB */}
                {activeTab === 'accomodation' && (
                  <>
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-12">No</th>
                        <th className="py-3.5 px-4">Nama & Jabatan</th>
                        <th className="py-3.5 px-4">Nomor Surat Tugas</th>
                        <th className="py-3.5 px-4">Nama Hotel</th>
                        <th className="py-3.5 px-4">Nama Kota</th>
                        <th className="py-3.5 px-4">Tgl Check-In / Out</th>
                        <th className="py-3.5 px-4 text-center">Malam</th>
                        <th className="py-3.5 px-4 text-right">Tarif</th>
                        <th className="py-3.5 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400">Tidak ada data penginapan.</td>
                        </tr>
                      ) : (
                        data.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-4 text-center font-medium text-slate-400">{(page - 1) * limit + idx + 1}.</td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800 block text-xs">{item.nama_lengkap}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{item.jabatan}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{item.nomor_surat}</td>
                            <td className="py-4 px-4 font-semibold text-slate-700">{item.nama_hotel || '-'}</td>
                            <td className="py-4 px-4 text-slate-600 font-medium">{item.lokasi_hotel || '-'}</td>
                            <td className="py-4 px-4">
                              <span className="text-slate-600 block">{formatDate(item.tanggal_checkIn)}</span>
                              <span className="text-[10px] text-slate-400 block font-medium">s/d {formatDate(item.tanggal_checkOut)}</span>
                            </td>
                            <td className="py-4 px-4 text-center font-bold text-slate-700">{item.malam || 0}</td>
                            <td className="py-4 px-4 text-right font-medium text-slate-500">{formatCurrency(item.harga_satuan)}</td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">{formatCurrency(item.total_harga)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}

                {/* 4. UANG HARIAN TAB */}
                {activeTab === 'meal' && (
                  <>
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-12">No</th>
                        <th className="py-3.5 px-4">Nama & Jabatan</th>
                        <th className="py-3.5 px-4">Nomor Surat Tugas</th>
                        <th className="py-3.5 px-4 text-center">Hari</th>
                        <th className="py-3.5 px-4 text-right">Tarif Uang Harian</th>
                        <th className="py-3.5 px-4 text-right">Total Uang Harian</th>
                        <th className="py-3.5 px-4 text-right">Uang Representatif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">Tidak ada data uang harian.</td>
                        </tr>
                      ) : (
                        data.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-4 text-center font-medium text-slate-400">{(page - 1) * limit + idx + 1}.</td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800 block text-xs">{item.nama_lengkap}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{item.jabatan}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{item.nomor_surat}</td>
                            <td className="py-4 px-4 text-center font-bold text-slate-700">{item.jumlah_hari || 0}</td>
                            <td className="py-4 px-4 text-right font-medium text-slate-500">{formatCurrency(item.tarif_satuan)}</td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">{formatCurrency(item.total)}</td>
                            <td className="py-4 px-4 text-right font-bold text-emerald-600">{formatCurrency(item.biaya_representatif)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}

                {/* 5. BIAYA LAIN-LAIN TAB */}
                {activeTab === 'other' && (
                  <>
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-12">No</th>
                        <th className="py-3.5 px-4">Nama & Jabatan</th>
                        <th className="py-3.5 px-4">Nomor Surat Tugas</th>
                        <th className="py-3.5 px-4">Jenis Biaya</th>
                        <th className="py-3.5 px-4 text-center">Hari</th>
                        <th className="py-3.5 px-4 text-right">Tarif Satuan</th>
                        <th className="py-3.5 px-4 text-right">Total</th>
                        <th className="py-3.5 px-4">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada data biaya lain-lain.</td>
                        </tr>
                      ) : (
                        data.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-4 text-center font-medium text-slate-400">{(page - 1) * limit + idx + 1}.</td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800 block text-xs">{item.nama_lengkap}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{item.jabatan}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{item.nomor_surat}</td>
                            <td className="py-4 px-4 text-slate-700 font-semibold">{item.uraian || '-'}</td>
                            <td className="py-4 px-4 text-center font-bold text-slate-700">{item.jumlah_hari || '-'}</td>
                            <td className="py-4 px-4 text-right font-medium text-slate-500">{item.tarif_satuan > 0 ? formatCurrency(item.tarif_satuan) : '-'}</td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">{formatCurrency(item.total)}</td>
                            <td className="py-4 px-4 text-slate-500 italic text-[11px] truncate max-w-[150px]" title={item.keterangan}>{item.keterangan || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}

              </table>
            </div>

            {/* Pagination Audit List */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-1">
                <span className="text-xs text-slate-400 font-medium">
                  Menampilkan <span className="font-bold">{data.length}</span> dari <span className="font-bold">{totalItems}</span> baris rekap
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
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
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaporanBpkApip;
