const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const ExcelJS = require('exceljs');
const { isApiAuthenticated } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

router.get('/api/laporan-bpk-apip', isApiAuthenticated, async (req, res) => {
    const usePagination = req.query.limit !== '0'; // PERBAIKAN KOMPREHENSIF: Tangani kasus limit=0 secara eksplisit untuk mengambil semua data.
    // Jika paginasi aktif, gunakan nilai dari query atau default ke 5. Jika tidak, limit adalah 0.
    const limit = usePagination ? (parseInt(req.query.limit, 10) || 5) : -1; // Gunakan -1 untuk menandakan tanpa limit di SQLite
    const page = parseInt(req.query.page) || 1; // Halaman default 1
    const offset = usePagination ? (page - 1) * (parseInt(req.query.limit, 10) || 5) : 0; // Offset default 0

    try {
        const lapBpkApipSql = `
            SELECT
                s.id,
                pg_spt.nama_lengkap, 
                pg_spt.jabatan, 
                pg_spt.pangkat,
                pg_spt.golongan,
                s.nomor_surat, s.tanggal_surat,
                sppd.nomor_sppd,
                s.tanggal_berangkat, s.tanggal_kembali, s.maksud_perjalanan,
                a.mata_anggaran_nama
            FROM spt s
            JOIN spt_pegawai sp ON s.id = sp.spt_id
            JOIN pegawai pg_spt ON sp.pegawai_id = pg_spt.id
            LEFT JOIN anggaran a ON s.anggaran_id = a.id
            LEFT JOIN sppd ON s.id = sppd.spt_id AND sp.pegawai_id = sppd.pegawai_id
            ORDER BY s.tanggal_surat DESC, s.id DESC, sp.urutan ASC` + (usePagination ? ' LIMIT ? OFFSET ?' : '');
        const params = usePagination ? [limit, offset] : [];
        const lapBpkApip = await dbAll(lapBpkApipSql, params);

        // Jika tidak menggunakan paginasi, kembalikan semua data dalam array.
        if (!req.query.page && !req.query.limit) {
            return res.json(lapBpkApip);
        }
        // Jika menggunakan paginasi, hitung total dan kembalikan objek paginasi.
        // PERBAIKAN: Hitung total berdasarkan jumlah pegawai di SPT, bukan jumlah SPT
        const totalResult = await dbGet("SELECT COUNT(*) as total FROM spt_pegawai", []);
        const totalItems = totalResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            data: lapBpkApip,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages
            }
        });

    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data laporan BPK & APIP:', err);
        res.status(500).json({ message: err.message });
    }
});

// API BARU: Mengambil data transportasi untuk laporan BPK & APIP
router.get('/api/laporan-bpk-apip/transportasi', isApiAuthenticated, async (req, res) => {
    const { arah = 'berangkat', page = 1, limit = 5 } = req.query;

    const usePagination = limit !== '0';
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = usePagination ? (parseInt(limit, 10) || 5) : -1;
    const offset = usePagination ? (pageNum - 1) * limitNum : 0;

    try {
        const countSql = `
            SELECT COUNT(*) as total
            FROM laporan_transportasi lt
            WHERE lt.arah_perjalanan = ?
        `;
        const totalResult = await dbGet(countSql, [arah]);
        const totalItems = totalResult.total;
        const totalPages = usePagination ? Math.ceil(totalItems / limitNum) : 1;

        const dataSql = `
            SELECT
                lt.id,
                p.nama_lengkap,
                p.jabatan,
                s.nomor_surat,
                lt.perusahaan,
                lt.kode_boking,
                lt.nomor_penerbangan,
                lt.nomor_tiket,
                lt.tanggal_tiket,
                lt.terminal_berangkat,
                lt.terminal_tiba,
                lt.nominal
            FROM laporan_transportasi lt
            JOIN laporan_perjadin lp ON lt.laporan_id = lp.id
            JOIN spt s ON lp.spt_id = s.id
            JOIN pegawai p ON lt.pegawai_id = p.id
            WHERE lt.arah_perjalanan = ?
            ORDER BY lt.id DESC
        ` + (usePagination ? ' LIMIT ? OFFSET ?' : '');

        const params = usePagination ? [arah, limitNum, offset] : [arah];
        const transportList = await dbAll(dataSql, params);

        res.json({ data: transportList, pagination: { page: pageNum, limit: limitNum, totalItems, totalPages } });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data transportasi BPK & APIP:', err);
        res.status(500).json({ message: err.message });
    }
});

