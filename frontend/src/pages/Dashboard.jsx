import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js';
import {
  Briefcase,
  CalendarDays,
  BadgePercent,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Registrasi modul-modul Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [anggaranList, setAnggaranList] = useState([]);
  const [onDutyPegawai, setOnDutyPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination untuk pegawai yang sedang berdinas
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Ambil statistik umum
      const statsRes = await axios.get('/api/dashboard/stats');
      setStats(statsRes.data);

      // 2. Ambil data anggaran
      const anggaranRes = await axios.get('/api/anggaran?limit=0');
      setAnggaranList(anggaranRes.data.data || []);

      // 3. Ambil data pegawai on-duty (dari SPT aktif bulan ini)
      const sptRes = await axios.get('/api/spt?limit=0');
      const allSpts = sptRes.data || [];

      const now = new Date(statsRes.data.server_time || Date.now());
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

      // Filter pegawai yang sedang dinas bulan ini
      const activeOnDuty = [];
      allSpts.forEach((spt) => {
        const startDate = new Date(spt.tanggal_berangkat);
        const endDate = new Date(spt.tanggal_kembali);
        const canceledPegawaiSet = new Set(spt.pegawai_dibatalkan || []);

        if (spt.status === 'aktif' && startDate <= endOfMonth && endDate >= startOfMonth) {
          // Iterasi melalui setiap pegawai dalam SPT
          if (spt.pegawai && Array.isArray(spt.pegawai)) {
            spt.pegawai.forEach((pegawai) => {
              // Pastikan pegawai tidak ada di daftar yang dibatalkan
              if (!canceledPegawaiSet.has(pegawai.nama_lengkap)) {
                activeOnDuty.push({
                  nama: pegawai.nama_lengkap,
                  nip: pegawai.nip,
                  nomor_surat: spt.nomor_surat,
                  tanggal: `${new Date(spt.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s.d. ${new Date(spt.tanggal_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                });
              }
            });
          }
        }
      });

      setOnDutyPegawai(activeOnDuty);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Gagal memuat beberapa data dashboard. Pastikan koneksi ke API lancar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm font-medium text-slate-500">Memuat dasbor utama...</p>
      </div>
    );
  }

  // Perhitungan Donut Chart
  const totalRealisasi = anggaranList.reduce((sum, a) => sum + (a.realisasi || 0), 0);
  const totalNilaiAnggaran = anggaranList.reduce((sum, a) => sum + (a.nilai_anggaran || 0), 0);
  const totalSisaAnggaran = totalNilaiAnggaran - totalRealisasi;
  const realisasiPersen =
    totalNilaiAnggaran > 0 ? ((totalRealisasi / totalNilaiAnggaran) * 100).toFixed(1) : 0;

  const donutData = {
    labels: [
      ...anggaranList
        .filter((a) => a.realisasi > 0)
        .map((a) => `Realisasi ${a.mata_anggaran_nama}`),
      'Sisa Anggaran',
    ],
    datasets: [
      {
        data: [
          ...anggaranList.filter((a) => a.realisasi > 0).map((a) => a.realisasi),
          totalSisaAnggaran,
        ],
        backgroundColor: [
          '#4e73df',
          '#1cc88a',
          '#36b9cc',
          '#f6c23e',
          '#e74a3b',
          '#858796',
          '#6f42c1',
          '#fd7e14',
          '#0284c7',
          '#4b5563',
          '#e2e8f0', // Warna abu untuk sisa anggaran (item terakhir)
        ]
          .slice(0, anggaranList.filter((a) => a.realisasi > 0).length)
          .concat('#e2e8f0'),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4,
      },
    ],
  };

  const donutOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            const val = context.raw || 0;
            const formatted = new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(val);
            return `Nilai: ${formatted}`;
          },
        },
      },
    },
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // Perhitungan Line Chart
  const lineData = {
    labels:
      stats?.grafikPerjalanan?.labels?.map((l) => {
        const parts = l.split('-');
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'Mei',
          'Jun',
          'Jul',
          'Agt',
          'Sep',
          'Okt',
          'Nov',
          'Des',
        ];
        return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
      }) || [],
    datasets: [
      {
        label: 'Jumlah Perjalanan',
        data: stats?.grafikPerjalanan?.data || [],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  // Paginasi pegawai
  const totalPages = Math.ceil(onDutyPegawai.length / itemsPerPage);
  const paginatedPegawai = onDutyPegawai.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 bg-mauve-100">
      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-start gap-2.5">
          <AlertCircle className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Perjalanan
            </p>
            <h3 className="text-3xl font-extrabold text-slate-800">
              {stats?.totalPerjalanan || 0}
            </h3>
            <p className="text-xs text-slate-500">Tahun Anggaran {new Date().getFullYear()}</p>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform">
            <Briefcase size={24} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Perjalanan Bulan Ini
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600">
              {stats?.perjalananBulanIni || 0}
            </h3>
            <p className="text-xs text-slate-500">Agenda aktif berjalan</p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-105 transition-transform">
            <CalendarDays size={24} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Realisasi Keuangan
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{realisasiPersen}%</h3>
            <p className="text-xs text-slate-500">
              Dari total Rp {new Intl.NumberFormat('id-ID').format(totalNilaiAnggaran)}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <BadgePercent size={24} className="group-hover:scale-110 duration-300 transition-all" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: Anggaran */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[400px]">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-indigo-600" />
            <span>Realisasi vs Sisa Anggaran</span>
          </h4>
          <div className="flex-1 relative flex items-center justify-center min-h-[220px]">
            <div className="w-56 h-56 relative z-10">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800">{realisasiPersen}%</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Telah Terealisasi
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-4 text-center">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Terpakai</p>
              <p className="text-sm font-bold text-slate-800">
                Rp {new Intl.NumberFormat('id-ID').format(totalRealisasi)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Sisa Anggaran</p>
              <p className="text-sm font-bold text-slate-500">
                Rp {new Intl.NumberFormat('id-ID').format(totalSisaAnggaran)}
              </p>
            </div>
          </div>
        </div>

        {/* Line Chart: Perjalanan */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-indigo-600" />
            <span>Statistik Perjalanan Dinas (12 Bulan Terakhir)</span>
          </h4>
          <div className="flex-1 min-h-[280px]">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* Table Section: On Duty Employees */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h4 className="text-base font-bold text-slate-800 mb-4">
          Pegawai yang Sedang Berdinas Bulan Ini
        </h4>
        {onDutyPegawai.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Tidak ada pegawai yang sedang bertugas bulan ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase text-center tracking-wider w-16">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nama Pegawai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    NIP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nomor SPT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Periode Dinas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedPegawai.map((pegawai, index) => (
                  <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 pl-0 py-3 text-center text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{pegawai.nama}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{pegawai.nip || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{pegawai.nomor_surat}</td>
                    <td className="px-4 py-3 text-slate-600">{pegawai.tanggal}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                <span className="text-xs text-slate-400">
                  Menampilkan {paginatedPegawai.length} dari {onDutyPegawai.length} data
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  >
                    Berikutnya
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

export default Dashboard;
