const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { isApiAuthenticated } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

const parseCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    
    const str = String(value).trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) {
        return parseFloat(str) || 0;
    }
    
    const cleaned = str.replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
};


// Helper functions getTingkatBiaya dan getKolomGolongan
const getTingkatBiaya = (pegawai) => {
    const jabatan = (pegawai.jabatan || '').toLowerCase().trim();
    if (jabatan.includes('kepala dinas')) {
        return 'Golongan B';
    }
    if (jabatan.startsWith('sekretaris') || jabatan.startsWith('kepala bagian') || jabatan.startsWith('kepala bidang')) {
        return 'Golongan C';
    }
    return 'Golongan D';
};

const getKolomGolongan = (tingkatBiaya) => {
    const mapping = {
        'Golongan B': 'gol_b',
        'Golongan C': 'gol_c',
        'Golongan D': 'gol_d',
    };
    return mapping[tingkatBiaya] || 'gol_d';
};

router.get('/api/laporan/check/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const sql = "SELECT COUNT(*) as count FROM laporan_perjadin WHERE spt_id = ?";
        const result = await dbGet(sql, [spt_id]);
        const exists = result && result.count > 0;
        res.json({ exists });
    } catch (error) {
        console.error(`[API ERROR] Gagal memeriksa laporan untuk SPT ID ${spt_id}: `, error);
        res.status(500).json({ message: 'Gagal memeriksa status laporan.' });
    }
});


