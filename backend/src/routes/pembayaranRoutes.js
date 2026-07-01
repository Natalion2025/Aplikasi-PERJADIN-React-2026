const express = require("express");
const router = express.Router();
const db = require("../config/db");
const util = require("util");
const terbilang = require("angka-menjadi-terbilang");
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
const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

router.get("/pembayaran", isApiAuthenticated, async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    const totalSql = "SELECT COUNT(*) as total FROM pembayaran";
    const totalResult = await dbGet(totalSql);
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const sql = `
            SELECT
                p.*,
                s.nomor_surat,
                s.tanggal_surat
            FROM pembayaran p
            LEFT JOIN spt s ON p.spt_id = s.id
            ORDER BY p.tanggal_bukti DESC, p.id DESC
            LIMIT ? OFFSET ?`;
    const pembayaran = await dbAll(sql, [limit, offset]);
    res.json({
      data: pembayaran,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (error) {
    console.error("[API ERROR] Gagal mengambil data pembayaran:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// GET: Mengambil satu data pembayaran untuk edit
router.get("/pembayaran/:id", isApiAuthenticated, async (req, res) => {
  try {
    const sql = `SELECT * FROM pembayaran WHERE id = ? `;
    const pembayaran = await dbGet(sql, [req.params.id]);
    if (!pembayaran) {
      return res
        .status(404)
        .json({ message: "Data pembayaran tidak ditemukan." });
    }
    res.json(pembayaran);
  } catch (error) {
    console.error(
      `[API ERROR] Gagal mengambil pembayaran id ${req.params.id}: `,
      error,
    );
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// API BARU: Memeriksa apakah bukti pembayaran sudah ada untuk SPT tertentu
router.get(
  "/pembayaran/check/by-spt/:spt_id",
  isApiAuthenticated,
  async (req, res) => {
    const { spt_id } = req.params;
    try {
      const sql = "SELECT COUNT(*) as count FROM pembayaran WHERE spt_id = ?";
      const result = await dbGet(sql, [spt_id]);
      const exists = result && result.count > 0;
      res.json({ exists: exists });
    } catch (error) {
      console.error(
        `[API ERROR] Gagal memeriksa pembayaran untuk SPT ID ${spt_id}:`,
        error,
      );
      // Mengembalikan exists: false agar tidak memblokir UI jika terjadi error server
      res
        .status(500)
        .json({ exists: false, message: "Gagal memeriksa status pembayaran." });
    }
  },
);

// PUT: Memperbarui bukti pembayaran
router.put("/pembayaran/:id", isApiAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const nominalBayarAngka = parseFloat(data.nominal_bayar) || 0;

    // PERBAIKAN: Pastikan ID relasi adalah angka
    const anggaranIdAngka = parseInt(data.anggaran_id, 10);
    const sptIdAngka = parseInt(data.spt_id, 10);

    const sql = `UPDATE pembayaran SET anggaran_id = ?, spt_id = ?, nama_penerima = ?, uraian_pembayaran = ?, nominal_bayar = ?, panjar_data = ?, pptk_id = ? WHERE id = ? `;
    await runQuery(sql, [
      anggaranIdAngka,
      sptIdAngka,
      data.nama_penerima,
      data.uraian_pembayaran,
      nominalBayarAngka,
      data.panjar_data,
      data.pptk_id,
      id,
    ]);
    res.json({ message: "Bukti pembayaran berhasil diperbarui!" });
  } catch (error) {
    console.error(
      `[API ERROR] Gagal memperbarui bukti pembayaran id ${req.params.id}: `,
      error,
    );
    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      error: error.message,
    });
  }
});

// Fungsi untuk generate nomor bukti unik
const generateNomorBukti = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `KWT / ${year} /${month}/`;

  const lastPayment = await dbGet(
    "SELECT nomor_bukti FROM pembayaran WHERE nomor_bukti LIKE ? ORDER BY id DESC LIMIT 1",
    [`${prefix}%`],
  );

  let nextNumber = 1;
  if (lastPayment) {
    const lastNumber = parseInt(lastPayment.nomor_bukti.split("/").pop(), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

// POST: Membuat bukti pembayaran baru
router.post("/pembayaran", isApiAuthenticated, async (req, res) => {
  try {
    console.log("[API] Menerima request ke /api/pembayaran:", req.body); // Tambahkan log ini
    const data = req.body; // Ambil seluruh body
    const nomorBukti = await generateNomorBukti();
    const tanggalBukti = new Date().toISOString().split("T")[0]; // Tanggal hari ini
    // PERBAIKAN: Pastikan ID relasi adalah angka
    const anggaranIdAngka = parseInt(data.anggaran_id, 10);
    const sptIdAngka = parseInt(data.spt_id, 10);

    const sql = `INSERT INTO pembayaran(nomor_bukti, tanggal_bukti, anggaran_id, spt_id, nama_penerima, uraian_pembayaran, nominal_bayar, panjar_data, pptk_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await runQuery(sql, [
      nomorBukti,
      tanggalBukti,
      anggaranIdAngka,
      sptIdAngka,
      data.nama_penerima,
      data.uraian_pembayaran,
      data.nominal_bayar,
      data.panjar_data,
      data.pptk_id,
    ]);

    res.status(201).json({ message: "Bukti pembayaran berhasil disimpan!" });
  } catch (error) {
    console.error("[API ERROR] Gagal menyimpan bukti pembayaran:", error);
    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      error: error.message,
    });
  }
});

// DELETE: Menghapus bukti pembayaran
router.delete("/pembayaran/:id", isApiAuthenticated, async (req, res) => {
  runQuery("DELETE FROM pembayaran WHERE id = ?", [req.params.id])
    .then(() => res.json({ message: "Bukti pembayaran berhasil dihapus." }))
    .catch((err) =>
      res
        .status(500)
        .json({ message: "Gagal menghapus data.", error: err.message }),
    );
});

// =================================================================
// API ENDPOINTS UNTUK PENGELUARAN RIIL
// =================================================================

// GET: Mengambil semua data pengeluaran riil

module.exports = router;
