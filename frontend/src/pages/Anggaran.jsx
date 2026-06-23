import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  X, 
  Wallet, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const Anggaran = () => {
    const [anggaranList, setAnggaranList] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;

    // State Form / Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null); // ID anggaran (bukan kode)
    const [form, setForm] = useState({
        bidang_urusan: '',
        program: '',
        kegiatan: '',
        sub_kegiatan: '',
        mata_anggaran_kode: '',
        mata_anggaran_nama: '',
        nilai_anggaran: '',
        pptk_id: ''
    });

    // Feedback State
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch data anggaran
    const fetchAnggaran = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/anggaran', {
                params: {
                    q: search,
                    page: currentPage,
                    limit: itemsPerPage
                }
            });
            
            if (response.data) {
                setAnggaranList(response.data.data || []);
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.totalPages || 1);
                    setTotalItems(response.data.pagination.totalItems || 0);
                }
            }
        } catch (err) {
            console.error('Gagal mengambil data anggaran:', err);
            setError('Gagal memuat data anggaran.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data pegawai untuk dropdown PPTK
    const fetchPegawaiOptions = async () => {
        try {
            const response = await axios.get('/api/pegawai?limit=0');
            setPegawaiList(response.data || []);
        } catch (err) {
            console.error('Gagal mengambil data pegawai untuk opsi:', err);
        }
    };

    useEffect(() => {
        fetchAnggaran();
    }, [currentPage, search]);

    useEffect(() => {
        fetchPegawaiOptions();
    }, []);

    // Handle input form change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Buka modal untuk Tambah baru
    const handleAdd = () => {
        setEditId(null);
        setForm({
            bidang_urusan: '',
            program: '',
            kegiatan: '',
            sub_kegiatan: '',
            mata_anggaran_kode: '',
            mata_anggaran_nama: '',
            nilai_anggaran: '',
            pptk_id: ''
        });
        setError('');
        setModalOpen(true);
    };

    // Buka modal untuk Edit
    const handleEdit = async (anggaran) => {
        setEditId(anggaran.id);
        setError('');
        
        // Panggil detail dari backend untuk melengkapi form (termasuk bidang_urusan dan pptk_id)
        try {
            setSubmitting(true);
            const res = await axios.get(`/api/anggaran/${anggaran.id}`);
            const data = res.data;
            setForm({
                bidang_urusan: data.bidang_urusan || '',
                program: data.program || '',
                kegiatan: data.kegiatan || '',
                sub_kegiatan: data.sub_kegiatan || '',
                mata_anggaran_kode: data.mata_anggaran_kode || '',
                mata_anggaran_nama: data.mata_anggaran_nama || '',
                nilai_anggaran: data.nilai_anggaran || '',
                pptk_id: data.pptk_id || ''
            });
            setModalOpen(true);
        } catch (err) {
            console.error('Gagal memuat detail anggaran:', err);
            setError('Gagal memuat detail data anggaran.');
        } finally {
            setSubmitting(false);
        }
    };

    // Kirim data Form (Tambah / Edit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            if (editId) {
                // Update
                const res = await axios.put(`/api/anggaran/${editId}`, form);
                setSuccess(res.data.message || 'Data anggaran berhasil diperbarui.');
            } else {
                // Create
                const res = await axios.post('/api/anggaran', form);
                setSuccess(res.data.message || 'Mata anggaran baru berhasil ditambahkan.');
            }
            
            setTimeout(() => {
                setModalOpen(false);
                setSuccess('');
                fetchAnggaran();
            }, 1000);

        } catch (err) {
            console.error('Error submitting anggaran:', err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat memproses data.');
        } finally {
            setSubmitting(false);
        }
    };

    // Hapus Anggaran
    const handleDelete = async (id, kode) => {
        const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus mata anggaran dengan kode "${kode}"?`);
        if (!confirmed) return;

        try {
            const res = await axios.delete(`/api/anggaran/${id}`);
            alert(res.data.message || 'Mata anggaran berhasil dihapus.');
            fetchAnggaran();
        } catch (err) {
            console.error('Error deleting anggaran:', err);
            alert(err.response?.data?.message || 'Gagal menghapus anggaran.');
        }
    };

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manajemen Mata Anggaran</h1>
                    <p className="text-sm text-slate-400">Kelola rincian program, kegiatan, sub-kegiatan, dan pagu anggaran dinas.</p>
                </div>
                <button 
                    onClick={handleAdd}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all text-sm w-full sm:w-auto"
                >
                    <Plus size={18} />
                    <span>Tambah Anggaran</span>
                </button>
            </div>

            {/* Main Table Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                {/* Search & Stats */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:max-w-md">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <Search size={18} />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari program, kegiatan, atau nama anggaran..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Table Data */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Memuat data...</p>
                    </div>
                ) : anggaranList.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                        Tidak ada data anggaran yang ditemukan.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/60">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16">No</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kode / Nama Anggaran</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Program & Sub Kegiatan</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pagu Anggaran</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Realisasi / Sisa</th>
                                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {anggaranList.map((anggaran, index) => (
                                    <tr key={anggaran.mata_anggaran_kode} className="hover:bg-slate-50/20 transition-colors">
                                        <td className="px-5 py-4 text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-800">{anggaran.mata_anggaran_nama}</p>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">{anggaran.mata_anggaran_kode}</p>
                                            {anggaran.pptk_nama && <p className="text-[10px] text-indigo-500 mt-1 font-medium">PPTK: {anggaran.pptk_nama}</p>}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-slate-700 font-medium line-clamp-1">{anggaran.program}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{anggaran.sub_kegiatan}</p>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-800">
                                            {formatRupiah(anggaran.nilai_anggaran)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-emerald-600 font-semibold">{formatRupiah(anggaran.realisasi)} <span className="text-[10px] text-slate-400 font-normal">terpakai</span></p>
                                            <p className="text-xs text-slate-400 mt-0.5">Sisa: {formatRupiah(anggaran.sisa)}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleEdit(anggaran)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Ubah Anggaran"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(anggaran.id, anggaran.mata_anggaran_kode)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Hapus Anggaran"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                        <span className="text-xs text-slate-400">Menampilkan Halaman {currentPage} dari {totalPages}</span>
                        <div className="flex gap-2">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                            >
                                Sebelumnya
                            </button>
                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Dialog Form */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Wallet className="text-indigo-600" size={20} />
                                <span>{editId ? 'Ubah Mata Anggaran' : 'Tambah Mata Anggaran Baru'}</span>
                            </h3>
                            <button 
                                onClick={() => setModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5">
                                    <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {success && (
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-start gap-2.5">
                                    <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                                    <span>{success}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                {/* Bidang Urusan */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bidang / Urusan</label>
                                    <input 
                                        type="text" 
                                        name="bidang_urusan"
                                        value={form.bidang_urusan}
                                        onChange={handleChange}
                                        placeholder="Contoh: Urusan Otonomi Daerah"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                    />
                                </div>

                                {/* Program */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Program</label>
                                    <input 
                                        type="text" 
                                        name="program"
                                        value={form.program}
                                        onChange={handleChange}
                                        placeholder="Contoh: Program Dukungan Administrasi"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Kegiatan */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kegiatan</label>
                                        <input 
                                            type="text" 
                                            name="kegiatan"
                                            value={form.kegiatan}
                                            onChange={handleChange}
                                            placeholder="Contoh: Administrasi Keuangan"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    
                                    {/* Sub Kegiatan */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sub Kegiatan</label>
                                        <input 
                                            type="text" 
                                            name="sub_kegiatan"
                                            value={form.sub_kegiatan}
                                            onChange={handleChange}
                                            placeholder="Contoh: Penyediaan Gaji dan Tunjangan"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Kode Rekening */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kode Mata Anggaran *</label>
                                        <input 
                                            type="text" 
                                            name="mata_anggaran_kode"
                                            required
                                            value={form.mata_anggaran_kode}
                                            onChange={handleChange}
                                            placeholder="Contoh: 5.1.02.04"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-mono"
                                        />
                                    </div>

                                    {/* Nilai Anggaran */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nilai Pagu Anggaran (Rp) *</label>
                                        <input 
                                            type="number" 
                                            name="nilai_anggaran"
                                            required
                                            value={form.nilai_anggaran}
                                            onChange={handleChange}
                                            placeholder="Contoh: 150000000"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold text-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Nama Rekening */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Mata Anggaran *</label>
                                    <input 
                                        type="text" 
                                        name="mata_anggaran_nama"
                                        required
                                        value={form.mata_anggaran_nama}
                                        onChange={handleChange}
                                        placeholder="Contoh: Belanja Perjalanan Dinas Paket Biasa"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                    />
                                </div>

                                {/* PPTK Dropdown */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pejabat Pelaksana Teknis Kegiatan (PPTK)</label>
                                    <select 
                                        name="pptk_id"
                                        value={form.pptk_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                    >
                                        <option value="">Pilih PPTK (Pegawai)</option>
                                        {pegawaiList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nama_lengkap} - NIP. {p.nip}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 border-t border-slate-100 pt-5 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-sm transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 disabled:bg-indigo-600/40 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        'Simpan Anggaran'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Anggaran;
