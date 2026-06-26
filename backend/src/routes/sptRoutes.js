const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const terbilang = require('angka-menjadi-terbilang');
const { isApiAuthenticated, isApiAdminOrSuperAdmin } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

router.get('/api/spt/active-count', isApiAuthenticated, async (req, res) => {
    try {
        const userNip = req.session.user?.nip;
        if (!userNip) {
            return res.json({ count: 0 });
        }
        const pegawai = await dbGet('SELECT id FROM pegawai WHERE nip = ?', [userNip]);
        if (!pegawai) {
            return res.json({ count: 0 });
        }
        const query = `
            SELECT COUNT(DISTINCT s.id) as count
            FROM spt s
            JOIN spt_pegawai sp ON s.id = sp.spt_id
            LEFT JOIN laporan_perjadin lp ON s.id = lp.spt_id
            WHERE
                sp.pegawai_id = ?
                AND lp.id IS NULL
                AND s.status != 'dibatalkan'
        `;
        const result = await dbGet(query, [pegawai.id]);
        res.json({ count: result.count || 0 });
    } catch (error) {
        console.error('[API NOTIF ERROR] Gagal mengambil hitungan SPT aktif:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil notifikasi.' });
    }
});

// GET: Mengambil semua data SPT untuk ditampilkan di register
router.get('/api/spt', isApiAuthenticated, async (req, res) => {
    const usePagination = req.query.limit !== '0' && req.query.limit !== undefined;
    const limit = usePagination ? (parseInt(req.query.limit, 10) || 5) : 0;
    const page = parseInt(req.query.page) || 1;
    const offset = usePagination ? (page - 1) * limit : 0;

    try {
        const sptsSql = `
            SELECT
                s.id, s.nomor_surat, s.tanggal_surat, s.maksud_perjalanan, s.lokasi_tujuan,
                s.tanggal_berangkat, s.tanggal_kembali, s.status, s.keterangan,
                a.mata_anggaran_kode,
                COALESCE(pj.nama, pg_pejabat.nama_lengkap) as pejabat_nama,
                COALESCE(pj.jabatan, pg_pejabat.jabatan) as pejabat_jabatan,
                (SELECT COUNT(*) FROM laporan_perjadin WHERE spt_id = s.id) as laporan_count,
                (SELECT COUNT(*) FROM pembayaran WHERE spt_id = s.id) as pembayaran_count,
                COALESCE(CONCAT('[', (SELECT GROUP_CONCAT(JSON_OBJECT('id', p.id, 'nama_lengkap', p.nama_lengkap, 'nip', p.nip)) FROM spt_pegawai sp_inner JOIN pegawai p ON sp_inner.pegawai_id = p.id WHERE sp_inner.spt_id = s.id), ']'), '[]') as pegawai_json
            FROM spt s
            LEFT JOIN anggaran a ON s.anggaran_id = a.id
            LEFT JOIN pejabat pj ON s.pejabat_pemberi_tugas_id = pj.id
            LEFT JOIN pegawai pg_pejabat ON s.pejabat_pemberi_tugas_id = pg_pejabat.id
            GROUP BY s.id
            ORDER BY s.tanggal_surat DESC, s.id DESC
        ` + (usePagination ? ' LIMIT ? OFFSET ?' : '');
        const params = usePagination ? [limit, offset] : [];
        const spts = await dbAll(sptsSql, params);

        for (const spt of spts) {
            if (spt.pegawai_json) {
                try {
                    spt.pegawai = JSON.parse(spt.pegawai_json);
                } catch (e) {
                    spt.pegawai = [];
                }
            } else {
                spt.pegawai = [];
            }
            delete spt.pegawai_json;

            // Ambil pegawai yang tugasnya dibatalkan untuk SPT ini
            const canceledPegawaiSql = `
                SELECT p.nama_lengkap FROM pembatalan_spt ps
                JOIN pegawai p ON ps.pegawai_id = p.id
                WHERE ps.spt_id = ? `;
            const canceledPegawaiRows = await dbAll(canceledPegawaiSql, [spt.id]);
            spt.pegawai_dibatalkan = canceledPegawaiRows.map(p => p.nama_lengkap);
        }

        // Jika tidak menggunakan paginasi, kembalikan semua data dalam array.
        if (!usePagination) {
            return res.json(spts);
        }

        // Jika menggunakan paginasi, hitung total dan kembalikan objek paginasi.
        const totalSql = "SELECT COUNT(*) as total FROM spt WHERE status != 'dibatalkan'";
        const totalResult = await dbGet(totalSql);
        const totalItems = totalResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            data: spts,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages
            }
        });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil daftar SPT:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Mengambil semua SPT yang dibatalkan
