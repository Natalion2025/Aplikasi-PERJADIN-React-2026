const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const { isApiAuthenticated, isApiAdminOrSuperAdmin } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

router.get('/api/pejabat', isApiAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM pejabat ORDER BY id", []);
        res.json(rows);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data pejabat:', err);
        res.status(500).json({ "error": err.message });
    }
});

// GET single pejabat by id
router.get('/api/pejabat/:id', isApiAuthenticated, async (req, res) => {
    try {
        const row = await dbGet("SELECT * FROM pejabat WHERE id = ?", [req.params.id]);
        if (!row) {
            return res.status(404).json({ message: "Data pejabat tidak ditemukan." });
        }
        res.json(row);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil pejabat id ${req.params.id}:`, err);
        res.status(500).json({ "error": err.message });
    }
});

// POST a new pejabat
router.post('/api/pejabat', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { nama, jabatan, nip } = req.body;
    if (!nama || !jabatan) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const sql = 'INSERT INTO pejabat (nama, jabatan, nip) VALUES (?, ?, ?)';
        const result = await runQuery(sql, [nama, jabatan, nip || null]);
        res.status(201).json({ id: result.lastID, nama, jabatan, nip });
    } catch (err) {
        console.error('[API ERROR] Gagal menambah pejabat:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT (update) a pejabat
router.put('/api/pejabat/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { nama, jabatan, nip } = req.body;
    if (!nama || !jabatan) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const sql = 'UPDATE pejabat SET nama = ?, jabatan = ?, nip = ? WHERE id = ?';
        const result = await runQuery(sql, [nama, jabatan, nip || null, req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data pejabat tidak ditemukan.' });
        }
        res.json({ id: req.params.id, nama, jabatan, nip });
    } catch (err) {
        console.error(`[API ERROR] Gagal memperbarui pejabat id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE a pejabat
router.delete('/api/pejabat/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    try {
        const sql = 'DELETE FROM pejabat WHERE id = ?';
        const result = await runQuery(sql, [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Data pejabat tidak ditemukan.' });
        }
        res.json({ message: 'Data pejabat berhasil dihapus' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus pejabat id ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// --- Rute API Anggaran (terproteksi) ---

// GET all anggaran

module.exports = router;
