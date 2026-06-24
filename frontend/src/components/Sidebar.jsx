import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  FileCheck,
  Printer,
  Settings,
  UserSquare2,
  LogOut,
  Calendar,
  Building,
  Coins,
  ChevronLeft,
  Menu,
  UserCheck,
} from 'lucide-react';
import logoMelawi from '../assets/logo_kab_Melawi.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari aplikasi?');
    if (confirmed) {
      await logout();
      navigate('/login');
    }
  };

  const isAdminOrSuper = user && (user.role === 'admin' || user.role === 'superadmin');

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/pegawai', label: 'Data Pegawai', icon: <Users size={20} /> },
    { path: '/anggaran', label: 'Mata Anggaran', icon: <Wallet size={20} /> },
    { path: '/spt', label: 'Surat Tugas (SPT)', icon: <FileText size={20} /> },
    { path: '/uang-muka', label: 'Panjar (Uang Muka)', icon: <Coins size={20} /> },
    { path: '/buat-laporan', label: 'Laporan Perjadin', icon: <FileCheck size={20} /> },
    { path: '/pembayaran', label: 'Kuitansi & Bayar', icon: <Printer size={20} /> },
    { path: '/laporan-bpk-apip', label: 'Laporan BPK / APIP', icon: <Calendar size={20} /> },
    { path: '/standar-biaya', label: 'Standar Biaya (SBU)', icon: <Building size={20} /> },
    { path: '/daftar-pejabat', label: 'Daftar Pejabat', icon: <UserCheck size={20} /> },
  ];

  const adminItems = [
    { path: '/pengguna', label: 'Manajemen User', icon: <UserSquare2 size={20} /> },
    { path: '/setelan', label: 'Pengaturan Aplikasi', icon: <Settings size={20} /> },
  ];

  //Logika scroll untuk mempengaruhi tampilan tombol log out
  const [isVisible, setVisible] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const containerRef = useRef(null);

  const handleContainerScroll = () => {
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;
    if (currentScrollTop > lastScrollTop) {
      // Scroll ke bawah --> tampilkan
      setVisible(true);
    } else if (currentScrollTop < lastScrollTop) {
      //Scroll ke atas --> sembunyikan
      setVisible(false);
    }
    setLastScrollTop(currentScrollTop);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-mauve-700 text-white flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className="flex flex-col flex-1 overflow-y-auto"
        >
          {/* Header Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b-2 border-slate-300">
            <div className="flex items-center gap-4">
              <div className="py-2 px-3 rounded-full bg-white">
                <img src={logoMelawi} className="bg-white w-6 h-8" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">ASS PERJADIN</h1>
                <p className="text-xs text-slate-300">Pemkab Melawi</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1 text-slate-400 hover:text-white rounded-lg md:hidden"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-3 mb-2">
              Menu Utama
            </div>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-slate-800/60 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-white hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <span className="group-hover:scale-105 transition-transform">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Admin Settings Section */}
            {isAdminOrSuper && (
              <>
                <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-3 mt-6 mb-2">
                  Pengaturan Apl & Peran Pengguna
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-slate-800/60 text-white shadow-lg shadow-indigo-600/20'
                          : 'text-white hover:bg-slate-800/60 hover:text-white'
                      }`
                    }
                  >
                    <span className="group-hover:scale-105 transition-transform">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>
          {/* Profile Card & Logout */}
          <div
            className={`p-4 border-t border-slate-800 sticky bottom-0 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none transition-all duration-300'}`}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center  justify-center gap-2 py-2.5 px-4 rounded-xl text-md font-bold bg-red-600/10 hover:bg-red-800 text-white hover:text-white border transition-all duration-200"
            >
              <LogOut size={16} />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