router.get('/api/spt/canceled', isApiAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        const totalSql = "SELECT COUNT(*) as total FROM pembatalan_spt";
        const totalResult = await dbGet(totalSql);
        const totalItems = totalResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        const sql = `
            SELECT
                ps.id,
                s.nomor_surat,
                ps.tanggal_pembatalan,
                ps.alasan,
                p.nama_lengkap as pegawai_nama
            FROM pembatalan_spt ps
            JOIN spt s ON ps.spt_id = s.id
            JOIN pegawai p ON ps.pegawai_id = p.id
            ORDER BY ps.tanggal_pembatalan DESC
            LIMIT ? OFFSET ?
        `;
        const canceledSpts = await dbAll(sql, [limit, offset]);
        res.json({
            data: canceledSpts,
            pagination: { page, limit, totalItems, totalPages }
        });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil daftar SPT yang dibatalkan:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Mengambil data satu SPT untuk keperluan edit/cetak/detail
router.get('/api/spt/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sptSql = "SELECT * FROM spt WHERE id = ?";
        const spt = await dbGet(sptSql, [req.params.id]);

        if (!spt) {
            return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
        }

        // Memperkaya data pegawai dengan join ke tabel pegawai
        const pegawaiSql = `SELECT p.id as pegawai_id, p.nama_lengkap, p.nip, p.jabatan, sp.is_pengikut 
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ?
            ORDER BY sp.urutan ASC`;
        const pegawaiRows = await dbAll(pegawaiSql, [req.params.id]);
        spt.pegawai = pegawaiRows;

        // PERBAIKAN: Ambil juga data pegawai yang dibatalkan untuk SPT ini
        const canceledPegawaiSql = `
            SELECT p.id as pegawai_id, p.nama_lengkap FROM pembatalan_spt ps
            JOIN pegawai p ON ps.pegawai_id = p.id
            WHERE ps.spt_id = ?
            `;
        const canceledPegawaiRows = await dbAll(canceledPegawaiSql, [req.params.id]);
        spt.pegawai_dibatalkan = canceledPegawaiRows;

        res.json(spt);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil SPT id ${req.params.id}: `, err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// POST: Membuat SPT baru
router.post('/api/spt', isApiAuthenticated, async (req, res) => {
    const {
        nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
        maksud_perjalanan, lokasi_tujuan, tempat_berangkat, tanggal_berangkat, tanggal_kembali,
        lama_perjalanan, sumber_dana, kendaraan, anggaran_id, pegawai, keterangan
    } = req.body;

    if (!nomor_surat || !tanggal_surat || !dasar_surat || !pejabat_pemberi_tugas_id ||
        !maksud_perjalanan || !lokasi_tujuan || !tanggal_berangkat || !tanggal_kembali ||
        !lama_perjalanan || !sumber_dana || !kendaraan || !anggaran_id || !pegawai ||
        pegawai.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua kolom yang wajib diisi.' });
    }

    const hasNonFollower = pegawai.some(p => p.pengikut === '0' || p.pengikut === 0);
    if (!hasNonFollower) {
        return res.status(400).json({ message: 'Harus ada minimal satu pegawai yang ditugaskan (bukan pengikut).' });
    }

    // Validasi jadwal bentrok untuk setiap pegawai
    for (const pegawaiItem of pegawai) {
        const pegawaiId = pegawaiItem.id;
        const overlapSql = `
            SELECT s.nomor_surat, p.nama_lengkap
            FROM spt s
            JOIN spt_pegawai sp ON s.id = sp.spt_id
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.pegawai_id = ?
            AND s.status = 'aktif'
        AND(
            (? BETWEEN s.tanggal_berangkat AND s.tanggal_kembali) OR
                (? BETWEEN s.tanggal_berangkat AND s.tanggal_kembali) OR
                    (s.tanggal_berangkat BETWEEN ? AND ?)
              )
            LIMIT 1;
`;
        const conflictingSpt = await dbGet(overlapSql, [pegawaiId, tanggal_berangkat, tanggal_kembali, tanggal_berangkat, tanggal_kembali]);

        if (conflictingSpt) {
            return res.status(409).json({
                message: `Nama ${conflictingSpt.nama_lengkap} sedang menjalankan tugas kedinasan dengan ST nomor ${conflictingSpt.nomor_surat}. Alternatif pilih nama pegawai yang lain.`
            });
        }
    }


    try {
        await runQuery('BEGIN TRANSACTION');

        const sptSql = `INSERT INTO spt(
    nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, maksud_perjalanan, lokasi_tujuan, tempat_berangkat, tanggal_berangkat, tanggal_kembali, lama_perjalanan, sumber_dana, kendaraan, anggaran_id, keterangan
) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const sptResult = await runQuery(sptSql, [
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, maksud_perjalanan, lokasi_tujuan, tempat_berangkat || 'Nanga Pinoh', tanggal_berangkat, tanggal_kembali, lama_perjalanan, sumber_dana, kendaraan, anggaran_id, keterangan || ''
        ]);

        const newSptId = sptResult.lastID;

        const sptPegawaiSql = 'INSERT INTO spt_pegawai (spt_id, pegawai_id, is_pengikut, urutan) VALUES (?, ?, ?, ?)';
        for (const [index, pegawaiItem] of pegawai.entries()) {
            await runQuery(sptPegawaiSql, [newSptId, pegawaiItem.id, pegawaiItem.pengikut, index]);
        }

        // Buat SPPD otomatis untuk setiap pegawai yang BUKAN pengikut
        const pelaksanaTugas = pegawai.filter(p => p.pengikut === '0' || p.pengikut === 0);
        const sppdSql = `INSERT INTO sppd(spt_id, pegawai_id, nomor_sppd, tanggal_sppd) VALUES(?, ?, ?, ?)`;
        let sppdCounter = 1;
        for (const pelaksana of pelaksanaTugas) {
            const nomorSppd = `090 / ${newSptId}.${sppdCounter++} /SPD/${new Date(tanggal_surat).getFullYear()} `;
            await runQuery(sppdSql, [newSptId, pelaksana.id, nomorSppd, tanggal_surat]);
        }

        await runQuery('COMMIT');
        res.status(201).json({ message: 'SPT dan SPPD berhasil dibuat!', sptId: newSptId });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));

        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Nomor surat sudah digunakan. Gunakan nomor surat yang berbeda.' });
        } else if (err.message.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
            return res.status(400).json({
                message: 'Data terkait (pejabat, anggaran, atau pegawai) tidak valid. Pastikan pilihan Anda ada di daftar.',
                error: err.message // Sertakan pesan error asli dari database untuk debugging lebih lanjut
            });
        }

        console.error('[API ERROR] Gagal menyimpan SPT:', err);
        res.status(500).json({ message: 'Gagal menyimpan SPT dan SPPD.', error: err.message });
    }
});

