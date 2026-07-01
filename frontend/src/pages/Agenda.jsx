import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Search,
  Loader2,
  X,
  Printer,
  RefreshCw,
  User,
  Coins,
  Car,
  Briefcase,
  AlertCircle,
  HelpCircle,
  FileCheck,
  Ban,
} from 'lucide-react';

const Agenda = () => {
  const navigate = useNavigate();

  // Calendar State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date()); // Tracks current view (month/week/day)
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date()); // Tracks mini calendar view

  // Search & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('month'); // 'month', 'week', 'day'

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch all events on mount
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/spt', {
        params: { limit: 0 }, // Get all events without pagination
      });
      if (res.data) {
        setEvents(res.data.data || res.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat data agenda dinas:', err);
      setError('Gagal memuat data perjalanan dinas dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Theme helper based on Kode Mata Anggaran
  const getThemeClasses = (kode) => {
    const defaultTheme = {
      bg: 'bg-emerald-50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
      badge: 'bg-emerald-500 text-white',
      dot: 'bg-emerald-500',
      label: 'Perjalanan Dinas Biasa / Tetap',
      gradient: 'from-emerald-600 to-teal-700',
    };

    if (!kode) return defaultTheme;
    const cleanKode = kode.trim();

    // Perjalanan Dinas Biasa, Tetap, Meeting Luar Kota
    if (['5.1.02.04.01.0001', '5.1.02.04.01.0002', '5.1.02.04.01.0005'].includes(cleanKode)) {
      return {
        bg: 'bg-emerald-50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
        badge: 'bg-emerald-500 text-white',
        dot: 'bg-emerald-500',
        label: 'Perjalanan Dinas Biasa / Tetap',
        gradient: 'from-emerald-600 to-teal-700',
      };
    }

    // Perjalanan Dinas Dalam Kota, Meeting Dalam Kota
    if (['5.1.02.04.01.0003', '5.1.02.04.01.0004'].includes(cleanKode)) {
      return {
        bg: 'bg-sky-50 hover:bg-sky-100/60 dark:bg-sky-950/20 dark:hover:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900/50',
        badge: 'bg-sky-500 text-white',
        dot: 'bg-sky-500',
        label: 'Perjalanan Dinas Dalam Kota',
        gradient: 'from-sky-600 to-blue-700',
      };
    }

    // Kursus, Bimbingan Teknis
    if (['5.1.02.02.12.0001', '5.1.02.02.12.0003'].includes(cleanKode)) {
      return {
        bg: 'bg-amber-50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
        badge: 'bg-amber-500 text-white',
        dot: 'bg-amber-500',
        label: 'Kursus / Bimtek',
        gradient: 'from-amber-600 to-orange-700',
      };
    }

    // Sosialisasi
    if (['5.1.02.02.12.0002'].includes(cleanKode)) {
      return {
        bg: 'bg-orange-50 hover:bg-orange-100/60 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900/50',
        badge: 'bg-orange-500 text-white',
        dot: 'bg-orange-500',
        label: 'Sosialisasi',
        gradient: 'from-orange-600 to-red-700',
      };
    }

    // Diklat Kepemimpinan
    if (['5.1.02.02.12.0004'].includes(cleanKode)) {
      return {
        bg: 'bg-violet-50 hover:bg-violet-100/60 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900/50',
        badge: 'bg-violet-500 text-white',
        dot: 'bg-violet-500',
        label: 'Diklat Kepemimpinan',
        gradient: 'from-violet-600 to-purple-700',
      };
    }

    return defaultTheme;
  };

  // Date utilities
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const startDayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month filler days (fill up to 42 cells for consistent 6 rows)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getWeekDays = (startDate) => {
    const startOfWeek = new Date(startDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to start on Monday
    const monday = new Date(startOfWeek.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isEventOnDate = (event, date) => {
    if (!event.tanggal_berangkat || !event.tanggal_kembali) return false;

    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const targetStr = formatYMD(date);
    const startStr = event.tanggal_berangkat.substring(0, 10);
    const endStr = event.tanggal_kembali.substring(0, 10);

    return targetStr >= startStr && targetStr <= endStr;
  };

  // Filter events by search query
  const getFilteredEvents = () => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        (e.nomor_surat && e.nomor_surat.toLowerCase().includes(query)) ||
        (e.maksud_perjalanan && e.maksud_perjalanan.toLowerCase().includes(query)) ||
        (e.lokasi_tujuan && e.lokasi_tujuan.toLowerCase().includes(query)) ||
        (e.pegawai && e.pegawai.some((p) => p.nama_lengkap.toLowerCase().includes(query)))
    );
  };

  // Date formatting helpers
  const formatIndoDate = (date) => {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatIndoMonthYear = (date) => {
    return date.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
  };

  const parseRawDateString = (dateStr) => {
    if (!dateStr) return '';
    // PERBAIKAN: Ambil hanya bagian tanggal (YYYY-MM-DD) untuk menghindari masalah parsing
    // pada format ISO 8601 yang lengkap dengan waktu.
    const datePart = dateStr.substring(0, 10);
    const date = new Date(datePart.replace(/-/g, '/')); // Gunakan '/' untuk kompatibilitas lintas browser

    // Cek apakah tanggal valid sebelum memformat
    if (isNaN(date.getTime())) return 'Tanggal Tidak Valid';
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Navigation handlers
  const handlePrevPeriod = () => {
    if (activeTab === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (activeTab === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const handleNextPeriod = () => {
    if (activeTab === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (activeTab === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    setMiniCalendarDate(today);
  };

  // Mini Calendar Navigation
  const handleMiniPrevMonth = () => {
    setMiniCalendarDate(
      new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1)
    );
  };

  const handleMiniNextMonth = () => {
    setMiniCalendarDate(
      new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1)
    );
  };

  const handleDayCellClick = (date) => {
    setSelectedDate(date);
    // Sync views
    setCurrentDate(date);
  };

  // Open Event Details
  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setModalOpen(true);
  };

  // Setup current periods
  const filteredEvents = getFilteredEvents();
  const currentMonthDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const currentWeekDays = getWeekDays(currentDate);
  const miniMonthDays = getDaysInMonth(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth());

  // Filter events active on selected sidebar date
  const sidebarEvents = filteredEvents.filter((e) => isEventOnDate(e, selectedDate));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-rose-600" />
            Agenda & Kalender Dinas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisasi jadwal dan koordinasi perjalanan dinas aktif Pemkab Melawi.
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari agenda, tujuan, pegawai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full md:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition-all text-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={fetchEvents}
            title="Refresh Data"
            className="p-2 bg-white dark:bg-slate-805 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all cursor-pointer animate-duration-1000"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && events.length === 0 ? (
        <div className="min-h-96 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Loader2 className="h-10 w-10 text-rose-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-4">
            Memuat data agenda...
          </span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <h3 className="font-bold text-red-800 dark:text-red-300">Gagal Memuat Agenda</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* LEFT SIDEBAR: Mini Calendar & Event List on Selected Day */}
          <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
            {/* Mini Calendar Card */}
            <div className="bg-gradient-to-br from-rose-900 via-pink-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col">
              {/* Header Navigation */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <h3 className="font-bold text-sm tracking-wide uppercase text-rose-200">
                  {miniCalendarDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMiniPrevMonth}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleMiniNextMonth}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-white/50 tracking-wider mb-2">
                <div>MIN</div>
                <div>SEN</div>
                <div>SEL</div>
                <div>RAB</div>
                <div>KAM</div>
                <div>JUM</div>
                <div>SAB</div>
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 text-center text-xs gap-y-1">
                {miniMonthDays.map((dayObj, index) => {
                  const isSelected = isSameDay(dayObj.date, selectedDate);
                  const isToday = isSameDay(dayObj.date, new Date());
                  const hasDayEvents = filteredEvents.some((e) => isEventOnDate(e, dayObj.date));

                  let dayClass =
                    'p-1.5 rounded-lg font-medium cursor-pointer transition-all duration-150 ';

                  if (!dayObj.isCurrentMonth) {
                    dayClass += 'text-white/30 hover:bg-white/5 ';
                  } else if (isSelected) {
                    dayClass +=
                      'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-bold scale-105 ';
                  } else if (isToday) {
                    dayClass += 'border border-rose-400 text-white font-bold ';
                  } else {
                    dayClass += 'text-white hover:bg-white/10 ';
                  }

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayCellClick(dayObj.date)}
                      className={`${dayClass} relative flex flex-col items-center justify-center`}
                    >
                      <span>{dayObj.date.getDate()}</span>

                      {/* Event Dot */}
                      {hasDayEvents && !isSelected && (
                        <span className="absolute bottom-1 h-1 w-1 bg-amber-400 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda List Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex-1 flex flex-col min-h-64">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Agenda Tanggal
                </span>
                <h4 className="font-bold text-slate-800 dark:text-white text-md mt-0.5 capitalize">
                  {formatDayName(selectedDate)}, {formatIndoDate(selectedDate)}
                </h4>
              </div>

              {/* Agenda List */}
              <div className="space-y-3 overflow-y-auto max-h-96 flex-1 pr-1 scrollbar-thin">
                {sidebarEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6">
                    <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-650 mb-2" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Tidak ada perjalanan dinas berjalan pada tanggal ini.
                    </p>
                  </div>
                ) : (
                  sidebarEvents.map((event) => {
                    const theme = getThemeClasses(event.mata_anggaran_kode);
                    const isCanceled = event.status === 'dibatalkan';

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className={`p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${isCanceled ? 'bg-red-50/40 dark:bg-red-950/5 border-red-100 dark:border-red-950' : 'bg-slate-50/50 dark:bg-slate-800/40'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}
                          >
                            {theme.label.split('/')[0]}
                          </span>
                          {isCanceled && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wider flex items-center gap-0.5">
                              <Ban className="h-2 w-2" /> Batal
                            </span>
                          )}
                        </div>
                        <h5
                          className={`font-bold text-xs text-slate-800 dark:text-white line-clamp-2 ${isCanceled ? 'line-through text-slate-400' : ''}`}
                        >
                          {event.maksud_perjalanan}
                        </h5>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{event.lokasi_tujuan}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {event.pegawai
                              ? event.pegawai.map((p) => p.nama_lengkap).join(', ')
                              : 'Tidak ada pelaksana'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* MAIN VIEWPORT: Calendar Grid / Schedule list */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col">
            {/* View Controls & Period Navigator */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5 mb-5">
              {/* Period Navigator */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToday}
                  className="px-4 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hari Ini
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevPeriod}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNextPeriod}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize px-1">
                  {activeTab === 'month' && formatIndoMonthYear(currentDate)}
                  {activeTab === 'week' &&
                    `Minggu, ${formatIndoDate(currentWeekDays[0])} - ${formatIndoDate(currentWeekDays[6])}`}
                  {activeTab === 'day' &&
                    `${formatDayName(currentDate)}, ${formatIndoDate(currentDate)}`}
                </h2>
              </div>

              {/* View Tabs */}
              <div className="bg-slate-100 dark:bg-slate-905 p-1 rounded-xl flex items-center self-start sm:self-center">
                <button
                  onClick={() => setActiveTab('month')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${activeTab === 'month' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => setActiveTab('week')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${activeTab === 'week' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Mingguan
                </button>
                <button
                  onClick={() => {
                    setActiveTab('day');
                    // Sync view target
                    setCurrentDate(selectedDate);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${activeTab === 'day' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Harian
                </button>
              </div>
            </div>

            {/* TAB CONTAINER CONTENT */}
            <div className="flex-1">
              {/* MONTH VIEW */}
              {activeTab === 'month' && (
                <div className="border-r border-t border-slate-300/50 dark:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col">
                  {/* Grid Header */}
                  <div className="grid grid-cols-7 text-center bg-slate-50 dark:bg-slate-900 border-b-0 border-l   border-slate-300/50 dark:border-slate-700 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <div>MINGGU</div>
                    <div>SENIN</div>
                    <div>SELASA</div>
                    <div>RABU</div>
                    <div>KAMIS</div>
                    <div>JUMAT</div>
                    <div>SABTU</div>
                  </div>
                  {/* Grid Cells */}
                  <div className="grid grid-cols-7  bg-slate-100 dark:bg-slate-900/50">
                    {currentMonthDays.map((dayObj, index) => {
                      const isToday = isSameDay(dayObj.date, new Date());
                      const isSelected = isSameDay(dayObj.date, selectedDate);
                      const dayEvents = filteredEvents.filter((e) => isEventOnDate(e, dayObj.date));

                      let cellClass =
                        'min-h-24 sm:min-h-28 p-2 bg-white dark:bg-slate-800 transition-all flex flex-col gap-1 border-t border-l border-slate-300/50 dark:border-slate-700/50 ';

                      if (!dayObj.isCurrentMonth) {
                        cellClass += 'opacity-40 dark:opacity-20 ';
                      }
                      if (isSelected) {
                        cellClass +=
                          'ring-2 ring-rose-500 ring-inset dark:ring-rose-500/80 bg-rose-50/10 dark:bg-rose-950/5 ';
                      }

                      return (
                        <div
                          key={index}
                          onClick={() => handleDayCellClick(dayObj.date)}
                          className={cellClass}
                        >
                          {/* Day Number Label */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full ${isToday ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/20' : 'text-slate-400 dark:text-slate-500'}`}
                            >
                              {dayObj.date.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                {dayEvents.length} SPT
                              </span>
                            )}
                          </div>

                          {/* Event Badges List */}
                          <div className="space-y-1 overflow-y-hidden flex-1 flex flex-col justify-start">
                            {dayEvents.slice(0, 3).map((event) => {
                              const theme = getThemeClasses(event.mata_anggaran_kode);
                              const isCanceled = event.status === 'dibatalkan';

                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => handleEventClick(event, e)}
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold border rounded-sm truncate transition-all duration-150 flex items-center gap-1 ${theme.bg}`}
                                  title={`${event.nomor_surat}: ${event.maksud_perjalanan} (${event.lokasi_tujuan})`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCanceled ? 'bg-red-500' : theme.dot}`}
                                  />
                                  <span
                                    className={`truncate ${isCanceled ? 'line-through opacity-50' : ''}`}
                                  >
                                    {event.lokasi_tujuan}
                                  </span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 pl-1.5 mt-0.5">
                                + {dayEvents.length - 3} lainnya
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WEEK VIEW */}
              {activeTab === 'week' && (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {currentWeekDays.map((day, index) => {
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    const dayEvents = filteredEvents.filter((e) => isEventOnDate(e, day));

                    return (
                      <div
                        key={index}
                        onClick={() => handleDayCellClick(day)}
                        className={`border rounded-2xl p-4 flex flex-col gap-3 min-h-64 transition-all duration-200 cursor-pointer ${isSelected ? 'ring-2 ring-rose-500 bg-rose-50/10 dark:bg-rose-950/5 border-rose-200' : isToday ? 'border-rose-400 dark:border-rose-500 bg-slate-50/30' : 'border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800'}`}
                      >
                        {/* Day Column Header */}
                        <div className="border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                              {day.toLocaleDateString('id-ID', { weekday: 'short' })}
                            </span>
                            <span className="font-extrabold text-md text-slate-800 dark:text-white">
                              {day.getDate()}
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 font-semibold px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                            {dayEvents.length} SPT
                          </span>
                        </div>

                        {/* Events list in day column */}
                        <div className="space-y-3 flex-1 flex flex-col justify-start">
                          {dayEvents.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-center py-8">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                Kosong
                              </span>
                            </div>
                          ) : (
                            dayEvents.map((event) => {
                              const theme = getThemeClasses(event.mata_anggaran_kode);
                              const isCanceled = event.status === 'dibatalkan';

                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => handleEventClick(event, e)}
                                  className={`p-2.5 rounded-xl border flex flex-col gap-1 hover:shadow-xs transition-all ${theme.bg}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-bold truncate max-w-24">
                                      {event.nomor_surat}
                                    </span>
                                    {isCanceled && (
                                      <span className="text-[8px] font-bold px-1 bg-red-600 text-white rounded-sm uppercase tracking-wide">
                                        Batal
                                      </span>
                                    )}
                                  </div>
                                  <h6
                                    className={`font-bold text-[10px] text-slate-800 dark:text-white line-clamp-2 ${isCanceled ? 'line-through opacity-50' : ''}`}
                                  >
                                    {event.maksud_perjalanan}
                                  </h6>
                                  <div className="flex items-center gap-0.5 text-[9px] text-slate-500 dark:text-slate-400 mt-1">
                                    <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{event.lokasi_tujuan}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DAY VIEW */}
              {activeTab === 'day' && (
                <div className="space-y-4">
                  {sidebarEvents.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/20">
                      <CalendarIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        Tidak Ada Kegiatan Dinas
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
                        Tidak ada surat perintah tugas (SPT) yang dijadwalkan berangkat atau
                        berjalan pada tanggal {formatIndoDate(currentDate)}.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sidebarEvents.map((event) => {
                        const theme = getThemeClasses(event.mata_anggaran_kode);
                        const isCanceled = event.status === 'dibatalkan';
                        const startMonth = new Date(
                          event.tanggal_berangkat.replace(/-/g, '/')
                        ).toLocaleString('id-ID', { month: 'short' });
                        const endMonth = new Date(
                          event.tanggal_kembali.replace(/-/g, '/')
                        ).toLocaleString('id-ID', { month: 'short' });
                        const startDate = new Date(
                          event.tanggal_berangkat.replace(/-/g, '/')
                        ).getDate();
                        const endDate = new Date(
                          event.tanggal_kembali.replace(/-/g, '/')
                        ).getDate();
                        const dateRangeText =
                          startMonth === endMonth
                            ? `${startDate} - ${endDate} ${startMonth}`
                            : `${startDate} ${startMonth} - ${endDate} ${endMonth}`;

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => handleEventClick(event, e)}
                            className={`p-5 rounded-2xl border hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 relative ${isCanceled ? 'bg-red-50/30 dark:bg-red-950/5 border-red-150 dark:border-red-950/50' : 'bg-slate-50/30 dark:bg-slate-800/20 border-slate-100 dark:border-slate-750'}`}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}
                                >
                                  {theme.label}
                                </span>
                                <span className="block font-extrabold text-xs text-slate-800 dark:text-white mt-1.5">
                                  {event.nomor_surat}
                                </span>
                              </div>
                              <span className="text-xs bg-white dark:bg-slate-700 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300 shadow-2xs shrink-0">
                                {dateRangeText} ({event.lama_perjalanan} hari)
                              </span>
                            </div>

                            {/* Card Body */}
                            <div className="space-y-2 flex-1">
                              <h4
                                className={`font-bold text-sm text-slate-800 dark:text-white leading-snug line-clamp-2 ${isCanceled ? 'line-through text-slate-400' : ''}`}
                              >
                                {event.maksud_perjalanan}
                              </h4>

                              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="font-semibold">{event.lokasi_tujuan}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">
                                    Pelaksana:{' '}
                                    <strong className="text-slate-700 dark:text-slate-300">
                                      {event.pegawai
                                        ? event.pegawai.map((p) => p.nama_lengkap).join(', ')
                                        : 'Tidak ada'}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Cancel / Info Badge */}
                            {isCanceled && (
                              <div className="absolute right-4 bottom-4 flex items-center gap-1 bg-red-650 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-lg shadow-sm">
                                <Ban className="h-3 w-3" /> Perjalanan Dibatalkan
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL EVENT MODAL */}
      {modalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header */}
            <div
              className={`p-6 text-white bg-gradient-to-r flex justify-between items-start ${getThemeClasses(selectedEvent.mata_anggaran_kode).gradient}`}
            >
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 uppercase tracking-widest rounded-md">
                  Detail Perjalanan Dinas (SPT)
                </span>
                <h3 className="font-extrabold text-lg mt-1 tracking-wide leading-tight">
                  {selectedEvent.nomor_surat}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Tanggal Surat: {parseRawDateString(selectedEvent.tanggal_surat)}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Status Alert if Cancelled */}
              {selectedEvent.status === 'dibatalkan' && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3">
                  <Ban className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-red-800 dark:text-red-300 text-sm">
                      Status: Perjalanan Dinas Dibatalkan
                    </h5>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                      Surat tugas ini telah dibatalkan secara administratif. Rincian pengembalian
                      atau pembatalan biaya dapat dilihat pada modul panjar.
                    </p>
                  </div>
                </div>
              )}

              {/* Maksud Perjalanan */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Maksud / Tujuan Perjalanan Dinas
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm leading-relaxed">
                  {selectedEvent.maksud_perjalanan}
                </p>
              </div>

              {/* Grid 2-Kolom Detail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                {/* Waktu & Durasi */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 shrink-0">
                    <CalendarIcon className="h-4.5 w-4.5 text-rose-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Waktu Pelaksanaan
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {parseRawDateString(selectedEvent.tanggal_berangkat)} -{' '}
                      {parseRawDateString(selectedEvent.tanggal_kembali)}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Durasi: <strong>{selectedEvent.lama_perjalanan} Hari</strong>
                    </span>
                  </div>
                </div>

                {/* Lokasi & Kendaraan */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 shrink-0">
                    <MapPin className="h-4.5 w-4.5 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lokasi & Transportasi
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {selectedEvent.lokasi_tujuan}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block flex items-center gap-1">
                      <Car className="h-3.5 w-3.5 text-slate-400" />
                      Transportasi: <strong>{selectedEvent.kendaraan || 'Tidak ditentukan'}</strong>
                    </span>
                  </div>
                </div>

                {/* Pembebanan Anggaran */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 shrink-0">
                    <Coins className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mata Anggaran
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {selectedEvent.mata_anggaran_kode || 'Mata Anggaran tidak ditautkan'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Sumber Dana: <strong>{selectedEvent.sumber_dana || 'DPA Kabupaten'}</strong>
                    </span>
                  </div>
                </div>

                {/* Pejabat Pemberi Tugas */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 shrink-0">
                    <Briefcase className="h-4.5 w-4.5 text-sky-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Pejabat Pemberi Tugas
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {selectedEvent.pejabat_nama || 'Tidak ditentukan'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {selectedEvent.pejabat_jabatan}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daftar Pelaksana Pegawai */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Daftar Pelaksana Perjalanan Dinas
                </span>

                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-4 text-center w-12">No.</th>
                        <th className="py-2.5 px-3">Nama Lengkap</th>
                        <th className="py-2.5 px-3">NIP / Identitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedEvent.pegawai && selectedEvent.pegawai.length > 0 ? (
                        selectedEvent.pegawai.map((p, idx) => {
                          const isPegawaiCanceled =
                            selectedEvent.pegawai_dibatalkan &&
                            selectedEvent.pegawai_dibatalkan.includes(p.nama_lengkap);

                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                            >
                              <td className="py-2.5 px-4 text-center font-medium text-slate-400">
                                {idx + 1}.
                              </td>
                              <td
                                className={`py-2.5 px-3 font-semibold ${isPegawaiCanceled ? 'line-through text-red-500' : 'text-slate-800 dark:text-slate-200'}`}
                              >
                                {p.nama_lengkap}
                                {isPegawaiCanceled && (
                                  <span className="text-[9px] bg-red-100 text-red-650 ml-2 px-1.5 py-0.5 rounded font-bold uppercase">
                                    Batal
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                {p.nip || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="3" className="py-4 text-center text-slate-400 italic">
                            Tidak ada pegawai pelaksana terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rincian Keterangan Tambahan */}
              {selectedEvent.keterangan && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Keterangan Tambahan
                  </span>
                  <div className="p-3 bg-slate-50/40 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{selectedEvent.keterangan}"
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-b-2xl">
              {/* Print Shortcuts */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    navigate(`/cetak/spt/${selectedEvent.id}`);
                  }}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak SPT
                </button>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    navigate(`/cetak/sppd/${selectedEvent.id}`);
                  }}
                  className="px-4 py-2 bg-emerald-650 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak SPPD
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
