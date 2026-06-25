import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Pegawai from './pages/Pegawai';
import Anggaran from './pages/Anggaran';
import SptRegister from './pages/SptRegister';
import TambahSpt from './pages/TambahSpt';
import UangMuka from './pages/UangMuka';
import BuatLaporan from './pages/BuatLaporan';
import Pembayaran from './pages/Pembayaran';
import LaporanBpkApip from './pages/LaporanBpkApip';
import StandarBiaya from './pages/StandarBiaya';
import Pengguna from './pages/Pengguna';
import DaftarPejabat from './pages/DaftarPejabat';
import Profil from './pages/Profil';
import Setelan from './pages/Setelan';

import {
  CetakSPT,
  CetakSPPD,
  CetakVisum,
  CetakPanjar,
  CetakPembayaran,
  CetakPengeluaranRiil,
  CetakPembatalan,
  CetakLaporan,
  CetakLaporanBpk
} from './pages/print/CetakPages';

// Wrapper ProtectedRoute untuk mengamankan akses halaman
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memuat Sesi...</span>
                </div>
            </div>
        );
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

// Layout Utama (Sidebar + Header + Page Container)
const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    
    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            
            {/* Area Konten Utama */}
            <div className="flex-1 flex flex-col md:pl-72 min-h-screen">
                {/* Header */}
                <Header toggleSidebar={toggleSidebar} />
                
                {/* Halaman Konten */}
                <main className="flex-1 bg-mauve-100 p-6 md:p-8 max-w-7xl w-full mx-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/pegawai" element={<Pegawai />} />
                        <Route path="/anggaran" element={<Anggaran />} />
                        <Route path="/spt" element={<SptRegister />} />
                        <Route path="/tambah-spt" element={<TambahSpt />} />
                        <Route path="/edit-spt/:id" element={<TambahSpt />} />
                        <Route path="/uang-muka" element={<UangMuka />} />
                        <Route path="/buat-laporan" element={<BuatLaporan />} />
                        <Route path="/pembayaran" element={<Pembayaran />} />
                        <Route path="/laporan-bpk-apip" element={<LaporanBpkApip />} />
                        <Route path="/standar-biaya" element={<StandarBiaya />} />
                        <Route path="/daftar-pejabat" element={<DaftarPejabat />} />
                        <Route path="/pengguna" element={<Pengguna />} />
                        <Route path="/profil" element={<Profil />} />
                        <Route path="/setelan" element={<Setelan />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <Routes>
                    {/* Rute Publik */}
                    <Route path="/login" element={<Login />} />
                    
                    {/* Rute Cetak Mandiri (Tanpa Sidebar/Header) */}
                    <Route path="/cetak/spt/:id" element={<ProtectedRoute><CetakSPT /></ProtectedRoute>} />
                    <Route path="/cetak/sppd/:spt_id/:pegawai_id" element={<ProtectedRoute><CetakSPPD /></ProtectedRoute>} />
                    <Route path="/cetak/sppd/:spt_id" element={<ProtectedRoute><CetakSPPD /></ProtectedRoute>} />
                    <Route path="/cetak/sppd-detail/:sppd_id" element={<ProtectedRoute><CetakSPPD /></ProtectedRoute>} />
                    <Route path="/cetak/visum/:spt_id" element={<ProtectedRoute><CetakVisum /></ProtectedRoute>} />
                    <Route path="/cetak/panjar/:id" element={<ProtectedRoute><CetakPanjar /></ProtectedRoute>} />
                    <Route path="/cetak/pembayaran/:id" element={<ProtectedRoute><CetakPembayaran /></ProtectedRoute>} />
                    <Route path="/cetak/pengeluaran-riil/:id" element={<ProtectedRoute><CetakPengeluaranRiil /></ProtectedRoute>} />
                    <Route path="/cetak/pembatalan/:id" element={<ProtectedRoute><CetakPembatalan /></ProtectedRoute>} />
                    <Route path="/cetak/laporan/:id" element={<ProtectedRoute><CetakLaporan /></ProtectedRoute>} />
                    <Route path="/cetak/laporan-bpk" element={<ProtectedRoute><CetakLaporanBpk /></ProtectedRoute>} />
                    
                    {/* Proteksi Semua Rute Dasbor */}
                    <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
                </Routes>
            </AuthProvider>
        </Router>
    );
};

export default App;