// PUT: Memperbarui SPT yang sudah ada
router.put('/api/spt/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id,
        maksud_perjalanan, lokasi_tujuan, tempat_berangkat, tanggal_berangkat, tanggal_kembali,
        lama_perjalanan, sumber_dana, kendaraan, anggaran_id, pegawai, keterangan
    } = req.body;

    if (!nomor_surat || !tanggal_surat || !dasar_surat || !pejabat_pemberi_tugas_id ||
        !maksud_perjalanan || !lokasi_tujuan || !tanggal_berangkat || !tanggal_kembali ||
        !lama_perjalanan || !sumber_dana || !kendaraan || !anggaran_id || !pegawai ||
        pegawai.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua kolom yang wajib diisi.' });
    }

    const hasNonFollower = pegawai.some(p => p.pengikut === '0' || p.pengikut === 0);
    if (!hasNonFollower) {
        return res.status(400).json({ message: 'Harus ada minimal satu pegawai yang ditugaskan (bukan pengikut).' });
    }

    try {
        // Validasi jadwal bentrok untuk setiap pegawai, kecuali untuk SPT yang sedang diedit
        for (const pegawaiItem of pegawai) {
            const pegawaiId = pegawaiItem.id;
            const overlapSql = `
                SELECT s.nomor_surat, p.nama_lengkap
                FROM spt s
                JOIN spt_pegawai sp ON s.id = sp.spt_id
                JOIN pegawai p ON sp.pegawai_id = p.id
                WHERE sp.pegawai_id = ?
                  AND s.id != ?
                  AND s.status = 'aktif'
                  AND (
                    (? BETWEEN s.tanggal_berangkat AND s.tanggal_kembali) OR
                    (? BETWEEN s.tanggal_berangkat AND s.tanggal_kembali) OR
                    (s.tanggal_berangkat BETWEEN ? AND ?)
                  )
                LIMIT 1;
            `;
            const conflictingSpt = await dbGet(overlapSql, [pegawaiId, id, tanggal_berangkat, tanggal_kembali, tanggal_berangkat, tanggal_kembali]);

            if (conflictingSpt) {
                return res.status(409).json({
                    message: `Nama ${conflictingSpt.nama_lengkap} sedang menjalankan tugas kedinasan dengan ST nomor ${conflictingSpt.nomor_surat}. Alternatif pilih nama pegawai yang lain.`
                });
            }
        }

        await runQuery('BEGIN TRANSACTION');

        const sptSql = `UPDATE spt SET
nomor_surat = ?, tanggal_surat = ?, dasar_surat = ?, pejabat_pemberi_tugas_id = ?, maksud_perjalanan = ?, lokasi_tujuan = ?, tempat_berangkat = ?, tanggal_berangkat = ?, tanggal_kembali = ?, lama_perjalanan = ?, sumber_dana = ?, kendaraan = ?, anggaran_id = ?, keterangan = ?
    WHERE id = ? `;

        await runQuery(sptSql, [
            nomor_surat, tanggal_surat, dasar_surat, pejabat_pemberi_tugas_id, maksud_perjalanan, lokasi_tujuan, tempat_berangkat || 'Nanga Pinoh', tanggal_berangkat, tanggal_kembali, lama_perjalanan, sumber_dana, kendaraan, anggaran_id, keterangan || '', id
        ]);

        await runQuery('DELETE FROM spt_pegawai WHERE spt_id = ?', [id]);

        const sptPegawaiSql = 'INSERT INTO spt_pegawai (spt_id, pegawai_id, is_pengikut, urutan) VALUES (?, ?, ?, ?)';
        for (const [index, pegawaiItem] of pegawai.entries()) {
            await runQuery(sptPegawaiSql, [id, pegawaiItem.id, pegawaiItem.pengikut, index]);
        }

        // Hapus SPPD lama dan buat ulang sesuai daftar pelaksana yang baru
        await runQuery('DELETE FROM sppd WHERE spt_id = ?', [id]);

        const pelaksanaTugas = pegawai.filter(p => p.pengikut === '0' || p.pengikut === 0);
        const sppdSql = `INSERT INTO sppd(spt_id, pegawai_id, nomor_sppd, tanggal_sppd) VALUES(?, ?, ?, ?)`;
        let sppdCounter = 1;
        for (const pelaksana of pelaksanaTugas) {
            const nomorSppd = `090 / ${id}.${sppdCounter++} /SPD/${new Date(tanggal_surat).getFullYear()} `;
            await runQuery(sppdSql, [id, pelaksana.id, nomorSppd, tanggal_surat]);
        }

        // PERBAIKAN: Sinkronkan data ke laporan yang sudah ada
        const laporanTerkait = await dbGet('SELECT id FROM laporan_perjadin WHERE spt_id = ?', [id]);
        if (laporanTerkait) {
            console.log(`[SYNC] Laporan ID ${laporanTerkait.id} ditemukan untuk SPT ID ${id}. Melakukan sinkronisasi...`);
            const lamaDanTanggal = `${lama_perjalanan} hari, dari ${new Date(tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s / d ${new Date(tanggal_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} `;

            const syncSql = `UPDATE laporan_perjadin SET
dasar_perjalanan = ?,
    tujuan_perjalanan = ?,
    lama_dan_tanggal_perjalanan = ?,
    tempat_dikunjungi = ?
        WHERE id = ? `;
            await runQuery(syncSql, [dasar_surat, maksud_perjalanan, lamaDanTanggal, lokasi_tujuan, laporanTerkait.id]);
            console.log(`[SYNC] Laporan ID ${laporanTerkait.id} berhasil disinkronkan.`);
        }

        await runQuery('COMMIT');
        res.json({ message: 'Surat Perintah Tugas berhasil diperbarui!', sptId: id });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));

        if (err.message.includes('UNIQUE constraint failed') || err.message.includes('ER_DUP_ENTRY') || err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Nomor surat sudah digunakan. Gunakan nomor surat yang berbeda.' });
        } else if (err.message.includes('SQLITE_CONSTRAINT_FOREIGNKEY') || err.message.includes('foreign key constraint fails') || err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                message: 'Data terkait (pejabat, anggaran, atau pegawai) tidak valid. Pastikan pilihan Anda ada di daftar.',
                error: err.message
            });
        }

        console.error(`[API ERROR] Gagal memperbarui SPT id ${id}: `, err);
        res.status(500).json({ message: 'Gagal memperbarui SPT.', error: err.message });
    }
});

