import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  FileCheck,
  Settings,
  LogOut,
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

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm(t('sidebar.logout_confirm'));
    if (confirmed) {
      await logout();
      navigate('/login');
    }
  };

  const isAdminOrSuper = user && (user.role === 'admin' || user.role === 'superadmin');

  // Gunakan useMemo agar menu tidak dibuat ulang di setiap render, kecuali saat bahasa berubah
  const menuItems = useMemo(
    () => [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: <LayoutDashboard size={20} /> },
      { path: '/agenda', label: t('sidebar.calendar'), icon: <CalendarDays size={20} /> },
      { path: '/pegawai', label: t('sidebar.employee_data'), icon: <Users size={20} /> },
      { path: '/anggaran', label: t('sidebar.budget'), icon: <Wallet size={20} /> },
      { path: '/spt', label: t('sidebar.assignment_letter'), icon: <FileText size={20} /> },
      { path: '/uang-muka', label: t('sidebar.advance_payment'), icon: <Coins size={20} /> },
      { path: '/buat-laporan', label: t('sidebar.travel_report'), icon: <FileCheck size={20} /> },
      { path: '/pembayaran', label: t('sidebar.payment'), icon: <HandCoins size={20} /> },
      {
        path: '/laporan-bpk-apip',
        label: t('sidebar.audit_report'),
        icon: <img src={HatGlasses} alt="hat-glasses" size={20} className="invert" />,
      },
      {
        path: '/standar-biaya',
        label: t('sidebar.cost_standard'),
        icon: <img src={BookAlert} alt="book-alert" size={20} className="invert" />,
      },
      {
        path: '/daftar-pejabat',
        label: t('sidebar.officials_list'),
        icon: <UserCheck size={20} />,
      },
    ],
    [i18n.language]
  ); // Tambahkan dependency i18n.language

  const adminItems = useMemo(
    () => [
      {
        path: '/pengguna',
        label: t('sidebar.user_management'),
        icon: <img src={ShieldUserIcon} alt="shield-user" className="w-5 h-5 invert" />,
      },
      { path: '/setelan', label: t('sidebar.app_settings'), icon: <Settings size={20} /> },
    ],
    [i18n.language]
  ); // Tambahkan dependency i18n.language

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
              className={`text-xs font-semibold text-slate-300/70 uppercase tracking-wider px-3 mb-2 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'hidden'}`}
            >
              {t('sidebar.main_menu')}
            </div>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5  px-3 pb-[3px] -mr-[15px] group pt-1.5 rounded-2xl text-md font-bold transition-all duration-200 group ${
                    isActive
                      ? 'bg-slate-900/60 text-white shadow-md shadow-yellow-400/20'
                      : 'text-mauve-200  hover:text-white    '
                  }`
                }
              >
                <div className="flex flex-col justify-center items-center">
                  <div className="flex flex-row gap-3 items-center">
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
                  </div>
                  <div className="scale-x-0 group-hover:scale-x-100 origin-center  group-hover:w-full h-[2px] mt-1  bg-slate-200 transition-transform duration-300 ease-in-out"></div>
                </div>
              </NavLink>
            ))}

            {/* Admin Settings Section */}
            {isAdminOrSuper && (
              <>
                <div
                  className={` font-semibold text-slate-300/70 uppercase tracking-wider  mt-6 mb-2 transition-all duration-300 ease-in-out ${isOpen ? 'border-none px-3' : 'border border-slate-300/50 border-2 px-5'}`}
                >
                  <span
                    className={`text-xs transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'hidden'}`}
                  >
                    {t('sidebar.settings_users')}
                  </span>
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 -mr-[15px] py-1.5 pb-[3px] rounded-2xl text-md font-bold transition-all duration-200 group ${
                        isActive
                          ? 'bg-slate-900/60 text-white shadow-md shadow-yellow-400/20'
                          : 'text-slate-200 hover:bg-slate-800/60 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex flex-col justify-center items-center">
                      <div className="flex flex-row gap-3 items-center">
                        <span className="group-hover:scale-105 transition-transform flex-shrink-0">
                          {item.icon}
                        </span>
                        <span
                          className={`transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <div className="scale-x-0 group-hover:scale-x-100 origin-center  group-hover:w-full h-[2px] mt-1  bg-slate-200 transition-transform duration-300 ease-in-out"></div>
                    </div>
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
              className="w-full flex items-center  justify-center gap-2 py-2.5 px-4 rounded-2xl text-md font-bold bg-red-600/10 hover:bg-rose-600/50 text-white hover:text-white border border-slate-200/10 transition-all duration-200"
            >
              <LogOut size={16} className="flex shrink-0" />
              <span
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'hidden'}`}
              >
                {t('sidebar.logout_session')}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
