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

router.get('/api/panjar', isApiAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        const totalSql = "SELECT COUNT(*) as total FROM panjar";
        const totalResult = await dbGet(totalSql);
        const totalItems = totalResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        const sql = `
SELECT
p.id,
    p.tanggal_panjar,
    p.spt_id,
    s.nomor_surat,
    pelaksana.nama_lengkap as pelaksana_nama,
    (SELECT SUM(pr.jumlah) FROM panjar_rincian pr WHERE pr.panjar_id = p.id) as total_biaya
            FROM panjar p
            JOIN spt s ON p.spt_id = s.id
            JOIN pegawai pelaksana ON p.pelaksana_id = pelaksana.id
            ORDER BY p.tanggal_panjar DESC, p.id DESC

LIMIT ? OFFSET ?
    `;
        const panjarList = await dbAll(sql, [limit, offset]);
        res.json({
            data: panjarList,
            pagination: { page, limit, totalItems, totalPages }
        });

        // const panjarList = await dbAll(sql);
        // res.json(panjarList);

    } catch (error) {
        console.error('[API ERROR] Gagal mengambil data panjar:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Mengambil satu data panjar untuk edit
router.get('/api/panjar/:id', isApiAuthenticated, async (req, res) => {
    try {
        const panjar = await dbGet("SELECT * FROM panjar WHERE id = ?", [req.params.id]);
        if (!panjar) {
            return res.status(404).json({ message: 'Data uang muka tidak ditemukan.' });
        }
        panjar.rincian = await dbAll("SELECT * FROM panjar_rincian WHERE panjar_id = ?", [req.params.id]);
        res.json(panjar);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil panjar id ${req.params.id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// POST: Membuat panjar baru
router.post('/api/panjar', isApiAuthenticated, async (req, res) => {
    const { tempat, tanggal_panjar, spt_id, bendahara_id, pelaksana_id, pejabat_id, rincian } = req.body;

    if (!spt_id || !pelaksana_id || !bendahara_id || !pejabat_id || !rincian || rincian.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap. Harap isi semua field yang diperlukan.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        const panjarSql = `INSERT INTO panjar(tempat, tanggal_panjar, spt_id, bendahara_id, pelaksana_id, pejabat_id) VALUES(?, ?, ?, ?, ?, ?)`;
        const panjarResult = await runQuery(panjarSql, [tempat, tanggal_panjar, spt_id, bendahara_id, pelaksana_id, pejabat_id]);
        const newPanjarId = panjarResult.lastID;

        const rincianSql = `INSERT INTO panjar_rincian(panjar_id, uraian, jumlah, keterangan) VALUES(?, ?, ?, ?)`;
        for (const item of rincian) {
            const jumlah = parseFloat(item.jumlah) || 0;
            if (item.uraian && jumlah > 0) {
                await runQuery(rincianSql, [newPanjarId, item.uraian, jumlah, item.keterangan]);
            }
        }

        await runQuery('COMMIT');
        res.status(201).json({ message: 'Data uang muka berhasil disimpan!', panjarId: newPanjarId });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('[API ERROR] Gagal menyimpan panjar:', err);
        res.status(500).json({ message: 'Gagal menyimpan data uang muka.', error: err.message });
    }
});

// PUT: Memperbarui panjar
router.put('/api/panjar/:id', isApiAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { tempat, tanggal_panjar, spt_id, bendahara_id, pelaksana_id, pejabat_id, rincian } = req.body;

    if (!spt_id || !pelaksana_id || !bendahara_id || !pejabat_id || !rincian || rincian.length === 0) {
        return res.status(400).json({ message: 'Data tidak lengkap.' });
    }

    try {
        await runQuery('BEGIN TRANSACTION');

        const panjarSql = `UPDATE panjar SET tempat = ?, tanggal_panjar = ?, spt_id = ?, bendahara_id = ?, pelaksana_id = ?, pejabat_id = ? WHERE id = ? `;
        await runQuery(panjarSql, [tempat, tanggal_panjar, spt_id, bendahara_id, pelaksana_id, pejabat_id, id]);

        await runQuery('DELETE FROM panjar_rincian WHERE panjar_id = ?', [id]);

        const rincianSql = `INSERT INTO panjar_rincian(panjar_id, uraian, jumlah, keterangan) VALUES(?, ?, ?, ?)`;
        for (const item of rincian) {
            const jumlah = parseFloat(item.jumlah) || 0;
            if (item.uraian && jumlah > 0) {
                await runQuery(rincianSql, [id, item.uraian, jumlah, item.keterangan]);
            }
        }

        await runQuery('COMMIT');
        res.json({ message: 'Data uang muka berhasil diperbarui!', panjarId: id });
    } catch (err) {
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error(`[API ERROR] Gagal memperbarui panjar id ${id}: `, err);
        res.status(500).json({ message: 'Gagal memperbarui data.', error: err.message });
    }
});

// DELETE: Menghapus panjar
router.delete('/api/panjar/:id', isApiAuthenticated, async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM panjar WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data uang muka tidak ditemukan.' });
        }
        res.json({ message: 'Data uang muka berhasil dihapus.' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus panjar id ${req.params.id}: `, err);
        res.status(500).json({ message: 'Gagal menghapus data.', error: err.message });
    }
});

// GET: Mengambil data panjar berdasarkan SPT ID
router.get('/api/panjar/by-spt/:spt_id', isApiAuthenticated, async (req, res) => {
    const { spt_id } = req.params;
    try {
        const sql = `
SELECT
p.pelaksana_id,
    (SELECT SUM(pr.jumlah) FROM panjar_rincian pr WHERE pr.panjar_id = p.id) as total_panjar
            FROM panjar p
            WHERE p.spt_id = ?
    `;
        const panjarData = await dbAll(sql, [spt_id]);
        // Mengubah array menjadi map untuk kemudahan akses di frontend: { pelaksana_id: total_panjar }
        const panjarMap = panjarData.reduce((acc, item) => {
            acc[item.pelaksana_id] = item.total_panjar;
            return acc;
        }, {});
        res.json(panjarMap);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil data panjar untuk SPT ID ${spt_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Data panjar untuk satu pegawai di satu SPT
router.get('/api/panjar/by-spt/:spt_id/pegawai/:pegawai_id', isApiAuthenticated, async (req, res) => {
    const { spt_id, pegawai_id } = req.params;
    try {
        const panjar = await dbGet(`SELECT id FROM panjar WHERE spt_id = ? AND pelaksana_id = ? `, [spt_id, pegawai_id]);
        if (!panjar) {
            return res.status(404).json({ message: 'Tidak ada data uang muka untuk pegawai ini.' });
        }

        const rincianItems = await dbAll(`SELECT uraian, jumlah FROM panjar_rincian WHERE panjar_id = ? `, [panjar.id]);
        if (rincianItems.length === 0) {
            return res.status(404).json({ message: 'Rincian uang muka tidak ditemukan.' });
        }

        const uraian = rincianItems.map(item => item.uraian).join(', ');
        const total = rincianItems.reduce((sum, item) => sum + item.jumlah, 0);

        res.json({ uraian, total });
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil data panjar untuk SPT ${spt_id} & Pegawai ${pegawai_id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// GET: Data untuk cetak panjar
router.get('/api/cetak/panjar/:id', isApiAuthenticated, async (req, res) => {
    try {
        const sql = `
            SELECT p.*,
    s.nomor_surat,
    COALESCE(
        (SELECT spd1.nomor_sppd FROM sppd spd1 WHERE spd1.spt_id = p.spt_id AND spd1.pegawai_id = p.pelaksana_id),
    (SELECT spd2.nomor_sppd FROM sppd spd2 WHERE spd2.spt_id = p.spt_id LIMIT 1)
                   ) as nomor_sppd,
    pelaksana.nama_lengkap as pelaksana_nama, pelaksana.nip as pelaksana_nip, pelaksana.jabatan as pelaksana_jabatan,
    bendahara.nama_lengkap as bendahara_nama, bendahara.nip as bendahara_nip,
    pejabat.nama_lengkap as pejabat_nama, pejabat.nip as pejabat_nip, pejabat.jabatan as pejabat_jabatan
            FROM panjar p
            JOIN spt s ON p.spt_id = s.id
            JOIN pegawai pelaksana ON p.pelaksana_id = pelaksana.id
            JOIN pegawai bendahara ON p.bendahara_id = bendahara.id
            JOIN pegawai pejabat ON p.pejabat_id = pejabat.id
            WHERE p.id = ?
    `;
        const panjar = await dbGet(sql, [req.params.id]);
        if (!panjar) return res.status(404).json({ message: 'Data tidak ditemukan.' });

        panjar.rincian = await dbAll("SELECT * FROM panjar_rincian WHERE panjar_id = ?", [req.params.id]);
        res.json(panjar);
    } catch (error) {
        console.error(`[API ERROR] Gagal mengambil data cetak panjar id ${req.params.id}: `, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// =================================================================
// API ENDPOINTS UNTUK PEMBAYARAN
// =================================================================

// Fungsi untuk generate nomor bukti unik
const generateNomorBukti = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `KWT / ${year} /${month}/`;

    const lastPayment = await dbGet("SELECT nomor_bukti FROM pembayaran WHERE nomor_bukti LIKE ? ORDER BY id DESC LIMIT 1", [`${prefix}% `]);

    let nextNumber = 1;
    if (lastPayment) {
        const lastNumber = parseInt(lastPayment.nomor_bukti.split('/').pop(), 10);
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')} `;
};

// GET: Mengambil semua data pembayaran

module.exports = router;