// DELETE: Menghapus SPT
router.delete('/api/spt/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;

    // Cek apakah ada uang muka (panjar) terkait sebelum menghapus
    const panjarCheckSql = "SELECT COUNT(*) as count FROM panjar WHERE spt_id = ?";
    const panjar = await dbGet(panjarCheckSql, [id]);

    if (panjar && panjar.count > 0) {
        return res.status(409).json({ message: 'Hapus register/kembalikan uang muka dulu atau perbaiki/edit item Surat Tugas saja.' });
    }

    // Cek apakah ada bukti pembayaran terkait sebelum menghapus
    const paymentCheckSql = "SELECT COUNT(*) as count FROM pembayaran WHERE spt_id = ?";
    const payment = await dbGet(paymentCheckSql, [id]);

    if (payment && payment.count > 0) {
        return res.status(409).json({ message: 'Hapus bukti bayar terlebih dahulu atau perbaiki/edit item Surat Tugas saja.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        // PERBAIKAN: Hapus laporan terkait terlebih dahulu
        console.log(`[DELETE] Mencari dan menghapus laporan terkait untuk SPT ID: ${id} `);
        await runQuery('DELETE FROM laporan_perjadin WHERE spt_id = ?', [id]);

        // Hapus SPT (ini akan otomatis menghapus data di spt_pegawai dan sppd karena ON DELETE CASCADE)
        const result = await runQuery('DELETE FROM spt WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data SPT tidak ditemukan.' });
        }
        await runQuery('COMMIT');
        res.json({ message: 'Data SPT berhasil dihapus.' });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback saat hapus SPT:', rbErr));
        console.error(`[API ERROR] Gagal menghapus SPT id ${id}: `, err);
        res.status(500).json({ message: 'Gagal menghapus SPT.', error: err.message });
    }
});