// API BARU: Mengambil ID penandatangan laporan berdasarkan SPT ID
router.get('/api/laporan/signers/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const laporan = await dbGet('SELECT penandatangan_ids FROM laporan_perjadin WHERE spt_id = ?', [spt_id]);
        if (!laporan || !laporan.penandatangan_ids) {
            return res.json([]); // Tidak ada laporan atau tidak ada penandatangan, kembalikan array kosong
        }
        const signerIds = JSON.parse(laporan.penandatangan_ids);
        res.json(signerIds);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil penandatangan untuk SPT ID ${spt_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Mengambil semua laporan untuk register
router.get('/api/laporan', isApiAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        const totalResult = await dbGet("SELECT COUNT(*) as total FROM laporan_perjadin"); // Hitung total laporan
        const totalItems = totalResult ? totalResult.total : 0; // Hitung total item
        const totalPages = Math.ceil(totalItems / limit); // Hitung total halaman

        const sql = `
SELECT
l.id, l.judul, l.tanggal_laporan, l.spt_id,
    s.nomor_surat
            FROM laporan_perjadin l
            JOIN spt s ON l.spt_id = s.id
            ORDER BY l.tanggal_laporan DESC
LIMIT ? OFFSET ?
    `;
        const laporan = await dbAll(sql, [limit, offset]);

        res.json({
            data: laporan,
            pagination: { page, limit, totalItems, totalPages }
        });
    } catch (error) {
        console.error('[API ERROR] Gagal mengambil daftar laporan:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// --- Rute API Laporan Perjalanan Dinas ---

// GET: Mengambil data satu laporan berdasarkan SPT_ID (UNTUK FORM PEMBAYARAN)
router.get('/api/laporan/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const sqlLaporan = `SELECT * FROM laporan_perjadin WHERE spt_id = ? `;
        const laporan = await dbGet(sqlLaporan, [spt_id]);

        const spt = await dbGet(`SELECT lokasi_tujuan, tempat_berangkat FROM spt WHERE id = ? `, [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT terkait tidak ditemukan.' });
        }

        if (!laporan) {
            return res.status(404).json({ message: 'Belum ada laporan yang dibuat untuk SPT ini.' });
        }

        let penandatanganIds = [];
        try {
            penandatanganIds = JSON.parse(laporan.penandatangan_ids || '[]');
            if (!Array.isArray(penandatanganIds)) penandatanganIds = [];
        } catch (e) {
            console.warn(`[API WARN] Gagal parse penandatangan_ids untuk laporan id ${laporan.id}.`);
        }

        // PERBAIKAN: Ambil data dari tabel-tabel baru dan gabungkan
        const [transportasi, akomodasi, kontribusi, lainLain] = await Promise.all([
            dbAll('SELECT * FROM laporan_transportasi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_akomodasi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_kontribusi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_lain_lain WHERE laporan_id = ?', [laporan.id])
        ]);

        const pengeluaranMap = new Map();

        const allItems = [...transportasi, ...akomodasi, ...kontribusi, ...lainLain];
        allItems.forEach(item => {
            if (!pengeluaranMap.has(item.pegawai_id)) {
                pengeluaranMap.set(item.pegawai_id, { pegawai_id: item.pegawai_id });
            }
            const pengeluaranPegawai = pengeluaranMap.get(item.pegawai_id);

            if (item.hasOwnProperty('perusahaan')) { // Transportasi
                pengeluaranPegawai.transportasi_nominal = (pengeluaranPegawai.transportasi_nominal || 0) + item.nominal;
                pengeluaranPegawai.transportasi_jenis = item.jenis;
            } else if (item.hasOwnProperty('malam')) { // Akomodasi
                pengeluaranPegawai.akomodasi_nominal = (pengeluaranPegawai.akomodasi_nominal || 0) + item.nominal;
                pengeluaranPegawai.akomodasi_harga_satuan = item.harga_satuan;
                pengeluaranPegawai.akomodasi_malam = item.malam;
                pengeluaranPegawai.akomodasi_jenis = item.jenis;
            } else if (item.hasOwnProperty('uraian')) { // Lain-lain
                pengeluaranPegawai.lain_lain_nominal = (pengeluaranPegawai.lain_lain_nominal || 0) + item.nominal;
                pengeluaranPegawai.lain_lain_uraian = item.uraian;
            } else { // Kontribusi
                pengeluaranPegawai.kontribusi_nominal = (pengeluaranPegawai.kontribusi_nominal || 0) + item.nominal;
                pengeluaranPegawai.kontribusi_jenis = item.jenis;
            }
        });

        const pengeluaran = Array.from(pengeluaranMap.values());

        if (penandatanganIds.length === 0) {
            return res.json({ penerima: [], pengeluaran: pengeluaran });
        }

        const placeholders = penandatanganIds.map(() => '?').join(',');
        const pegawaiSql = `
            SELECT id, nama_lengkap, nip, jabatan, golongan
            FROM pegawai 
            WHERE id IN(${placeholders})
    `;
        const penerimaFromDb = await dbAll(pegawaiSql, penandatanganIds);

        // =================================================================
        // === LOGIKA PENCARIAN STANDAR BIAYA ===
        // =================================================================
        const lokasiTujuan = spt.lokasi_tujuan || '';
        let isDalamKota = false;
        let lokasiUntukQuery = lokasiTujuan;

        const locationsData = require('./public/data/locations.json');

        const cariJenisLokasi = (lokasi) => {
            const lokasiLower = lokasi.toLowerCase().trim();
            console.log(`[DEBUG LOKASI] Mencari jenis lokasi untuk: "${lokasi}"`);

            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        const locationLower = location.toLowerCase();
                        if (locationLower.includes(lokasiLower) || lokasiLower.includes(locationLower)) {
                            return { jenis: 'desa', nama: location, group: group.group };
                        }
                    }
                }
            }

            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    const groupLower = group.group.toLowerCase();
                    if (groupLower.includes(lokasiLower) || lokasiLower.includes(groupLower.replace('kecamatan', '').trim())) {
                        return { jenis: 'kecamatan', nama: group.group };
                    }
                }
            }

            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        const locationLower = location.toLowerCase();
                        const lokasiClean = lokasiLower.replace(/[.,]/g, '').trim(); // Hapus titik dan koma
                        const locationClean = locationLower.replace(/[.,]/g, '').trim();

                        if (locationClean.includes(lokasiClean) || lokasiClean.includes(locationClean) ||
                            (lokasiClean.includes('jakarta') && locationClean.includes('jakarta')) ||
                            (lokasiClean.includes('dki') && locationClean.includes('jakarta'))) {
                            return { jenis: 'kabupaten', nama: location, provinsi: group.group };
                        }
                    }
                }
            }

            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) {
                    const groupLower = group.group.toLowerCase();
                    const lokasiClean = lokasiLower.replace(/[.,]/g, '').trim();
                    const groupClean = groupLower.replace(/[.,]/g, '').trim();

                    if (groupClean === lokasiClean ||
                        (lokasiClean.includes('dki') && groupClean.includes('jakarta')) ||
                        (lokasiClean.includes('jakarta') && groupClean.includes('jakarta'))) {
                        return { jenis: 'provinsi', nama: group.group };
                    }
                }
            }

            console.log(`[DEBUG LOKASI] Jenis lokasi tidak dikenali untuk: ${lokasi} `);
            return { jenis: 'tidak_diketahui', nama: lokasi };
        };

        const infoLokasi = cariJenisLokasi(lokasiTujuan);
        console.log(`[LOKASI INFO] Untuk SPT ${spt_id}: `, infoLokasi);

        const cariStandarBiaya = async (tipeBiaya, lokasiQuery, isDalamKota) => {
            console.log(`[DEBUG STANDAR BIAYA] Mencari tipe ${tipeBiaya} untuk: "${lokasiQuery.trim()}"(dalam kota: ${isDalamKota})`);
            let result = null;
            if (tipeBiaya === 'A') {
                const queries = [
                    `SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' AND TRIM(UPPER(uraian)) = TRIM(UPPER(?))`,
                    `SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' AND TRIM(UPPER(uraian)) LIKE TRIM(UPPER(?))`
                ];
                const searchTerms = [lokasiQuery, `% ${lokasiQuery}% `];
                for (let i = 0; i < queries.length; i++) {
                    result = await dbGet(queries[i], [searchTerms[i]]);
                    if (result) break;
                }
            } else if (tipeBiaya === 'C') {
                const queries = [
                    `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) = TRIM(UPPER(?))`
                ];
                let provinsiQuery = lokasiQuery.trim();
                const lokasiLower = provinsiQuery.toLowerCase(); // "dki jakarta"
                if (lokasiLower.includes('jakarta') || lokasiLower.includes('dki')) {
                    result = await dbGet(queries[0], ['DKI Jakarta']);
                    if (!result) {
                        const jakartaFallbackQuery = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) LIKE '%JAKARTA%'`;
                        result = await dbGet(jakartaFallbackQuery, []);
                    }
                } else {
                    result = await dbGet(queries[0], [provinsiQuery]);
                }
                if (!result && lokasiLower.includes('kepulauan')) {
                    const provinsiTanpaKepulauan = provinsiQuery.replace(/kepulauan/gi, '').trim();
                    result = await dbGet(queries[0], [provinsiTanpaKepulauan]);
                }
                if (!result) {
                    const fallbackQuery = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
                    result = await dbGet(fallbackQuery, [`% ${provinsiQuery}% `]);
                }
            }
            return result;
        };

        let standarBiayaHarian;
        if (infoLokasi.jenis === 'desa' || infoLokasi.jenis === 'kecamatan') {
            const namaKecamatan = infoLokasi.jenis === 'desa' ? infoLokasi.group : infoLokasi.nama;
            const namaKecamatanClean = namaKecamatan.replace('Kecamatan', '').trim();
            console.log(`[INFO] Perjalanan Dalam Kota(Desa / Kecamatan) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'A' untuk: ${namaKecamatanClean} `);
            standarBiayaHarian = await cariStandarBiaya('A', namaKecamatanClean, true);
            isDalamKota = true;
            lokasiUntukQuery = namaKecamatanClean;
        } else if (infoLokasi.jenis === 'kabupaten') {
            const tempatBerangkat = spt.tempat_berangkat || 'Nanga Pinoh';
            const isSameRegion = infoLokasi.nama.toLowerCase().includes(tempatBerangkat.toLowerCase()) ||
                tempatBerangkat.toLowerCase().includes(infoLokasi.nama.toLowerCase()) ||
                (infoLokasi.nama.toLowerCase().includes('jakarta') && tempatBerangkat.toLowerCase().includes('jakarta'));
            const provinsiTujuan = (infoLokasi.provinsi || '').trim();
            if (isSameRegion) {
                console.log(`[INFO] Perjalanan Dalam Kota(Kabupaten) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'A' untuk: ${infoLokasi.nama} `);
                standarBiayaHarian = await cariStandarBiaya('A', infoLokasi.nama, true);
                isDalamKota = true;
            } else {
                console.log(`[INFO] Perjalanan Luar Daerah(Kabupaten) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'C' untuk: ${provinsiTujuan} `);
                standarBiayaHarian = await cariStandarBiaya('C', provinsiTujuan, false);
                isDalamKota = false;
            }
            lokasiUntukQuery = isDalamKota ? infoLokasi.nama.trim() : provinsiTujuan;
        } else if (infoLokasi.jenis === 'provinsi') {
            console.log(`[INFO] Perjalanan Luar Daerah(Provinsi) terdeteksi untuk SPT ID: ${spt_id}. Mencari Tipe Biaya 'C' untuk: ${infoLokasi.nama.trim()} `);
            standarBiayaHarian = await cariStandarBiaya('C', infoLokasi.nama.trim(), false);
            isDalamKota = false;
            lokasiUntukQuery = infoLokasi.nama.trim();
        } else {
            console.log(`[WARN] Jenis lokasi tidak dikenali untuk: ${lokasiTujuan}. Menggunakan logika fallback.`);

            if (lokasiTujuan.toLowerCase().includes('kecamatan') || lokasiTujuan.toLowerCase().includes('desa')) {
                isDalamKota = true;
                lokasiUntukQuery = lokasiTujuan.split(',').shift().trim();
                standarBiayaHarian = await cariStandarBiaya('A', lokasiUntukQuery, true);
            } else if (lokasiTujuan.includes(',')) {
                isDalamKota = false;
                lokasiUntukQuery = lokasiTujuan.split(',').pop().trim();
                standarBiayaHarian = await cariStandarBiaya('C', lokasiUntukQuery, false);
            } else {
                isDalamKota = true;
                lokasiUntukQuery = lokasiTujuan.split(',')[0].trim();
                standarBiayaHarian = await cariStandarBiaya('A', lokasiUntukQuery, true);
            }
        }

        if (!standarBiayaHarian) {
            console.warn(`[WARN] Standar biaya tidak ditemukan untuk: ${lokasiUntukQuery} (Jenis: ${infoLokasi.jenis}). Mencari fallback...`);
            if (isDalamKota) {
                standarBiayaHarian = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' LIMIT 1`);
            } else {
                standarBiayaHarian = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' LIMIT 1`);
            }
            if (!standarBiayaHarian) {
                console.error(`[ERROR] Standar biaya fallback juga tidak ditemukan!`);
                standarBiayaHarian = {
                    satuan: 'OH',
                    besaran: 0,
                    gol_a: 0,
                    gol_b: 0,
                    gol_c: 0,
                    gol_d: 0,
                    biaya_kontribusi: 0
                };
            }
        }

        // =================================================================
        // === LOGIKA BARU: Ambil Biaya Representasi untuk Kepala Dinas (FINAL) ===
        // =================================================================
        const biayaRepresentasiEselonII = await dbGet(
            `SELECT * FROM standar_biaya WHERE tipe_biaya = 'D' AND(TRIM(UPPER(uraian)) = 'PEJABAT ESELON II' OR TRIM(UPPER(uraian)) LIKE '%ESELON II%')`
        );

        let representasiInfo = null;
        if (!biayaRepresentasiEselonII) {
            console.warn(`[WARN] Standar Biaya Representasi(Tipe D, Eselon II) tidak ditemukan di database.Biaya representasi tidak akan diterapkan.`);
            representasiInfo = {
                uraian: 'Biaya Representasi (Eselon II)',
                harga: 0,
                satuan: 'OH'
            };
        } else {
            console.log(`[DEBUG REPRESENTASI] Standar biaya representasi ditemukan: `, biayaRepresentasiEselonII);
            representasiInfo = {
                uraian: biayaRepresentasiEselonII.uraian || 'Biaya Representasi (Eselon II)',
                harga: isDalamKota ? (biayaRepresentasiEselonII.biaya_kontribusi || 0) : (biayaRepresentasiEselonII.besaran || 0),
                satuan: biayaRepresentasiEselonII.satuan || 'OH'
            };
        }

        // =================================================================
        // === AKHIR DARI BLOK LOGIKA ===
        // =================================================================

        const penerimaMap = new Map(penerimaFromDb.map(p => [p.id.toString(), p]));

        const penerima = penandatanganIds
            .map(id => {
                const p = penerimaMap.get(id.toString());
                if (!p) return null;

                const tingkatBiaya = getTingkatBiaya(p);
                const kolomGolongan = getKolomGolongan(tingkatBiaya);

                let hargaSatuanHarian = 0;
                if (standarBiayaHarian) {
                    hargaSatuanHarian = standarBiayaHarian[kolomGolongan] || standarBiayaHarian.besaran || 0;
                }

                p.uang_harian = {
                    harga_satuan: hargaSatuanHarian,
                    satuan: standarBiayaHarian ? standarBiayaHarian.satuan : 'OH',
                    golongan: tingkatBiaya
                };

                if (p && p.jabatan && p.jabatan.toLowerCase().includes('kepala dinas')) {
                    p.biaya_representasi = representasiInfo;
                    console.log(`[DEBUG REPRESENTASI] Info representasi untuk ${p.nama_lengkap}: Harga = ${representasiInfo.harga} `);
                }

                return p;
            }).filter(Boolean);

        res.json({ penerima, pengeluaran });

    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil laporan by - spt - id ${spt_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// --- API BARU: Mengambil detail pengeluaran berdasarkan SPT & Standar Biaya (tanpa laporan) ---
router.get('/api/spt/:spt_id/expenditure-details', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const spt = await dbGet(`SELECT id, lokasi_tujuan, tempat_berangkat, lama_perjalanan FROM spt WHERE id = ?`, [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT terkait tidak ditemukan.' });
        }

        // Ambil semua pegawai yang ditugaskan (bukan pengikut)
        const pegawaiSql = `
            SELECT p.id, p.nama_lengkap, p.nip, p.jabatan, p.golongan
            FROM pegawai p
            JOIN spt_pegawai sp ON p.id = sp.pegawai_id
            WHERE sp.spt_id = ? AND sp.is_pengikut = 0
        `;
        const penerimaFromDb = await dbAll(pegawaiSql, [spt_id]);

        if (penerimaFromDb.length === 0) {
            return res.json({ penerima: [], pengeluaran: [] });
        }

        // =================================================================
        // === LOGIKA PENCARIAN STANDAR BIAYA (disalin dari /api/laporan/by-spt) ===
        // =================================================================
        const lokasiTujuan = spt.lokasi_tujuan || '';
        let isDalamKota = false;
        let lokasiUntukQuery = lokasiTujuan;

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

        const infoLokasi = cariJenisLokasi(lokasiTujuan);

        const cariStandarBiaya = async (tipeBiaya, lokasiQuery) => {
            let query = tipeBiaya === 'A' ? `SELECT * FROM standar_biaya WHERE tipe_biaya = 'A' AND TRIM(UPPER(uraian)) LIKE TRIM(UPPER(?))` : `SELECT * FROM standar_biaya WHERE tipe_biaya = 'C' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
            let params = [`%${lokasiQuery.trim()}%`];
            if (tipeBiaya === 'C' && (lokasiQuery.toLowerCase().includes('jakarta') || lokasiQuery.toLowerCase().includes('dki'))) {
                params = ['%JAKARTA%'];
            }
            return await dbGet(query, params);
        };

        let standarBiayaHarian;
        if (infoLokasi.jenis === 'desa' || infoLokasi.jenis === 'kecamatan') {
            const namaKecamatan = (infoLokasi.jenis === 'desa' ? infoLokasi.group : infoLokasi.nama).replace('Kecamatan', '').trim();
            standarBiayaHarian = await cariStandarBiaya('A', namaKecamatan);
            isDalamKota = true;
        } else if (infoLokasi.jenis === 'kabupaten') {
            const tempatBerangkat = spt.tempat_berangkat || 'Nanga Pinoh';
            const isSameRegion = infoLokasi.nama.toLowerCase().includes(tempatBerangkat.toLowerCase());
            standarBiayaHarian = isSameRegion ? await cariStandarBiaya('A', infoLokasi.nama) : await cariStandarBiaya('C', infoLokasi.provinsi);
            isDalamKota = isSameRegion;
        } else { // Provinsi atau tidak diketahui
            standarBiayaHarian = await cariStandarBiaya('C', infoLokasi.nama);
            isDalamKota = false;
        }

        if (!standarBiayaHarian) {
            standarBiayaHarian = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = ? LIMIT 1`, [isDalamKota ? 'A' : 'C']);
        }

        const biayaRepresentasiEselonII = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'D' AND(TRIM(UPPER(uraian)) = 'PEJABAT ESELON II' OR TRIM(UPPER(uraian)) LIKE '%ESELON II%')`);
        const representasiInfo = biayaRepresentasiEselonII ? { uraian: biayaRepresentasiEselonII.uraian, harga: isDalamKota ? (biayaRepresentasiEselonII.biaya_kontribusi || 0) : (biayaRepresentasiEselonII.besaran || 0), satuan: biayaRepresentasiEselonII.satuan } : null;

        // =================================================================
        // === AKHIR LOGIKA PENCARIAN STANDAR BIAYA ===
        // =================================================================

        const penerima = penerimaFromDb.map(p => {
            const tingkatBiaya = getTingkatBiaya(p);
            const kolomGolongan = getKolomGolongan(tingkatBiaya);
            let hargaSatuanHarian = 0;
            if (standarBiayaHarian) {
                hargaSatuanHarian = standarBiayaHarian[kolomGolongan] || standarBiayaHarian.besaran || 0;
            }
            p.uang_harian = { harga_satuan: hargaSatuanHarian, satuan: standarBiayaHarian ? standarBiayaHarian.satuan : 'OH', golongan: tingkatBiaya };
            if (p.jabatan && p.jabatan.toLowerCase().includes('kepala dinas') && representasiInfo) {
                p.biaya_representasi = representasiInfo;
            }
            return p;
        });

        // Buat struktur pengeluaran kosong, karena belum ada laporan
        const pengeluaran = penerima.map(p => ({
            pegawai_id: p.id,
            akomodasi_malam: spt.lama_perjalanan - 1, // Asumsi lama perjalanan - 1
            transportasi_nominal: 0,
            akomodasi_nominal: 0,
            kontribusi_nominal: 0,
            lain_lain_nominal: 0
        }));

        res.json({ penerima, pengeluaran });

    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil rincian pengeluaran untuk SPT ${spt_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat menghitung rincian.' });
    }
});

// GET: Mengambil data satu laporan untuk edit/cetak
router.get('/api/laporan/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `SELECT * FROM laporan_perjadin WHERE id = ? `;
        const laporan = await dbGet(sql, [req.params.id]);
        if (!laporan) return res.status(404).json({ message: 'Laporan tidak ditemukan.' });

        // Ambil lampiran dan data pegawai untuk cetak
        const lampiranSql = `SELECT * FROM laporan_lampiran WHERE laporan_id = ? `;
        laporan.lampiran = await dbAll(lampiranSql, [req.params.id]);

        // Ambil semua pegawai (pelaksana dan pengikut) dari SPT terkait
        if (laporan.spt_id) {
            const pegawaiSql = `
                SELECT p.id as pegawai_id, p.nama_lengkap, p.nip, sp.is_pengikut
                FROM spt_pegawai sp
                JOIN pegawai p ON sp.pegawai_id = p.id
                WHERE sp.spt_id = ?
    ORDER BY sp.urutan ASC
        `;
            laporan.pegawai = await dbAll(pegawaiSql, [laporan.spt_id]);

            // ANOMALI FIX: Ambil juga data pegawai yang dibatalkan untuk SPT ini
            // agar halaman cetak dapat memfilternya.
            const canceledPegawaiSql = `
                SELECT p.id as pegawai_id, p.nama_lengkap FROM pembatalan_spt ps
                JOIN pegawai p ON ps.pegawai_id = p.id
                WHERE ps.spt_id = ?
    `;
            laporan.pegawai_dibatalkan = await dbAll(canceledPegawaiSql, [laporan.spt_id]);
        }

        // PERBAIKAN: Hapus query ke tabel 'laporan_pengeluaran' yang sudah tidak ada
        laporan.transportasi = await dbAll('SELECT * FROM laporan_transportasi WHERE laporan_id = ?', [req.params.id]);
        laporan.akomodasi = await dbAll('SELECT * FROM laporan_akomodasi WHERE laporan_id = ?', [req.params.id]);
        laporan.kontribusi = await dbAll('SELECT * FROM laporan_kontribusi WHERE laporan_id = ?', [req.params.id]);
        laporan.lain_lain = await dbAll('SELECT * FROM laporan_lain_lain WHERE laporan_id = ?', [req.params.id]);
        res.json(laporan);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil laporan id ${req.params.id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// Konfigurasi Multer untuk laporan (berbeda dari upload Excel)
const laporanUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = 'public/uploads/laporan';
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `lampiran - ${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    })
});

