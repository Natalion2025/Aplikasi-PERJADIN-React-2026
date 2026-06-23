const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { isApiAuthenticated, isApiAdminOrSuperAdmin } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});


// Multer upload config
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    })
});

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

const cleanDecimal = (val) => {
    if (val === null || val === undefined) return null;
    let str = String(val).trim();
    if (!str || str === '-') return null;

    // Hapus simbol mata uang seperti "Rp", spasi, dan karakter non-numerik kecuali titik, koma, minus
    str = str.replace(/Rp\.?/gi, '').replace(/\s+/g, '');

    if (str.includes('.') && str.includes(',')) {
        // Format Indonesia: 20.000,50 -> 20000.50
        str = str.replace(/\./g, '').replace(/,/g, '.');
    } else if (str.includes(',')) {
        // Cek jika koma adalah ribuan (misal: 20,000) atau desimal (misal: 20,50)
        const parts = str.split(',');
        if (parts[1] && parts[1].length === 3) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(/,/g, '.');
        }
    } else if (str.includes('.')) {
        // Cek jika titik adalah pemisah ribuan (misal: 20.000)
        const parts = str.split('.');
        if (parts[1] && parts[1].length === 3) {
            str = str.replace(/\./g, '');
        }
    }

    const parsed = parseFloat(str);
    return isNaN(parsed) ? null : parsed;
};

