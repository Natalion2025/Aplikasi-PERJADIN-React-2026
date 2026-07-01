const express = require("express");
const router = express.Router();
const db = require("../config/db");
const util = require("util");
const { isApiAuthenticated } = require("../middleware/auth");

// Helper untuk menggunakan db.query yang sudah promise-based
const dbQuery = db.query;

const dbGet = async (sql, params) => {
  const results = await dbQuery(sql, params);
  return results[0];
};
const dbAll = async (sql, params) => {
  return await dbQuery(sql, params);
};

router.get("/dashboard/stats", isApiAuthenticated, async (req, res) => {
  try {
    // Menggunakan tabel 'spt' sebagai sumber utama untuk konsistensi
    const sqlTotal =
      "SELECT COUNT(*) as totalPerjalanan FROM spt WHERE YEAR(tanggal_surat) = YEAR(CURDATE())";

    // Menggunakan sintaks MySQL DATE_FORMAT dan CURDATE()
    const sqlBulanIni = `
            SELECT COUNT(*) as perjalananBulanIni FROM spt
            WHERE DATE_FORMAT(tanggal_surat, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
        `;

    // Menggunakan sintaks MySQL DATE_FORMAT, CURDATE(), dan INTERVAL
    const sqlPerjalananPerBulan = `
            SELECT
                DATE_FORMAT(s.tanggal_surat, '%Y-%m') as bulan,
                COUNT(*) as jumlah
            FROM spt s
            WHERE s.tanggal_surat >= CURDATE() - INTERVAL 12 MONTH
            GROUP BY bulan
            ORDER BY bulan ASC
        `;

    const [totalRow, bulanIniRow, perjalananBulananData] = await Promise.all([
      dbGet(sqlTotal),
      dbGet(sqlBulanIni),
      dbAll(sqlPerjalananPerBulan),
    ]);

    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthString =
        d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
      labels.push(monthString);

      const monthData = perjalananBulananData.find(
        (item) => item.bulan === monthString,
      );
      data.push(monthData ? monthData.jumlah : 0);
    }

    res.json({
      totalPerjalanan: totalRow.totalPerjalanan || 0,
      perjalananBulanIni: bulanIniRow.perjalananBulanIni || 0,
      grafikPerjalanan: {
        labels: labels,
        data: data,
      },
      server_time: new Date().toISOString(), // Menambahkan waktu server untuk konsistensi di frontend
    });
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil statistik dashboard:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