// POST: Membuat laporan baru
router.post('/api/laporan', isApiAuthenticated, laporanUpload.array('lampiran', 10), async (req, res) => {
    const { pegawai, ...data } = req.body;

    try { // PERUBAHAN: Logika penyimpanan ke tabel-tabel baru
        await runQuery('BEGIN TRANSACTION');

        // Hapus kolom biaya lama dari tabel utama
        const laporanSql = `INSERT INTO laporan_perjadin(spt_id, tanggal_laporan, tempat_laporan, judul, dasar_perjalanan, tujuan_perjalanan, lama_dan_tanggal_perjalanan, deskripsi_kronologis, tempat_dikunjungi, hasil_dicapai, kesimpulan, penandatangan_ids) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const result = await runQuery(laporanSql, [
            data.spt_id, data.tanggal_laporan, data.tempat_laporan, data.judul, data.dasar_perjalanan, data.tujuan_perjalanan,
            data.lama_dan_tanggal_perjalanan, data.deskripsi_kronologis, data.tempat_dikunjungi,
            data.hasil_dicapai, data.kesimpulan, data.penandatangan_ids
        ]);

        const laporanId = result.lastID;

        // Simpan data pengeluaran ke tabel masing-masing
        if (pegawai) {
            for (const pegawaiId in pegawai) {
                const pengeluaran = pegawai[pegawaiId];
                if (pengeluaran.transportasi) {
                    for (const item of pengeluaran.transportasi) {
                        await runQuery(`
                            INSERT INTO laporan_transportasi
                                (laporan_id, pegawai_id, jenis, perusahaan, kode_boking, nomor_penerbangan, nomor_tiket, tanggal_tiket, terminal_berangkat, terminal_tiba, nominal, arah_perjalanan)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            laporanId, pegawaiId, item.jenis, item.perusahaan, item.kode_boking,
                            item.nomor_penerbangan, item.nomor_tiket, item.tanggal_tiket || null, item.terminal_berangkat,
                            item.terminal_tiba, item.nominal, item.arah_perjalanan
                        ]);
                    }
                }
                if (pengeluaran.akomodasi) {
                    for (const item of pengeluaran.akomodasi) {
                        await runQuery('INSERT INTO laporan_akomodasi (laporan_id, pegawai_id, jenis, nama, harga_satuan, malam, nominal) VALUES (?, ?, ?, ?, ?, ?, ?)', [laporanId, pegawaiId, item.jenis, item.nama, item.harga_satuan, item.malam, item.nominal]);
                    }
                }
                if (pengeluaran.kontribusi) {
                    for (const item of pengeluaran.kontribusi) {
                        await runQuery('INSERT INTO laporan_kontribusi (laporan_id, pegawai_id, jenis, nominal) VALUES (?, ?, ?, ?)', [laporanId, pegawaiId, item.jenis, item.nominal]);
                    }
                }
                if (pengeluaran.lain_lain) {
                    for (const item of pengeluaran.lain_lain) {
                        await runQuery('INSERT INTO laporan_lain_lain (laporan_id, pegawai_id, uraian, tarif_satuan, jumlah_hari, nominal, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?)', [laporanId, pegawaiId, item.uraian, parseCurrency(item.tarif_satuan), item.jumlah_hari, parseCurrency(item.nominal), item.keterangan || '']);
                    }
                }
            }
        }

        if (req.files && req.files.length > 0) {
            const lampiranSql = 'INSERT INTO laporan_lampiran (laporan_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)';
            for (const file of req.files) {
                const filePath = file.path.replace(/\\/g, "/").replace('public/', '');
                await runQuery(lampiranSql, [laporanId, filePath, file.originalname, file.mimetype]);
            }
        }

        await runQuery('COMMIT');
        res.status(201).json({ message: 'Laporan berhasil disimpan!', laporanId: laporanId });
    } catch (error) {
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
        }
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('[API ERROR] Gagal menyimpan laporan:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// --- FUNGSI BARU: Untuk menghitung ulang dan memperbarui pembayaran terkait ---
/**
 * Menghitung ulang dan memperbarui nominal bukti pembayaran yang terkait dengan SPT.
 * Fungsi ini dipanggil setelah laporan perjalanan dinas diperbarui.
 * @param {number} sptId - ID dari SPT yang laporannya baru saja diperbarui.
 */
const recalculateAndUpdatePayment = async (sptId) => {
    console.log(`[SYNC - PAYMENT] Memulai sinkronisasi pembayaran untuk SPT ID: ${sptId} `);
    try {
        // 1. Cek apakah ada bukti pembayaran yang terkait dengan SPT ini
        const payment = await dbGet("SELECT id, panjar_data FROM pembayaran WHERE spt_id = ?", [sptId]);
        if (!payment) {
            console.log(`[SYNC - PAYMENT] Tidak ada bukti pembayaran ditemukan untuk SPT ID: ${sptId}. Proses dihentikan.`);
            return;
        }

        // 2. Jika ada, ambil data laporan yang sudah diperbarui (menggunakan logika yang sama dengan API)
        const laporan = await dbGet(`SELECT * FROM laporan_perjadin WHERE spt_id = ? `, [sptId]);
        if (!laporan) {
            console.log(`[SYNC - PAYMENT] Tidak ada laporan ditemukan untuk SPT ID: ${sptId}. Tidak dapat menghitung ulang.`);
            return;
        }

        // Ambil data pengeluaran yang sudah dinormalisasi
        const [transportasi, akomodasi, kontribusi, lainLain] = await Promise.all([
            dbAll('SELECT * FROM laporan_transportasi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_akomodasi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_kontribusi WHERE laporan_id = ?', [laporan.id]),
            dbAll('SELECT * FROM laporan_lain_lain WHERE laporan_id = ?', [laporan.id])
        ]);

        // Ambil data penandatangan dari laporan
        const penandatanganIds = JSON.parse(laporan.penandatangan_ids || '[]');
        if (penandatanganIds.length === 0) {
            console.log(`[SYNC - PAYMENT] Tidak ada penandatangan di laporan.Nominal diatur ke 0.`);
            await runQuery("UPDATE pembayaran SET nominal_bayar = 0 WHERE id = ?", [payment.id]);
            return;
        }

        // Ambil detail pegawai penandatangan
        const placeholders = penandatanganIds.map(() => '?').join(',');
        const penerimaFromDb = await dbAll(`SELECT id, nama_lengkap, nip, jabatan, golongan FROM pegawai WHERE id IN(${placeholders})`, penandatanganIds);

        // 3. Hitung ulang total biaya (mirip logika di /api/laporan/by-spt/:spt_id)
        let grandTotalDibayar = 0;
        const panjarMap = new Map(JSON.parse(payment.panjar_data || '[]').map(p => [p.pegawai_id.toString(), p.nilai_panjar]));

        for (const penerima of penerimaFromDb) {
            let totalBiayaPegawai = 0;

            // Kalkulasi Uang Harian (perlu fungsi helper atau logika inline)
            // Untuk sementara, kita asumsikan uang harian sudah termasuk dalam rincian lain
            // atau kita bisa mereplikasi logika pencarian standar biaya di sini.
            // Untuk kesederhanaan, kita akan menjumlahkan dari tabel rincian saja.

            const totalTransportasi = transportasi.filter(t => t.pegawai_id === penerima.id).reduce((sum, item) => sum + (item.nominal || 0), 0);
            const totalAkomodasi = akomodasi.filter(a => a.pegawai_id === penerima.id).reduce((sum, item) => sum + (item.nominal || 0), 0);
            const totalKontribusi = kontribusi.filter(k => k.pegawai_id === penerima.id).reduce((sum, item) => sum + (item.nominal || 0), 0);
            const totalLainLain = lainLain.filter(l => l.pegawai_id === penerima.id).reduce((sum, item) => sum + (item.nominal || 0), 0);

            totalBiayaPegawai = totalTransportasi + totalAkomodasi + totalKontribusi + totalLainLain;

            // Ambil panjar untuk pegawai ini
            const panjarPegawai = panjarMap.get(penerima.id.toString()) || 0;

            // Hitung jumlah yang harus dibayar untuk pegawai ini
            const jumlahDibayarPegawai = totalBiayaPegawai - panjarPegawai;
            grandTotalDibayar += jumlahDibayarPegawai;
        }

        // 4. Update tabel pembayaran dengan nominal baru
        console.log(`[SYNC - PAYMENT] Nominal baru dihitung: ${grandTotalDibayar}. Memperbarui pembayaran ID: ${payment.id} `);
        await runQuery("UPDATE pembayaran SET nominal_bayar = ? WHERE id = ?", [grandTotalDibayar, payment.id]);

        console.log(`[SYNC - PAYMENT] Sinkronisasi pembayaran untuk SPT ID: ${sptId} berhasil.`);

    } catch (error) {
        console.error(`[SYNC - PAYMENT - ERROR] Gagal menyinkronkan pembayaran untuk SPT ID ${sptId}: `, error);
        // Error di sini tidak boleh menghentikan respons utama ke pengguna, jadi kita hanya log.
    }
};


// PUT: Memperbarui laporan yang ada
router.put('/api/laporan/:id', isApiAuthenticated, laporanUpload.array('lampiran', 10), async (req, res) => {
    const { id } = req.params;
    const { pegawai, ...data } = req.body;
    const deletedFiles = data.deleted_files ? JSON.parse(data.deleted_files) : [];
    let sptIdForSync = null; // Variabel untuk menyimpan spt_id

    try { // PERUBAHAN: Logika update ke tabel-tabel baru
        await runQuery('BEGIN TRANSACTION');

        // --- PERBAIKAN: Tambahkan validasi di sisi server ---
        // Cek apakah ada bukti pembayaran terkait SEBELUM melakukan perubahan.
        const sptIdFromForm = data.spt_id || (await dbGet("SELECT spt_id FROM laporan_perjadin WHERE id = ?", [id]))?.spt_id;
        if (sptIdFromForm) {
            const paymentCheck = await dbGet("SELECT COUNT(*) as count FROM pembayaran WHERE spt_id = ?", [sptIdFromForm]);
            if (paymentCheck && paymentCheck.count > 0) {
                // Lemparkan error yang akan ditangkap oleh blok catch dan dikirim ke klien.
                throw new Error("Aksi Diblokir: Laporan ini tidak dapat diubah karena sudah memiliki bukti bayar terkait. Hapus terlebih dahulu bukti bayar jika ingin mengedit laporan.");
            }
        }
        // --- AKHIR PERBAIKAN ---


        // 1. Hapus file lama yang diminta untuk dihapus
        if (deletedFiles.length > 0) {
            const placeholders = deletedFiles.map(() => '?').join(',');
            const filesToDelete = await dbAll(`SELECT file_path FROM laporan_lampiran WHERE id IN(${placeholders})`, deletedFiles);

            for (const file of filesToDelete) {
                const oldFilePath = path.join(__dirname, '../../public', file.file_path);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            await runQuery(`DELETE FROM laporan_lampiran WHERE id IN(${placeholders})`, deletedFiles);
        }

        // Ambil spt_id sebelum update, untuk sinkronisasi nanti
        const oldLaporan = await dbGet("SELECT spt_id FROM laporan_perjadin WHERE id = ?", [id]);
        if (oldLaporan) {
            sptIdForSync = oldLaporan.spt_id;
        }

        // 2. Update data laporan utama
        // Hapus kolom biaya lama dari query update
        const updateFields = [
            'tanggal_laporan = ?', 'tempat_laporan = ?', 'judul = ?',
            'dasar_perjalanan = ?', 'tujuan_perjalanan = ?', 'lama_dan_tanggal_perjalanan = ?',
            'deskripsi_kronologis = ?', 'tempat_dikunjungi = ?', 'hasil_dicapai = ?',
            'kesimpulan = ?', 'penandatangan_ids = ?'
        ];

        const updateValues = [
            data.tanggal_laporan,
            data.tempat_laporan,
            data.judul,
            data.dasar_perjalanan,
            data.tujuan_perjalanan,
            data.lama_dan_tanggal_perjalanan,
            data.deskripsi_kronologis,
            data.tempat_dikunjungi,
            data.hasil_dicapai,
            data.kesimpulan,
            data.penandatangan_ids,
            id
        ];

        await runQuery(`UPDATE laporan_perjadin SET ${updateFields.join(', ')} WHERE id = ? `, updateValues);

        // 3. Hapus semua data pengeluaran lama dan masukkan yang baru
        await runQuery('DELETE FROM laporan_transportasi WHERE laporan_id = ?', [id]);
        await runQuery('DELETE FROM laporan_akomodasi WHERE laporan_id = ?', [id]);
        await runQuery('DELETE FROM laporan_kontribusi WHERE laporan_id = ?', [id]);
        await runQuery('DELETE FROM laporan_lain_lain WHERE laporan_id = ?', [id]);

        if (pegawai) {
            for (const pegawaiId in pegawai) {
                const pengeluaran = pegawai[pegawaiId];
                if (pengeluaran.transportasi) {
                    for (const item of pengeluaran.transportasi) {
                        await runQuery(`
                            INSERT INTO laporan_transportasi
                                (laporan_id, pegawai_id, jenis, perusahaan, kode_boking, nomor_penerbangan, nomor_tiket, tanggal_tiket, terminal_berangkat, terminal_tiba, nominal, arah_perjalanan)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            id, pegawaiId, item.jenis, item.perusahaan, item.kode_boking,
                            item.nomor_penerbangan, item.nomor_tiket, item.tanggal_tiket || null, item.terminal_berangkat,
                            item.terminal_tiba, item.nominal, item.arah_perjalanan
                        ]);
                    }
                }
                if (pengeluaran.akomodasi) {
                    for (const item of pengeluaran.akomodasi) {
                        await runQuery('INSERT INTO laporan_akomodasi (laporan_id, pegawai_id, jenis, nama, lokasi_hotel, tanggal_checkIn, tanggal_checkOut, harga_satuan, malam, nominal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, pegawaiId, item.jenis, item.nama, item.lokasi_hotel, item.tanggal_checkIn || null, item.tanggal_checkOut || null, parseCurrency(item.harga_satuan), item.malam, parseCurrency(item.nominal)]);
                    }
                }
                if (pengeluaran.kontribusi) {
                    for (const item of pengeluaran.kontribusi) {
                        await runQuery('INSERT INTO laporan_kontribusi (laporan_id, pegawai_id, jenis, nominal) VALUES (?, ?, ?, ?)', [id, pegawaiId, item.jenis, parseCurrency(item.nominal)]);
                    }
                }
                if (pengeluaran.lain_lain) {
                    for (const item of pengeluaran.lain_lain) {
                        await runQuery('INSERT INTO laporan_lain_lain (laporan_id, pegawai_id, uraian, tarif_satuan, jumlah_hari, nominal, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, pegawaiId, item.uraian, parseCurrency(item.tarif_satuan), item.jumlah_hari, parseCurrency(item.nominal), item.keterangan || '']);
                    }
                }
            }
        }

        // 4. Simpan lampiran baru
        if (req.files && req.files.length > 0) {
            const lampiranSql = 'INSERT INTO laporan_lampiran (laporan_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)';
            for (const file of req.files) {
                const filePath = file.path.replace(/\\/g, "/").replace('public/', '');
                await runQuery(lampiranSql, [id, filePath, file.originalname, file.mimetype]);
            }
        }

        await runQuery('COMMIT');

        // --- PERUBAHAN: Panggil fungsi sinkronisasi setelah commit berhasil ---
        if (sptIdForSync) {
            await recalculateAndUpdatePayment(sptIdForSync);
        }
        res.json({ message: 'Laporan berhasil diperbarui.' });
    } catch (error) {
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
        }
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('Error updating laporan:', error);
        res.status(500).json({ message: 'Gagal memperbarui laporan.', error: error.message });
    }
});


// DELETE: Menghapus laporan
router.delete('/api/laporan/:id', isApiAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // Ambil semua path lampiran terkait sebelum menghapus
        const lampiran = await dbAll('SELECT file_path FROM laporan_lampiran WHERE laporan_id = ?', [id]);

        // Hapus record laporan (akan menghapus lampiran via CASCADE)
        const result = await runQuery('DELETE FROM laporan_perjadin WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
        }

        // Hapus file fisik dari server
        if (lampiran && lampiran.length > 0) {
            for (const item of lampiran) {
                const filePath = path.join(__dirname, '../../public', item.file_path);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }
        res.json({ message: 'Laporan berhasil dihapus.' });
    } catch (error) {
        console.error(`[API ERROR] Gagal menghapus laporan id ${id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// =================================================================
// API ENDPOINTS UNTUK UANG MUKA (PANJAR)
// =================================================================

// GET: Mengambil semua data panjar

module.exports = router;
