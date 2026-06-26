const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const terbilang = require('angka-menjadi-terbilang');
const { isApiAuthenticated } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

router.get('/api/pengeluaran-riil', isApiAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        // Hitung total item untuk paginasi
        const totalSql = "SELECT COUNT(*) as total FROM pengeluaran_riil";
        const totalResult = await dbGet(totalSql);
        const totalItems = totalResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        // Ambil data sesuai halaman dan limit
        const sql = `
SELECT
pr.id,
    pr.uraian,
    pr.jumlah,
    p.nama_lengkap as nama_pegawai
            FROM pengeluaran_riil pr
            JOIN pegawai p ON pr.pegawai_id = p.id
            ORDER BY pr.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const rows = await dbAll(sql, [limit, offset]);

        // Kembalikan data dalam format paginasi
        res.json({
            data: rows,
            pagination: { page, limit, totalItems, totalPages }
        });
    } catch (error) {
        console.error('[API ERROR] Gagal mengambil data pengeluaran riil:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// POST: Membuat entri pengeluaran riil baru
router.post('/api/pengeluaran-riil', isApiAuthenticated, async (req, res) => {
    const { spt_id, pegawai_id, uraian, jumlah } = req.body;

    if (!spt_id || !pegawai_id || !uraian || !jumlah) {
        return res.status(400).json({ message: 'Semua kolom wajib diisi.' });
    }

    try {
        const sql = `INSERT INTO pengeluaran_riil(spt_id, pegawai_id, uraian, jumlah) VALUES(?, ?, ?, ?)`;
        const result = await runQuery(sql, [spt_id, pegawai_id, uraian, parseFloat(jumlah) || 0]);
        res.status(201).json({ message: 'Data pengeluaran riil berhasil disimpan!', id: result.lastID });
    } catch (error) {
        console.error('[API ERROR] Gagal menyimpan pengeluaran riil:', error);
        res.status(500).json({ message: 'Gagal menyimpan data.', error: error.message });
    }
});

// GET: Mengambil satu data pengeluaran riil untuk edit
router.get('/api/pengeluaran-riil/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `SELECT * FROM pengeluaran_riil WHERE id = ? `;
        const item = await dbGet(sql, [req.params.id]);
        if (!item) {
            return res.status(404).json({ message: 'Data pengeluaran riil tidak ditemukan.' });
        }
        res.json(item);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil pengeluaran riil id ${req.params.id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// PUT: Memperbarui data pengeluaran riil
router.put('/api/pengeluaran-riil/:id', isApiAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { spt_id, pegawai_id, uraian, jumlah } = req.body;

    if (!spt_id || !pegawai_id || !uraian || !jumlah) {
        return res.status(400).json({ message: 'Semua kolom wajib diisi.' });
    }

    try {
        const sql = `UPDATE pengeluaran_riil SET spt_id = ?, pegawai_id = ?, uraian = ?, jumlah = ? WHERE id = ? `;
        const result = await runQuery(sql, [spt_id, pegawai_id, uraian, parseFloat(jumlah) || 0, id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan untuk diperbarui.' });
        }
        res.json({ message: 'Data pengeluaran riil berhasil diperbarui.' });
    } catch (error) {
        console.error(`[API ERROR] Gagal memperbarui pengeluaran riil id ${id}: `, error);
        res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
    }
});

// DELETE: Menghapus data pengeluaran riil
router.delete('/api/pengeluaran-riil/:id', isApiAuthenticated, async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM pengeluaran_riil WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan.' });
        }
        res.json({ message: 'Data pengeluaran riil berhasil dihapus.' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus pengeluaran riil id ${req.params.id}: `, err);
        res.status(500).json({ message: 'Gagal menghapus data.', error: err.message });
    }
});