// POST: Membatalkan SPT
router.post('/api/spt/cancel', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { spt_id, pegawai_id, tempat_pembatalan, tanggal_pembatalan, alasan, rincian_biaya, nominal_biaya } = req.body;

    if (!spt_id || !pegawai_id || !tempat_pembatalan || !tanggal_pembatalan) {
        return res.status(400).json({ message: 'Data pembatalan tidak lengkap.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        // 1. Simpan catatan pembatalan termasuk rincian biaya
        const insertSql = 'INSERT INTO pembatalan_spt (spt_id, pegawai_id, tempat_pembatalan, tanggal_pembatalan, alasan, rincian_biaya, nominal_biaya) VALUES (?, ?, ?, ?, ?, ?, ?)';
        await runQuery(insertSql, [spt_id, pegawai_id, tempat_pembatalan, tanggal_pembatalan, alasan, rincian_biaya, parseFloat(nominal_biaya) || 0]);

        // 2. Hitung jumlah total pegawai di SPT ini
        const totalPegawaiSql = `SELECT COUNT(*) as total FROM spt_pegawai WHERE spt_id = ? `;
        const totalPegawaiResult = await dbGet(totalPegawaiSql, [spt_id]);
        const totalPegawai = totalPegawaiResult.total;

        // 3. Hitung jumlah pegawai yang sudah dibatalkan di SPT ini
        const totalPembatalanSql = `SELECT COUNT(DISTINCT pegawai_id) as total FROM pembatalan_spt WHERE spt_id = ? `;
        const totalPembatalanResult = await dbGet(totalPembatalanSql, [spt_id]);
        const totalPembatalan = totalPembatalanResult.total;

        // 4. Jika jumlah pembatalan SAMA DENGAN jumlah total pegawai, barulah ubah status SPT menjadi 'dibatalkan'
        if (totalPegawai > 0 && totalPegawai === totalPembatalan) {
            console.log(`[LOGIC] Semua pelaksana di SPT ID ${spt_id} telah dibatalkan.Mengubah status SPT menjadi 'dibatalkan'.`);
            await runQuery("UPDATE spt SET status = 'dibatalkan' WHERE id = ?", [spt_id]);
        }

        await runQuery('COMMIT');
        res.status(200).json({ message: 'Surat Tugas berhasil dibatalkan.' });
    } catch (error) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback pembatalan:', rbErr));
        console.error('[API ERROR] Gagal membatalkan SPT:', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
    }
});

// API BARU: Mengambil daftar pegawai yang sudah dibatalkan untuk SPT tertentu
router.get('/api/pembatalan/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const sql = "SELECT pegawai_id FROM pembatalan_spt WHERE spt_id = ?";
        const rows = await dbAll(sql, [spt_id]);
        const canceledPegawaiIds = rows.map(row => row.pegawai_id);
        res.json(canceledPegawaiIds);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil pembatalan untuk SPT ID ${spt_id}: `, error);
        res.status(500).json({ message: "Gagal mengambil data pembatalan.", error: error.message });
    }
});


// GET: Mengambil detail satu pembatalan untuk mode edit
router.get('/api/pembatalan/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sql = "SELECT * FROM pembatalan_spt WHERE id = ?";
        const pembatalan = await dbGet(sql, [req.params.id]);
        if (!pembatalan) {
            return res.status(404).json({ message: "Data pembatalan tidak ditemukan." });
        }
        res.json(pembatalan);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil pembatalan id ${req.params.id}: `, error);
        res.status(500).json({ message: "Gagal mengambil data pembatalan.", error: error.message });
    }
});