router.get('/api/standar-biaya', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM standar_biaya ORDER BY tipe_biaya, id", []);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data standar biaya:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET: Mengambil data standar biaya berdasarkan tipe
router.get('/api/standar-biaya/:tipe', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM standar_biaya WHERE tipe_biaya = ? ORDER BY id", [req.params.tipe]);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data standar biaya:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * Menjalankan query dengan penanganan retry jika database terkunci.
 * @param {string} sql - Perintah SQL.
 * @param {Array} params - Parameter untuk SQL.
 * @returns {Promise<object>}
 */
const runQueryWithRetry = (sql, params = []) => new Promise((resolve, reject) => {
    const tryQuery = (retries = 5) => {
        db.run(sql, params, function (err) {
            if (err && err.code === 'SQLITE_BUSY' && retries > 0) {
                console.warn(`[DB WARN] Database sibuk, mencoba lagi... Sisa percobaan: ${retries - 1} `);
                setTimeout(() => tryQuery(retries - 1), 100); // Tunggu 100ms sebelum mencoba lagi
            } else if (err) reject(err);
            else resolve(this);
        });
    };
    tryQuery();
});

// POST: Upload data standar biaya dari Excel
router.post('/api/standar-biaya/upload', isApiAuthenticated, isApiAdminOrSuperAdmin, upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const tipeBiaya = req.body.tipe_biaya;
    const filePath = req.file.path;

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];
        const standarBiayaData = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const headerRowsToSkip = (['A', 'B', 'E', 'F', 'G', 'H', 'I', 'J'].includes(tipeBiaya)) ? 2 : 1;

            if (rowNumber > headerRowsToSkip) {
                // PERBAIKAN: Paksa pembacaan setiap sel sebagai string untuk menghindari
                // masalah tipe data (misal: "Eselon II" dibaca sebagai angka).
                const rowData = [];
                // PERBAIKAN FINAL: Buat pembacaan sel lebih aman dengan memeriksa nilai null.
                // Ini mencegah error "Cannot read properties of null" pada sel kosong atau sel gabungan.
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowData[colNumber] = (cell.value !== null && cell.value !== undefined) ? cell.text : '';
                });

                let data = {};
                if (tipeBiaya === 'A' || tipeBiaya === 'B') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: cleanDecimal(rowData[8])
                    };
                } else if (tipeBiaya === 'C') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,
                        provinsi: rowData[2] || null,
                        satuan: rowData[3] || null,
                        gol_a: null,
                        gol_b: null,
                        gol_c: null,
                        gol_d: null,
                        besaran: cleanDecimal(rowData[4]),
                        biaya_kontribusi: cleanDecimal(rowData[5])
                    };
                } else if (tipeBiaya === 'D') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: null,
                        gol_b: null,
                        gol_c: null,
                        gol_d: null,
                        besaran: cleanDecimal(rowData[4]),
                        biaya_kontribusi: cleanDecimal(rowData[5])
                    };
                } else if (tipeBiaya === 'E') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,
                        provinsi: rowData[2] || null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'F') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'G') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'H') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'I') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'J') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: rowData[2] || null,
                        provinsi: null,
                        satuan: rowData[3] || null,
                        gol_a: cleanDecimal(rowData[4]),
                        gol_b: cleanDecimal(rowData[5]),
                        gol_c: cleanDecimal(rowData[6]),
                        gol_d: cleanDecimal(rowData[7]),
                        besaran: null,
                        biaya_kontribusi: null
                    };
                } else if (tipeBiaya === 'K') {
                    data = {
                        tipe_biaya: tipeBiaya,
                        uraian: null,
                        provinsi: rowData[2] || null,
                        satuan: rowData[3] || null,
                        gol_a: null,
                        gol_b: null,
                        gol_c: null,
                        gol_d: null,
                        besaran: cleanDecimal(rowData[4]),
                        biaya_kontribusi: null
                    };
                }

                standarBiayaData.push(data);
            }
        });

        // PERBAIKAN: Gunakan transaksi untuk memastikan operasi atomik
        await runQueryWithRetry('BEGIN TRANSACTION');
        await runQueryWithRetry('DELETE FROM standar_biaya WHERE tipe_biaya = ?', [tipeBiaya]);

        for (const data of standarBiayaData) {
            const sql = `INSERT INTO standar_biaya
    (tipe_biaya, uraian, provinsi, satuan, gol_a, gol_b, gol_c, gol_d, besaran, biaya_kontribusi)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await runQuery(sql, [
                data.tipe_biaya,
                data.uraian,
                data.provinsi,
                data.satuan,
                data.gol_a,
                data.gol_b,
                data.gol_c,
                data.gol_d,
                data.besaran,
                data.biaya_kontribusi
            ]);
        }
        await runQueryWithRetry('COMMIT');

        fs.unlinkSync(filePath);

        res.json({ message: 'Data standar biaya berhasil diupload dan disimpan.' });
    } catch (error) {
        console.error('[API ERROR] Gagal memproses file Excel:', error);
        // Rollback transaksi jika terjadi error
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses file Excel.' });
    }
});

// GET: Download template standar biaya
// PERBAIKAN: Endpoint ini dipindahkan ke luar dari middleware isApiAuthenticated
// karena request dari tag <a> tidak membawa cookie sesi secara default.
// Keamanan tetap terjaga karena halaman standar-biaya itu sendiri sudah diproteksi oleh isAuthenticated.
router.get('/api/standar-biaya/template/:tipe', (req, res) => {
    const tipeBiaya = req.params.tipe.toUpperCase();

    // PERBAIKAN: Gunakan map untuk menentukan nama file secara dinamis
    const templateMap = {
        'A': 'A_Template Uang Harian Dalam Kota_Kabupaten.xlsx',
        'B': 'B_Template Biaya Penginapan Dalam Kota_Kabupaten.xlsx',
        'C': 'C_Template Uang Harian Dalam Negeri.xlsx',
        'D': 'D_Template Biaya Uang Representasi.xlsx',
        'E': 'E_Template Biaya Penginapan Dalam Negeri.xlsx',
        'F': 'F_Template Biaya Transportasi Kab_Kecamatan.xlsx',
        'G': 'G_Template Biaya Transportasi Ibu Kota_Kecamatan_Desa.xlsx',
        'H': 'H_Template Biaya Tiket Pesawat Dalam Negeri PP dari Pontianak.xlsx',
        'I': 'I_Template Biaya Tiket Pesawat Dalam Negeri PP dari Jakarta (Transit).xlsx',
        'J': 'J_Template Biaya Transportasi Dalam Provinsi PP dari Melawi.xlsx',
        'K': 'K_Template Biaya Taksi Dalam Negeri.xlsx',
    };

    const fileName = templateMap[tipeBiaya];

    if (!fileName) {
        return res.status(404).send(`Template untuk tipe ${tipeBiaya} tidak didefinisikan.`);
    }

    const filePath = path.join(__dirname, '../../public/templates', fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath, fileName);
    } else {
        console.error(`[DOWNLOAD ERROR] Template tidak ditemukan di path: ${filePath} `);
        res.status(404).send(`Template untuk tipe ${tipeBiaya} tidak ditemukan.`);
    }
});

// --- API BARU: Mendapatkan Standar Biaya Akomodasi per Pegawai untuk SPT ---
router.get('/api/spt/:spt_id/accommodation-standards', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const spt = await dbGet(`SELECT lokasi_tujuan, tempat_berangkat FROM spt WHERE id = ? `, [spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
        }

        const pegawaiSql = `
            SELECT p.id, p.jabatan, p.golongan
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ?
    `;
        const pegawaiList = await dbAll(pegawaiSql, [spt_id]);

        const locationsData = require('./public/data/locations.json');

        const cariJenisLokasi = (lokasi) => {
            const lokasiLower = lokasi.toLowerCase().trim();
            for (const group of locationsData) {
                if (group.group.toLowerCase().includes('kecamatan')) {
                    for (const location of group.locations) {
                        if (location.toLowerCase().includes(lokasiLower) || lokasiLower.includes(location.toLowerCase())) {
                            return { jenis: 'desa', nama: location, group: group.group };
                        }
                    }
                    if (group.group.toLowerCase().includes(lokasiLower) || lokasiLower.includes(group.group.toLowerCase().replace('kecamatan', '').trim())) {
                        return { jenis: 'kecamatan', nama: group.group };
                    }
                }
            }
            for (const group of locationsData) {
                if (!group.group.toLowerCase().includes('kecamatan')) { // Provinsi
                    for (const location of group.locations) {
                        if (location.toLowerCase().includes(lokasiLower) || lokasiLower.includes(location.toLowerCase())) {
                            return { jenis: 'kabupaten', nama: location, provinsi: group.group };
                        }
                    }
                    if (group.group.toLowerCase() === lokasiLower) {
                        return { jenis: 'provinsi', nama: group.group };
                    }
                }
            }
            return { jenis: 'tidak_diketahui', nama: lokasi };
        };

        const infoLokasi = cariJenisLokasi(spt.lokasi_tujuan || '');

        // PERBAIKAN: Membuat fungsi pencarian standar biaya lebih tangguh
        const cariStandarAkomodasi = async (tipeBiaya, lokasiQuery) => {
            let query = '';
            // Bersihkan query dari kata-kata umum dan spasi berlebih
            const cleanLokasiQuery = lokasiQuery.replace(/kabupaten|kota|kab\.?/gi, '').trim();
            let params = [`% ${cleanLokasiQuery}% `];

            if (tipeBiaya === 'B') { // Dalam kota
                // Cari kecocokan pada uraian yang sudah dibersihkan juga
                query = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'B' AND REPLACE(REPLACE(REPLACE(TRIM(UPPER(uraian)), 'KABUPATEN', ''), 'KOTA', ''), 'KAB.', '') LIKE TRIM(UPPER(?))`;
            } else if (tipeBiaya === 'E') { // Luar kota
                query = `SELECT * FROM standar_biaya WHERE tipe_biaya = 'E' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
                // PERBAIKAN: Tangani kasus khusus untuk Jakarta
                const lokasiLower = cleanLokasiQuery.toLowerCase();
                if (lokasiLower.includes('dki') || lokasiLower.includes('jakarta')) {
                    console.log(`[DEBUG] Kueri Jakarta terdeteksi.Mengubah pencarian menjadi '%JAKARTA%'`);
                    params = ['%JAKARTA%'];
                }
            } else return null; // Tipe biaya tidak valid untuk akomodasi

            let result = await dbGet(query, params);
            if (!result) {
                // Jika tidak ketemu, coba cari dengan query yang lebih umum tanpa pembersihan
                const fallbackQuery = tipeBiaya === 'B' ? `SELECT * FROM standar_biaya WHERE tipe_biaya = 'B' AND TRIM(UPPER(uraian)) LIKE TRIM(UPPER(?))` : `SELECT * FROM standar_biaya WHERE tipe_biaya = 'E' AND TRIM(UPPER(provinsi)) LIKE TRIM(UPPER(?))`;
                result = await dbGet(fallbackQuery, [`% ${lokasiQuery}% `]);
            }

            return result;
        };

        let standarAkomodasi;
        if (infoLokasi.jenis === 'desa' || infoLokasi.jenis === 'kecamatan') {
            const namaKecamatan = (infoLokasi.jenis === 'desa' ? infoLokasi.group : infoLokasi.nama).replace('Kecamatan', '').trim();
            standarAkomodasi = await cariStandarAkomodasi('B', namaKecamatan);
        } else if (infoLokasi.jenis === 'kabupaten') {
            const tempatBerangkat = spt.tempat_berangkat || 'Nanga Pinoh';
            const isSameRegion = infoLokasi.nama.toLowerCase().includes(tempatBerangkat.toLowerCase());
            if (isSameRegion) {
                standarAkomodasi = await cariStandarAkomodasi('B', infoLokasi.nama);
            } else {
                standarAkomodasi = await cariStandarAkomodasi('E', infoLokasi.provinsi);
            }
        } else if (infoLokasi.jenis === 'provinsi') {
            standarAkomodasi = await cariStandarAkomodasi('E', infoLokasi.nama);
        } else {
            // Fallback: Asumsikan perjalanan luar negeri jika lokasi tidak terdefinisi dengan jelas
            standarAkomodasi = await cariStandarAkomodasi('E', spt.lokasi_tujuan.split(',').pop().trim());
        }

        if (!standarAkomodasi) {
            // PERBAIKAN: Jika masih tidak ditemukan, berikan fallback ke standar biaya pertama yang ada daripada 404
            console.warn(`[WARN] Standar biaya akomodasi untuk "${spt.lokasi_tujuan}" tidak ditemukan.Menggunakan fallback...`);
            standarAkomodasi = await dbGet(`SELECT * FROM standar_biaya WHERE tipe_biaya = 'E' OR tipe_biaya = 'B' ORDER BY id LIMIT 1`);
            if (!standarAkomodasi) {
                return res.status(404).json({ message: `Standar biaya akomodasi untuk lokasi "${spt.lokasi_tujuan}" tidak ditemukan, dan tidak ada data standar biaya fallback yang tersedia.` });
            }
        }

        const accommodationStandards = {};
        pegawaiList.forEach(pegawai => {
            const tingkatBiaya = getTingkatBiaya(pegawai);
            const kolomGolongan = getKolomGolongan(tingkatBiaya);
            const harga = standarAkomodasi[kolomGolongan] || 0;
            accommodationStandards[pegawai.id] = harga;
        });

        res.json(accommodationStandards);

    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil standar akomodasi untuk SPT ID ${spt_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// --- Rute API Laporan Perjalanan Dinas ---

// API BARU: Cek apakah laporan sudah ada untuk SPT tertentu

module.exports = router;
