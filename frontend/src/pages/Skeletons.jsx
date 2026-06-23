import React from 'react';
import { Link } from 'react-router-dom';

const createSkeleton = (title) => {
    return () => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">Halaman ini sedang dalam proses pemindahan dari versi HTML legacy ke React.</p>
            <div className="flex gap-4">
                <Link to="/dashboard" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10">
                    Kembali ke Dashboard
                </Link>
            </div>
        </div>
    );
};

export const Pegawai = createSkeleton('Data Pegawai');
export const Anggaran = createSkeleton('Mata Anggaran');
export const SptRegister = createSkeleton('Register Surat Tugas (SPT)');
export const TambahSpt = createSkeleton('Tambah/Edit Surat Tugas (SPT)');
export const UangMuka = createSkeleton('Panjar (Uang Muka)');
export const BuatLaporan = createSkeleton('Laporan Perjalanan Dinas');
export const Pembayaran = createSkeleton('Kuitansi & Pembayaran');
export const LaporanBpkApip = createSkeleton('Laporan Hasil BPK / APIP');
export const StandarBiaya = createSkeleton('Standar Biaya Umum (SBU)');
export const PengaturanAplikasi = createSkeleton('Pengaturan Daftar Pejabat');
export const Pengguna = createSkeleton('Manajemen Pengguna');
export const Profil = createSkeleton('Profil Saya');
export const Setelan = createSkeleton('Ubah Password');

// Cetak Skeletons
export const CetakSPT = () => <div className="p-8">Mempersiapkan Cetak SPT... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakSPPD = () => <div className="p-8">Mempersiapkan Cetak SPPD... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakVisum = () => <div className="p-8">Mempersiapkan Cetak Visum... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakPanjar = () => <div className="p-8">Mempersiapkan Cetak Panjar... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakPembayaran = () => <div className="p-8">Mempersiapkan Cetak Pembayaran... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakPengeluaranRiil = () => <div className="p-8">Mempersiapkan Cetak Pengeluaran Riil... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakPembatalan = () => <div className="p-8">Mempersiapkan Cetak Pembatalan... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakLaporan = () => <div className="p-8">Mempersiapkan Cetak Laporan... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
export const CetakLaporanBpk = () => <div className="p-8">Mempersiapkan Cetak Laporan Audit BPK... <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print</button></div>;
