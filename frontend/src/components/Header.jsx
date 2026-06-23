import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Bell, 
  Menu, 
  User, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react';

const Header = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notifCount, setNotifCount] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Ambil jumlah notifikasi SPT aktif dari API
    const fetchNotifCount = async () => {
        try {
            const response = await axios.get('/api/spt/active-count');
            setNotifCount(response.data.count || 0);
        } catch (error) {
            console.warn('[Header] Gagal mengambil notifikasi:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifCount();
            // Poll notifikasi setiap 5 menit
            const interval = setInterval(fetchNotifCount, 300000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleLogout = async () => {
        const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari aplikasi?');
        if (confirmed) {
            await logout();
            navigate('/login');
        }
    };

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4 no-print shadow-sm">
            {/* Left Side: Mobile Menu Button & App Title */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={toggleSidebar}
                    className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 md:hidden"
                    title="Buka Menu"
                >
                    <Menu size={22} />
                </button>
                <div className="hidden md:flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Aplikasi Administrasi</h2>
                    <h1 className="text-lg font-bold text-slate-800 leading-tight">Perjalanan Dinas Pemkab Melawi</h1>
                </div>
            </div>

            {/* Right Side: Notification Icon & Profile Dropdown */}
            <div className="flex items-center gap-4">
                {/* Notification Badge */}
                <div className="relative">
                    <button 
                        onClick={() => navigate('/spt')}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors relative"
                        title={notifCount > 0 ? `Ada ${notifCount} SPT yang belum dilaporkan` : 'Tidak ada notifikasi baru'}
                    >
                        <Bell size={22} />
                        {notifCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-white">
                                {notifCount > 99 ? '99+' : notifCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                    >
                        <img 
                            src={user?.foto_profil ? `/${user.foto_profil}` : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix'} 
                            alt="User Profile" 
                            className="w-8 h-8 rounded-lg object-cover ring-2 ring-slate-100"
                        />
                        <div className="hidden sm:block">
                            <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name || 'Administrator'}</p>
                            <p className="text-[10px] text-slate-400 font-medium capitalize">{user?.role || 'User'}</p>
                        </div>
                        <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
                    </button>

                    {dropdownOpen && (
                        <>
                            {/* Overlay to close dropdown */}
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setDropdownOpen(false)}
                            />
                            
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 transition-all">
                                <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                                    <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name || 'Administrator'}</p>
                                    <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'User'}</p>
                                </div>
                                
                                <Link 
                                    to="/profil" 
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <User size={16} />
                                    <span>Ubah Profil</span>
                                </Link>
                                <Link 
                                    to="/setelan" 
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <Settings size={16} />
                                    <span>Ubah Password</span>
                                </Link>
                                
                                <hr className="border-slate-100 my-1" />
                                
                                <button 
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span>Keluar Sesi</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