// GET: Data untuk cetak pengeluaran riil
router.get('/api/cetak/pengeluaran-riil/:id', isApiAuthenticated, async (req, res) => {
    try {
        // 1. Ambil data pengeluaran riil utama untuk mendapatkan spt_id dan pegawai_id
        const mainRiilSql = `SELECT * FROM pengeluaran_riil WHERE id = ? `;
        const mainRiil = await dbGet(mainRiilSql, [req.params.id]);
        if (!mainRiil) {
            return res.status(404).json({ message: 'Data pengeluaran riil tidak ditemukan.' });
        }

        // 2. Ambil SEMUA item pengeluaran riil untuk pegawai dan SPT yang sama
        const allRiilSql = `SELECT uraian, jumlah FROM pengeluaran_riil WHERE spt_id = ? AND pegawai_id = ? `;
        const allRiilItems = await dbAll(allRiilSql, [mainRiil.spt_id, mainRiil.pegawai_id]);

        // 3. Ambil data SPT
        const sptSql = `SELECT nomor_surat, tanggal_surat FROM spt WHERE id = ? `;
        const spt = await dbGet(sptSql, [mainRiil.spt_id]);

        // 4. Ambil data Pelaksana (yang membuat pernyataan)
        const pelaksanaSql = `SELECT nama_lengkap, nip, jabatan FROM pegawai WHERE id = ? `;
        const pelaksana = await dbGet(pelaksanaSql, [mainRiil.pegawai_id]);

        // 5. Ambil data Pengguna Anggaran (Kepala Dinas)
        const penggunaAnggaranSql = `SELECT nama_lengkap, nip FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1`;
        const penggunaAnggaran = await dbGet(penggunaAnggaranSql);

        const responseData = {
            items: allRiilItems,
            spt: spt || {},
            pelaksana: pelaksana || {},
            penggunaAnggaran: penggunaAnggaran || { nama_lengkap: '(Nama Kepala Dinas)', nip: '(NIP Kepala Dinas)' },
            tanggal_cetak: new Date().toISOString() // Tanggal hari ini
        };

        res.json(responseData);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil data cetak pengeluaran riil id ${req.params.id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// =================================================================
// API ENDPOINT UNTUK CETAK PEMBAYARAN
// =================================================================


// const terbilang = require('angka-menjadi-terbilang'); // duplicate

router.get('/api/cetak/pembayaran/:id', isApiAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Ambil data utama pembayaran
        const pembayaran = await dbGet(`SELECT * FROM pembayaran WHERE id = ? `, [id]);
        if (!pembayaran) {
            return res.status(404).json({ message: 'Data pembayaran tidak ditemukan.' });
        }

        // 2. Ambil data anggaran terkait
        const anggaran = await dbGet(`SELECT * FROM anggaran WHERE id = ? `, [pembayaran.anggaran_id]);

        // 3. Ambil data SPT terkait
        const spt = await dbGet(`SELECT nomor_surat, tanggal_surat FROM spt WHERE id = ? `, [pembayaran.spt_id]);

        // 4. Ambil data rincian dari laporan (sama seperti di modal)
        const laporanResponse = await fetch(`http://localhost:${PORT}/api/laporan/by-spt/${pembayaran.spt_id}`, {
            headers: { 'Cookie': req.headers.cookie } // Teruskan cookie sesi
        });
        if (!laporanResponse.ok) {
            throw new Error('Gagal mengambil rincian pengeluaran dari laporan terkait.');
        }
        const laporanData = await laporanResponse.json();

        // 5. Proses rincian pengeluaran dan gabungkan dengan data panjar
        const panjarData = JSON.parse(pembayaran.panjar_data || '[]');
        const panjarMap = new Map(panjarData.map(p => [p.pegawai_id.toString(), p.nilai_panjar]));
        const overridesMap = new Map(panjarData.map(p => [p.pegawai_id.toString(), p.overrides || {}]));

        const rincianPerPegawai = new Map();

        // Inisialisasi dari daftar penerima di laporan
        laporanData.penerima.forEach(p => {
            rincianPerPegawai.set(p.id.toString(), {
                nama_lengkap: p.nama_lengkap,
                biaya: [],
                panjar: panjarMap.get(p.id.toString()) || 0,
                total_biaya: 0,
                total_dibayar: 0
            });
        });

        // Helper untuk menghitung default cost per pegawai
        const getPegawaiDefaultCosts = (pegId) => {
            const pInfo = laporanData.penerima.find(p => p.id.toString() === pegId);
            const exp = laporanData.pengeluaran.find(p => p.pegawai_id.toString() === pegId) || {};
            if (!pInfo) return [];

            const costs = [];
            const jumlahHariHarian = (exp.akomodasi_malam || 0) + 1;
            costs.push({ type: 'uang_harian', total: (pInfo.uang_harian?.harga_satuan || 0) * jumlahHariHarian });

            if (pInfo.biaya_representasi && pInfo.biaya_representasi.harga > 0) {
                costs.push({ type: 'representasi', total: pInfo.biaya_representasi.harga * jumlahHariHarian });
            }

            if (exp.transportasi_nominal > 0) costs.push({ type: 'transportasi', total: exp.transportasi_nominal });
            if (exp.akomodasi_nominal > 0) costs.push({ type: 'akomodasi', total: exp.akomodasi_nominal });
            if (exp.kontribusi_nominal > 0) costs.push({ type: 'kontribusi', total: exp.kontribusi_nominal });
            if (exp.lain_lain_nominal > 0) costs.push({ type: 'lain_lain', total: exp.lain_lain_nominal });

            return costs;
        };

        // Fungsi untuk menambahkan item biaya dengan penanganan override
        const addBiaya = (pegawaiId, uraian, harga, satuan, hari, defaultJumlah, type) => {
            const pegawaiData = rincianPerPegawai.get(pegawaiId.toString());
            if (pegawaiData) {
                const pegOverrides = overridesMap.get(pegawaiId.toString()) || {};
                const panjarVal = pegawaiData.panjar;
                const defaultCosts = getPegawaiDefaultCosts(pegawaiId.toString());
                const rowIdx = pegawaiData.biaya.length;

                // Alokasi panjar secara sekuensial
                let remainingPanjar = panjarVal;
                let allocatedPanjar = 0;
                for (let i = 0; i <= rowIdx; i++) {
                    const cost = defaultCosts[i]?.total || 0;
                    const allocated = Math.min(cost, remainingPanjar);
                    if (i === rowIdx) {
                        allocatedPanjar = allocated;
                    }
                    remainingPanjar -= allocated;
                }

                // Terapkan override jika ada
                let finalJumlah = defaultJumlah;
                if (type && pegOverrides[type] !== undefined) {
                    const netPaidOverride = parseFloat(pegOverrides[type]) || 0;
                    finalJumlah = netPaidOverride + allocatedPanjar;
                }

                pegawaiData.biaya.push({ uraian, harga, satuan, hari, jumlah: finalJumlah });
                pegawaiData.total_biaya += finalJumlah;
            }
        };

        // Proses pengeluaran dari laporan
        laporanData.pengeluaran.forEach(pengeluaran => {
            const pegawaiId = pengeluaran.pegawai_id.toString();
            const penerimaInfo = laporanData.penerima.find(p => p.id.toString() === pegawaiId);
            if (!penerimaInfo) return;

            const jumlahHariHarian = (pengeluaran.akomodasi_malam || 0) + 1;
            const uangHarianTotal = (penerimaInfo.uang_harian.harga_satuan || 0) * jumlahHariHarian;
            addBiaya(pegawaiId, `Uang Harian (${penerimaInfo.uang_harian.golongan})`, penerimaInfo.uang_harian.harga_satuan, penerimaInfo.uang_harian.satuan, jumlahHariHarian, uangHarianTotal, 'uang_harian');

            if (penerimaInfo.biaya_representasi && penerimaInfo.biaya_representasi.harga > 0) {
                const jumlahHariRepresentasi = (pengeluaran.akomodasi_malam || 0) + 1;
                const totalBiayaRepresentasi = penerimaInfo.biaya_representasi.harga * jumlahHariRepresentasi;
                const uraianRepresentasi = `${penerimaInfo.biaya_representasi.uraian} (Biaya Representasi)`;
                addBiaya(pegawaiId, uraianRepresentasi, penerimaInfo.biaya_representasi.harga, penerimaInfo.biaya_representasi.satuan, jumlahHariRepresentasi, totalBiayaRepresentasi, 'representasi');
            }

            if (pengeluaran.transportasi_nominal > 0) addBiaya(pegawaiId, `Biaya Transportasi (${pengeluaran.transportasi_jenis || 'N/A'})`, pengeluaran.transportasi_nominal, 'PP', '-', pengeluaran.transportasi_nominal, 'transportasi');
            if (pengeluaran.akomodasi_nominal > 0) addBiaya(pegawaiId, `Biaya Akomodasi (${pengeluaran.akomodasi_jenis || 'N/A'})`, pengeluaran.akomodasi_harga_satuan, 'Malam', pengeluaran.akomodasi_malam, pengeluaran.akomodasi_nominal, 'akomodasi');
            if (pengeluaran.kontribusi_nominal > 0) addBiaya(pegawaiId, `Biaya Kontribusi (${pengeluaran.kontribusi_jenis || 'N/A'})`, pengeluaran.kontribusi_nominal, 'OK', '-', pengeluaran.kontribusi_nominal, 'kontribusi');
            if (pengeluaran.lain_lain_nominal > 0) addBiaya(pegawaiId, `Biaya Lain-lain (${pengeluaran.lain_lain_uraian || 'N/A'})`, pengeluaran.lain_lain_nominal, 'OK', '-', pengeluaran.lain_lain_nominal, 'lain_lain');
        });

        // Hitung total dibayar
        rincianPerPegawai.forEach(pegawai => {
            pegawai.total_dibayar = pegawai.total_biaya - pegawai.panjar;
        });

        // 6. Ambil data pejabat
        const bendahara = await dbGet("SELECT nama_lengkap, nip FROM pegawai WHERE jabatan LIKE '%Bendahara Pengeluaran%' LIMIT 1");
        // PERBAIKAN: Ambil data PPTK berdasarkan pptk_id yang tersimpan di pembayaran
        const pptk = pembayaran.pptk_id
            ? await dbGet("SELECT nama_lengkap, nip FROM pegawai WHERE id = ?", [pembayaran.pptk_id])
            : await dbGet("SELECT nama_lengkap, nip FROM pegawai WHERE jabatan LIKE '%PPTK%' OR jabatan LIKE '%Pejabat Pelaksana Teknis Kegiatan%' LIMIT 1");
        const penggunaAnggaran = await dbGet("SELECT nama_lengkap, nip FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1");

        // 7. Gabungkan semua data
        const responseData = {
            pembayaran,
            terbilang: terbilang(pembayaran.nominal_bayar) + " Rupiah",
            anggaran: anggaran || {},
            spt: spt || {},
            rincian: Array.from(rincianPerPegawai.values()),
            pejabat: {
                bendahara: bendahara || { nama_lengkap: 'Belum Ditetapkan', nip: '-' },
                pptk: pptk || { nama_lengkap: 'Belum Ditetapkan', nip: '-' },
                penggunaAnggaran: penggunaAnggaran || { nama_lengkap: 'Belum Ditetapkan', nip: '-' }
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error(`[API ERROR] Gagal membuat data cetak untuk pembayaran id ${id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// Rute untuk halaman hasil pencarian (terproteksi)

module.exports = router;