// API BARU: Mengambil data akomodasi untuk laporan BPK & APIP
router.get('/api/laporan-bpk-apip/akomodasi', isApiAuthenticated, async (req, res) => {
    const { page = 1, limit = 5 } = req.query;

    const usePagination = limit !== '0';
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = usePagination ? (parseInt(limit, 10) || 5) : -1;
    const offset = usePagination ? (pageNum - 1) * limitNum : 0;

    try {
        const countSql = `SELECT COUNT(*) as total FROM laporan_akomodasi`;
        const totalResult = await dbGet(countSql, []);
        const totalItems = totalResult.total;
        const totalPages = usePagination ? Math.ceil(totalItems / limitNum) : 1;

        const dataSql = `
            SELECT
                la.id,
                p.nama_lengkap,
                p.jabatan,
                s.nomor_surat,
                la.nama as nama_hotel,
                la.lokasi_hotel,
                la.tanggal_checkIn,
                la.tanggal_checkOut,
                la.malam,
                la.harga_satuan,
                la.nominal as total_harga
            FROM laporan_akomodasi la
            JOIN laporan_perjadin lp ON la.laporan_id = lp.id
            JOIN spt s ON lp.spt_id = s.id
            JOIN pegawai p ON la.pegawai_id = p.id
            ORDER BY la.id DESC
        ` + (usePagination ? ' LIMIT ? OFFSET ?' : '');

        const params = usePagination ? [limitNum, offset] : [];
        const accomodationList = await dbAll(dataSql, params);

        res.json({ data: accomodationList, pagination: { page: pageNum, limit: limitNum, totalItems, totalPages } });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data akomodasi BPK & APIP:', err);
        res.status(500).json({ message: err.message });
    }
});