// PUT: Memperbarui data pembatalan
router.put('/api/pembatalan/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { spt_id, pegawai_id, tempat_pembatalan, tanggal_pembatalan, alasan, rincian_biaya, nominal_biaya } = req.body;

    if (!spt_id || !pegawai_id || !tempat_pembatalan || !tanggal_pembatalan) {
        return res.status(400).json({ message: 'Data pembatalan tidak lengkap.' });
    }

    try {
        const sql = `UPDATE pembatalan_spt SET spt_id = ?, pegawai_id = ?, tempat_pembatalan = ?, tanggal_pembatalan = ?, alasan = ?, rincian_biaya = ?, nominal_biaya = ? WHERE id = ? `;
        const result = await runQuery(sql, [spt_id, pegawai_id, tempat_pembatalan, tanggal_pembatalan, alasan, rincian_biaya, parseFloat(nominal_biaya) || 0, id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data pembatalan tidak ditemukan untuk diperbarui.' });
        }

        res.json({ message: 'Data pembatalan berhasil diperbarui.' });
    } catch (error) {
        console.error(`[API ERROR] Gagal memperbarui pembatalan id ${id}: `, error);
        res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
    }
});

// DELETE: Menghapus data pembatalan dan mengembalikan status SPT
router.delete('/api/pembatalan/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await runQuery('BEGIN TRANSACTION');

        // 1. Ambil spt_id sebelum menghapus
        const pembatalan = await dbGet("SELECT spt_id FROM pembatalan_spt WHERE id = ?", [id]);
        if (!pembatalan) {
            throw new Error('Data pembatalan tidak ditemukan.');
        }

        // 2. Hapus data pembatalan
        await runQuery("DELETE FROM pembatalan_spt WHERE id = ?", [id]);

        // 3. Kembalikan status SPT menjadi 'aktif'
        await runQuery("UPDATE spt SET status = 'aktif' WHERE id = ?", [pembatalan.spt_id]);

        await runQuery('COMMIT');
        res.json({ message: 'Data pembatalan berhasil dihapus dan status SPT telah dikembalikan.' });
    } catch (error) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback saat hapus pembatalan:', rbErr));
        console.error(`[API ERROR] Gagal menghapus pembatalan id ${id}: `, error);
        res.status(500).json({ message: error.message || 'Gagal menghapus data pembatalan.' });
    }
});

