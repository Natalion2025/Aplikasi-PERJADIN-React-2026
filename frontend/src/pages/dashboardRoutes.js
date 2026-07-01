const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const { isApiAuthenticated } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

// GET: /api/dashboard/stats
router.get('/api/dashboard/stats', isApiAuthenticated, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 1. Total Perjalanan Tahun Ini
    const totalPerjalananSql = `SELECT COUNT(*) as count FROM spt WHERE YEAR(tanggal_surat) = ?`;
    const totalPerjalanan = await dbGet(totalPerjalananSql, [String(currentYear)]);

    // 2. Perjalanan Bulan Ini
    const perjalananBulanIniSql = `SELECT COUNT(*) as count FROM spt WHERE YEAR(tanggal_surat) = ? AND MONTH(tanggal_surat) = ?`;
    const perjalananBulanIni = await dbGet(perjalananBulanIniSql, [
      String(currentYear),
      String(currentMonth),
    ]);

    // 3. Grafik Perjalanan 12 Bulan Terakhir
    const grafikPerjalananSql = `
            SELECT DATE_FORMAT(tanggal_surat, '%Y-%m') as month, COUNT(*) as count
            FROM spt
            WHERE tanggal_surat >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month ASC;
        `;
    const grafikData = await dbAll(grafikPerjalananSql);

    const labels = grafikData.map((item) => item.month);
    const data = grafikData.map((item) => item.count);

    res.json({
      totalPerjalanan: totalPerjalanan?.count || 0,
      perjalananBulanIni: perjalananBulanIni?.count || 0,
      grafikPerjalanan: {
        labels,
        data,
      },
    });
  } catch (error) {
    console.error('[API ERROR] Gagal mengambil statistik dashboard:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil statistik.' });
  }
});

module.exports = router;