// API BARU: Mengambil data Uang Harian untuk laporan BPK & APIP
router.get('/api/laporan-bpk-apip/uang-harian', isApiAuthenticated, async (req, res) => {
    const { page = 1, limit = 5 } = req.query;

    const usePagination = limit !== '0';
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = usePagination ? (parseInt(limit, 10) || 5) : -1;
    const offset = usePagination ? (pageNum - 1) * limitNum : 0;

    try {
        // Karena data dihitung, kita ambil semua data pegawai dari SPT terlebih dahulu
        const allPegawaiSql = `
            SELECT
                p.id as pegawai_id, p.nama_lengkap, p.jabatan, p.golongan,
                s.id as spt_id, s.nomor_surat, s.lama_perjalanan, s.lokasi_tujuan, s.tempat_berangkat
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            JOIN spt s ON sp.spt_id = s.id
            WHERE s.status = 'aktif'
            ORDER BY s.tanggal_surat DESC, p.id
        `;
        const allItems = await dbAll(allPegawaiSql, []);

        const locationsData = require('./public/data/locations.json');
        const cariJenisLokasi = (lokasi) => {
            const lokasiLower = lokasi.toLowerCase().trim();
            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        if (location.toLowerCase().includes(lokasiLower) || lokasiLower.includes(location.toLowerCase())) return { jenis: 'desa', nama: location, group: group.group };
                    }
                    if (group.group.toLowerCase().includes(lokasiLower) || lokasiLower.includes(group.group.toLowerCase().replace('kecamatan', '').trim())) return { jenis: 'kecamatan', nama: group.group };
                }
            }
            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        if (location.toLowerCase().includes(lokasiLower) || lokasiLower.includes(location.toLowerCase())) return { jenis: 'kabupaten', nama: location, provinsi: group.group };
                    }
                    if (group.group.toLowerCase() === lokasiLower) return { jenis: 'provinsi', nama: group.group };
                }
            }
            return { jenis: 'tidak_diketahui', nama: lokasi };
        };

        const cariStandarBiaya = async (tipeBiaya, lokasiQuery) => {
            let query = tipeBiaya === 'A' ? `SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' AND TRIM(UPPER(uraian)) LIKE TRIM(UPPER(?))` : `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
            let params = [`%${lokasiQuery.trim()}%`];
            if (tipeBiaya === 'C' && (lokasiQuery.toLowerCase().includes('jakarta') || lokasiQuery.toLowerCase().includes('dki'))) {
                params = ['%JAKARTA%'];
            }
            let result = await dbGet(query, params);
            if (!result) {
                result = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = ? LIMIT 1`, [tipeBiaya]);
            }
            return result;
        };

        const biayaRepresentasiEselonII = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'D' AND (TRIM(UPPER(uraian)) = 'PEJABAT ESELON II' OR TRIM(UPPER(uraian)) LIKE '%ESELON II%')`);

        const processedData = [];
        for (const item of allItems) {
            const infoLokasi = cariJenisLokasi(item.lokasi_tujuan || '');
            const isDalamKota = ['desa', 'kecamatan'].includes(infoLokasi.jenis) || (infoLokasi.jenis === 'kabupaten' && (infoLokasi.nama.toLowerCase().includes((item.tempat_berangkat || '').toLowerCase())));

            const standarBiayaHarian = await cariStandarBiaya(isDalamKota ? 'A' : 'C', isDalamKota ? infoLokasi.nama : infoLokasi.provinsi || infoLokasi.nama);

            const tingkatBiaya = getTingkatBiaya(item);
            const kolomGolongan = getKolomGolongan(tingkatBiaya);
            const tarifSatuan = standarBiayaHarian ? (standarBiayaHarian[kolomGolongan] || standarBiayaHarian.besaran || 0) : 0;
            const total = tarifSatuan * item.lama_perjalanan;

            let biayaRepresentatif = 0;
            if (item.jabatan && item.jabatan.toLowerCase().includes('kepala dinas') && biayaRepresentasiEselonII) {
                const tarifRepresentatif = isDalamKota ? (biayaRepresentasiEselonII.biaya_kontribusi || 0) : (biayaRepresentasiEselonII.besaran || 0);
                biayaRepresentatif = tarifRepresentatif * item.lama_perjalanan;
            }

            processedData.push({
                ...item,
                jumlah_hari: item.lama_perjalanan,
                tarif_satuan: tarifSatuan,
                total: total,
                biaya_representatif: biayaRepresentatif
            });
        }

        const totalItems = processedData.length;
        const totalPages = usePagination ? Math.ceil(totalItems / limitNum) : 1;
        const paginatedData = usePagination ? processedData.slice(offset, offset + limitNum) : processedData;

        res.json({ data: paginatedData, pagination: { page: pageNum, limit: limitNum, totalItems, totalPages } });

    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data Uang Harian BPK & APIP:', err);
        res.status(500).json({ message: err.message });
    }
});

// API BARU: Mengambil data Biaya Lain-lain untuk laporan BPK & APIP
router.get('/api/laporan-bpk-apip/lain-lain', isApiAuthenticated, async (req, res) => {
    const { page = 1, limit = 5 } = req.query;

    const usePagination = limit !== '0';
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = usePagination ? (parseInt(limit, 10) || 5) : -1;
    const offset = usePagination ? (pageNum - 1) * limitNum : 0;

    try {
        const countSql = `SELECT COUNT(*) as total FROM laporan_lain_lain`;
        const totalResult = await dbGet(countSql, []);
        const totalItems = totalResult.total;
        const totalPages = usePagination ? Math.ceil(totalItems / limitNum) : 1;

        const dataSql = `
            SELECT
                ll.id,
                p.nama_lengkap,
                p.jabatan,
                s.nomor_surat,
                ll.uraian,
                ll.jumlah_hari,
                ll.tarif_satuan,
                ll.nominal as total,
                ll.keterangan
            FROM laporan_lain_lain ll
            JOIN laporan_perjadin lp ON ll.laporan_id = lp.id
            JOIN spt s ON lp.spt_id = s.id
            JOIN pegawai p ON ll.pegawai_id = p.id
            ORDER BY ll.id DESC
        ` + (usePagination ? ' LIMIT ? OFFSET ?' : '');

        const params = usePagination ? [limitNum, offset] : [];
        const otherCostList = await dbAll(dataSql, params);

        res.json({ data: otherCostList, pagination: { page: pageNum, limit: limitNum, totalItems, totalPages } });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data Biaya Lain-lain BPK & APIP:', err);
        res.status(500).json({ message: err.message });
    }
});

// API BARU: Mengambil semua data gabungan untuk cetak Laporan BPK
router.get('/api/cetak/laporan-bpk', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `
            SELECT
                s.id as spt_id,
                p.id as pegawai_id,
                p.nama_lengkap,
                p.jabatan,
                p.pangkat || '/' || p.golongan as pangkat_golongan,
                s.nomor_surat,
                sppd.nomor_sppd,
                s.tanggal_berangkat,
                s.tanggal_kembali,
                s.lama_perjalanan,
                s.maksud_perjalanan,
                s.lokasi_tujuan,
                s.tempat_berangkat,
                s.keterangan as keterangan_spt,
                lp.id as laporan_id
            FROM spt_pegawai sp
            JOIN spt s ON sp.spt_id = s.id
            JOIN pegawai p ON sp.pegawai_id = p.id
            LEFT JOIN sppd ON s.id = sppd.spt_id AND p.id = sppd.pegawai_id
            LEFT JOIN laporan_perjadin lp ON s.id = lp.spt_id
            ORDER BY s.tanggal_surat DESC, s.id DESC, sp.urutan ASC
        `;
        const allItems = await dbAll(sql);

        const locationsData = require('./public/data/locations.json');
        const cariJenisLokasi = (lokasi, tempatBerangkat) => {
            const lokasiLower = lokasi.toLowerCase().trim();
            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    for (const loc of group.locations) {
                        if (loc.toLowerCase().includes(lokasiLower) || lokasiLower.includes(loc.toLowerCase())) return 'Dalam Daerah';
                    }
                    if (group.group.toLowerCase().includes(lokasiLower) || lokasiLower.includes(group.group.toLowerCase().replace('kecamatan', '').trim())) return 'Dalam Daerah';
                }
            }
            if (lokasiLower.includes(tempatBerangkat.toLowerCase())) return 'Dalam Daerah';
            return 'Luar Daerah';
        };

        const biayaRepresentasiEselonII = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'D' AND (TRIM(UPPER(uraian)) = 'PEJABAT ESELON II' OR TRIM(UPPER(uraian)) LIKE '%ESELON II%')`);

        const results = [];
        for (const item of allItems) {
            // PERBAIKAN: Inisialisasi semua objek biaya dengan nilai default
            // untuk mencegah error 'undefined' di client-side.
            let transportBerangkat = { nominal: 0 };
            let transportPulang = { nominal: 0 };
            let akomodasi = { nominal: 0 };
            let uangHarian = { jumlah_hari: 0, tarif_satuan: 0, total: 0 };
            let uangRepresentatif = 0;
            let totalDiterima = 0;

            if (item.laporan_id) {
                // PERBAIKAN: Ambil semua data transportasi untuk pegawai ini, urutkan berdasarkan ID.
                // Asumsi: Entri pertama adalah 'berangkat', entri kedua adalah 'pulang'.
                const allTransport = await dbAll("SELECT * FROM laporan_transportasi WHERE laporan_id = ? AND pegawai_id = ? ORDER BY id ASC", [item.laporan_id, item.pegawai_id]) || [];
                // PERBAIKAN: Pastikan objek selalu memiliki properti 'nominal'
                transportBerangkat = allTransport[0] || { nominal: 0 };
                transportPulang = allTransport[1] || { nominal: 0 }; // Ambil data kedua sebagai data pulang
                akomodasi = await dbGet("SELECT * FROM laporan_akomodasi WHERE laporan_id = ? AND pegawai_id = ?", [item.laporan_id, item.pegawai_id]) || { nominal: 0 };
            }

            const { data: uangHarianData } = await fetch(`http://localhost:${PORT}/api/laporan-bpk-apip/uang-harian?limit=0`, { headers: { 'Cookie': req.headers.cookie } }).then(res => res.json());
            const uhDetail = uangHarianData.find(uh => uh.spt_id === item.spt_id && uh.pegawai_id === item.pegawai_id);

            // PERBAIKAN: Pastikan uangHarian diisi hanya jika uhDetail ditemukan.
            // Jika tidak, nilai default yang sudah diinisialisasi akan digunakan.
            if (uhDetail) {
                uangHarian = {
                    jumlah_hari: uhDetail.jumlah_hari,
                    tarif_satuan: uhDetail.tarif_satuan,
                    total: uhDetail.total
                };
                uangRepresentatif = uhDetail.biaya_representatif || 0;
            }

            // PERBAIKAN: Logika pemisahan biaya dipindahkan ke luar blok if (item.laporan_id)
            // untuk memastikan variabel selalu terdefinisi dengan benar.
            const semuaBiayaLain = item.laporan_id ? await dbAll("SELECT * FROM laporan_lain_lain WHERE laporan_id = ? AND pegawai_id = ?", [item.laporan_id, item.pegawai_id]) : [];

            const rentalKeywords = ['sewa', 'mobil', 'truck', 'angkutan', 'motor', 'sepeda', 'kapal', 'sampan', 'perahu'];
            const rentalItems = semuaBiayaLain.filter(biaya =>
                biaya.uraian && rentalKeywords.some(keyword => biaya.uraian.toLowerCase().includes(keyword))
            );
            const otherItems = semuaBiayaLain.filter(biaya =>
                !biaya.uraian || !rentalKeywords.some(keyword => biaya.uraian.toLowerCase().includes(keyword))
            );

            const sewaKendaraanDalamKota = {
                nominal: rentalItems.reduce((sum, i) => sum + (i.nominal || 0), 0),
                uraian: rentalItems.map(i => i.uraian).filter(Boolean).join(', '),
                keterangan: rentalItems.map(i => i.keterangan).filter(Boolean).join(', ')
            };

            const biayaLainSisa = {
                uraian: otherItems.map(i => i.uraian).filter(Boolean).join(', '),
                keterangan: otherItems.map(i => i.keterangan).filter(Boolean).join(', '),
                nominal: otherItems.reduce((sum, i) => sum + (i.nominal || 0), 0)
            };

            totalDiterima = (transportBerangkat.nominal || 0) + (transportPulang.nominal || 0) + (akomodasi.nominal || 0) + (uangHarian.total || 0) + uangRepresentatif + (sewaKendaraanDalamKota.nominal || 0) + (biayaLainSisa.nominal || 0);

            results.push({
                ...item,
                jenis_perjadin: cariJenisLokasi(item.lokasi_tujuan, item.tempat_berangkat),
                transport_berangkat: transportBerangkat,
                transport_pulang: transportPulang,
                akomodasi: akomodasi,
                uang_harian: uangHarian,
                uang_representatif: uangRepresentatif,
                sewa_kendaraan_dalam_kota: sewaKendaraanDalamKota,
                biaya_lain_sisa: biayaLainSisa,
                total_diterima: totalDiterima
            });
        }

        const kadis = await dbGet("SELECT nama_lengkap, nip FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1");

        res.json({ data: results, penandatangan: kadis || {} });

    } catch (error) {
        console.error('[API ERROR] Gagal mengambil data cetak laporan BPK:', error);
        res.status(500).json({ message: 'Gagal mengambil data laporan.', error: error.message });
    }
});

// --- Rute API SPT (Surat Perintah Tugas) ---

// [BARU] GET: Menghitung jumlah SPT aktif/belum lapor untuk notifikasi

module.exports = router;