// GET: Data untuk cetak pembatalan
router.get('/api/cetak/pembatalan/:id', isApiAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Ambil data pembatalan
        const pembatalanSql = `SELECT * FROM pembatalan_spt WHERE id = ? `;
        const pembatalan = await dbGet(pembatalanSql, [id]);
        if (!pembatalan) {
            return res.status(404).json({ message: 'Data pembatalan tidak ditemukan.' });
        }

        // 2. Ambil data SPT terkait
        const sptSql = `SELECT * FROM spt WHERE id = ? `;
        const spt = await dbGet(sptSql, [pembatalan.spt_id]);
        if (!spt) {
            return res.status(404).json({ message: 'Data SPT terkait tidak ditemukan.' });
        }

        // 3. Ambil data pejabat yang memberi tugas
        // Coba cari di tabel 'pejabat' dulu, jika tidak ada, cari di 'pegawai' (untuk Sekda, dll)
        let pejabatPemberiTugas = await dbGet(`SELECT nama, nip, jabatan FROM pejabat WHERE id = ? `, [spt.pejabat_pemberi_tugas_id]);
        if (!pejabatPemberiTugas) {
            pejabatPemberiTugas = await dbGet(`SELECT nama_lengkap as nama, nip, jabatan FROM pegawai WHERE id = ? `, [spt.pejabat_pemberi_tugas_id]);
        }
        if (!pejabatPemberiTugas) {
            return res.status(404).json({ message: 'Pejabat pemberi tugas tidak ditemukan.' });
        }

        // 4. Ambil data pegawai yang dibatalkan tugasnya
        const pelaksanaSql = `SELECT nama_lengkap, nip, jabatan FROM pegawai WHERE id = ? `;
        const pelaksana = await dbGet(pelaksanaSql, [pembatalan.pegawai_id]);
        if (!pelaksana) {
            return res.status(404).json({ message: 'Data pegawai yang dibatalkan tidak ditemukan.' });
        }

        // 5. Ambil data SPPD terkait (jika ada)
        const sppdSql = `SELECT nomor_sppd, tanggal_sppd FROM sppd WHERE spt_id = ? AND pegawai_id = ? `;
        const sppd = await dbGet(sppdSql, [pembatalan.spt_id, pembatalan.pegawai_id]);

        // 6. Ambil data Anggaran terkait
        const anggaranSql = `SELECT mata_anggaran_kode FROM anggaran WHERE id = ? `;
        const anggaran = await dbGet(anggaranSql, [spt.anggaran_id]);

        // 7. Ambil data Pengguna Anggaran (Kepala Dinas)
        const penggunaAnggaranSql = `SELECT nama_lengkap as nama, nip, jabatan FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1`;
        let penggunaAnggaran = await dbGet(penggunaAnggaranSql);
        if (!penggunaAnggaran) {
            penggunaAnggaran = { nama: '(Nama Kepala Dinas tidak ditemukan)', nip: '-', jabatan: 'Pengguna Anggaran' };
        }

        // 5. Gabungkan semua data
        const responseData = {
            pembatalan,
            spt,
            pejabatPemberiTugas,
            pelaksana,
            sppd: sppd || { nomor_sppd: '......................', tanggal_sppd: null }, // Fallback jika tidak ada
            anggaran: anggaran || { mata_anggaran_kode: '......................' }, // Fallback jika tidak ada
            penggunaAnggaran
        };

        res.json(responseData);

    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil data cetak untuk pembatalan id ${id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// API BARU: Data untuk Cetak Visum Dinamis
router.get('/api/cetak/visum/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const sql = `
            SELECT
                s.tempat_berangkat,
                s.lokasi_tujuan,
                s.tanggal_berangkat,
                s.tanggal_kembali,
                kadis.nama_lengkap as kadis_nama,
                kadis.nip as kadis_nip,
                kadis.jabatan as kadis_jabatan,
                pptk.nama_lengkap as pptk_nama,
                pptk.nip as pptk_nip,
                pptk.jabatan as pptk_jabatan
            FROM spt s
            CROSS JOIN (SELECT * FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1) as kadis
            LEFT JOIN anggaran a ON s.anggaran_id = a.id
            LEFT JOIN pegawai pptk ON a.pptk_id = pptk.id
            WHERE s.id = ?
        `;
        const data = await dbGet(sql, [spt_id]);
        if (!data) {
            return res.status(404).json({ message: 'Data SPT atau data terkait tidak ditemukan.' });
        }
        res.json(data);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil data cetak visum untuk SPT ID ${spt_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// --- Rute API SPPD (Surat Perjalanan Dinas) ---

// GET: Mengambil semua data SPPD untuk register

module.exports = router;
