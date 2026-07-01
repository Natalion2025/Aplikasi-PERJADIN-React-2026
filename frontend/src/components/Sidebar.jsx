import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  FileCheck,
  Settings,
  LogOut,
  Calendar,
  Building,
  Coins,
  ChevronLeft,
  UserCheck,
  CalendarDays,
  HandCoins,
} from 'lucide-react';
import logoMelawi from '../assets/logo_kab_Melawi.png';
import ShieldUserIcon from '../assets/shield-user.svg';
import HatGlasses from '../assets/hat-glasses.svg';
import BookAlert from '../assets/book-alert.svg';
import { Title } from 'chart.js';

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
    { path: '/agenda', label: 'Agenda / Kalender', icon: <CalendarDays size={20} /> },
    { path: '/pegawai', label: 'Data Pegawai', icon: <Users size={20} /> },
    { path: '/anggaran', label: 'Mata Anggaran', icon: <Wallet size={20} /> },
    { path: '/spt', label: 'Surat Tugas (SPT)', icon: <FileText size={20} /> },
    { path: '/uang-muka', label: 'Panjar (Uang Muka)', icon: <Coins size={20} /> },
    { path: '/buat-laporan', label: 'Laporan Perjadin', icon: <FileCheck size={20} /> },
    { path: '/pembayaran', label: 'Pembayaran', icon: <HandCoins size={20} /> },
    {
      path: '/laporan-bpk-apip',
      label: 'Laporan BPK / APIP',
      icon: <img src={HatGlasses} alt="hat-glasses" size={20} className="invert" />,
    },
    {
      path: '/standar-biaya',
      label: 'Standar Biaya (SBU)',
      icon: <img src={BookAlert} alt="book-alert" size={20} className="invert" />,
    },
    { path: '/daftar-pejabat', label: 'Daftar Pejabat', icon: <UserCheck size={20} /> },
  ];

  const adminItems = [
    {
      path: '/pengguna',
      label: 'Manajemen User',
      icon: <img src={ShieldUserIcon} alt="shield-user" className="w-5 h-5 invert" />,
    },
    { path: '/setelan', label: 'Pengaturan Aplikasi', icon: <Settings size={20} /> },
  ];

  // Logika scroll untuk menyembunyikan/menampilkan tombol logout
  const [isLogoutVisible, setIsLogoutVisible] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const containerRef = useRef(null);
  const SCROLL_THRESHOLD = 5; // Jarak scroll minimal untuk memicu hide/show

  const handleContainerScroll = () => {
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;

    if (Math.abs(currentScrollTop - lastScrollTop) <= SCROLL_THRESHOLD) return;

    // Sembunyikan saat scroll ke bawah, tampilkan saat scroll ke atas
    if (currentScrollTop > lastScrollTop) {
      setIsLogoutVisible(false);
    } else {
      setIsLogoutVisible(true);
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
        className={`fixed top-0 left-0 z-50 h-screen bg-mauve-700 text-white flex flex-col justify-between transition-all duration-300 ease-in-out no-print ${
          isOpen ? 'w-72' : 'w-72 md:w-20'
        } md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className="flex flex-col flex-1 overflow-y-auto"
        >
          {/* Header Logo */}
          <div
            className={`flex items-center justify-between pr-4 pl-2 py-4 border-b-2 border-slate-300 ${isOpen ? 'py-4' : 'py-5'}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={` rounded-full bg-white transition-transform duration-200 shadow-xl shadow-yellow-300/50 ring-2 ring-yellow-200/70 ring-offset-1 ring-offset-mauve-700 ${isOpen ? 'py-2 px-3' : 'py-1 px-2'}`}
              >
                <img src={logoMelawi} className="bg-white w-6 h-8" />
              </div>
              <div
                className={`transition-opacity duration-200 ${
                  isOpen ? 'opacity-100' : 'opacity-0 md:hidden'
                }`}
              >
                <h1 className="font-bold text-lg leading-tight tracking-wide whitespace-nowrap">
                  ASS PERJADIN
                </h1>
                <p className="text-xs text-slate-300 whitespace-nowrap">Pemkab Melawi</p>
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
          <nav className="flex-1 pr-7 pl-[13px] -ml-1  py-6 space-y-1.5">
            <div
              className={`text-xs font-semibold text-slate-300 uppercase tracking-wider px-3 mb-2 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'hidden'}`}
            >
              Menu Utama
            </div>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5  px-3 -mr-[15px]  py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-slate-800/60 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-white hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <span
                  className="group-hover:scale-105 transition-transform flex-shrink-0"
                  title={isOpen ? '' : item.label}
                >
                  {item.icon}
                </span>
                <span
                  className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}
                >
                  {item.label}
                </span>
              </NavLink>
            ))}

            {/* Admin Settings Section */}
            {isAdminOrSuper && (
              <>
                <div
                  className={` font-semibold text-slate-300 uppercase tracking-wider  mt-6 mb-2 transition-all duration-300 ease-in-out ${isOpen ? 'border-none px-3' : 'border border-slate-300/50 border-2 px-5'}`}
                >
                  <span
                    className={`text-xs transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'hidden'}`}
                  >
                    Pengaturan & Pengguna
                  </span>
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 -mr-[15px] py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-slate-800/60 text-white shadow-lg shadow-indigo-600/20'
                          : 'text-white hover:bg-slate-800/60 hover:text-white'
                      }`
                    }
                  >
                    <span className="group-hover:scale-105 transition-transform flex-shrink-0">
                      {item.icon}
                    </span>
                    <span
                      className={`transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}
                    >
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>
          {/* Profile Card & Logout */}
          <div
            className={`p-4 border-t border-slate-800 sticky bottom-0 bg-mauve-700 transition-all duration-300 ease-in-out ${
              isLogoutVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center  justify-center gap-2 py-2.5 px-4 rounded-xl text-md font-bold bg-red-600/10 hover:bg-red-800 text-white hover:text-white border transition-all duration-200"
            >
              <LogOut size={16} className="flex shrink-0" />
              <span
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'hidden'}`}
              >
                Keluar Sesi
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
