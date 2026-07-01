const express = require("express");
const router = express.Router();
const util = require("util");
const db = require("../config/db");

// --- Helper & Utilitas Database ---
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
      resolve(this); // 'this' berisi lastID dan changes
    });
  });

// GET: Mengambil semua data pegawai
router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit) || 0; // 0 means no limit (get all)
  const page = parseInt(req.query.page) || 1;
  const searchQuery = req.query.q || "";
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let queryParams = [];

  if (searchQuery) {
    whereClauses.push(`(nama_lengkap LIKE ? OR nip LIKE ? OR jabatan LIKE ?)`);
    const likeQuery = `%${searchQuery}%`;
    queryParams.push(likeQuery, likeQuery, likeQuery);
  }
  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    const totalSql = `SELECT COUNT(*) as total FROM pegawai ${whereSql}`;
    const totalResult = await dbGet(totalSql, queryParams);
    const totalItems = totalResult.total;
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;

    let sql = `SELECT * FROM pegawai ${whereSql} ORDER BY nama_lengkap ASC`;
    if (limit > 0) {
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }
    const rows = await dbAll(sql, queryParams);

    if (limit > 0) {
      res.json({
        data: rows,
        pagination: { page, limit, totalItems, totalPages },
      });
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil data pegawai:", err);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan pada server.", error: err.message });
  }
});

// GET: Mengambil satu data pegawai berdasarkan ID
router.get("/:id", async (req, res) => {
  const sql = "SELECT * FROM pegawai WHERE id = ?";
  try {
    const row = await dbGet(sql, [req.params.id]);
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: "Pegawai tidak ditemukan." });
    }
  } catch (err) {
    console.error(
      `[API ERROR] Gagal mengambil pegawai id ${req.params.id}:`,
      err,
    );
    res
      .status(500)
      .json({ message: "Terjadi kesalahan pada server.", error: err.message });
  }
});

// POST: Menambah pegawai baru
router.post("/", async (req, res) => {
  const { nama_lengkap, nip, pangkat, golongan, jabatan, bidang } = req.body;

  if (!nama_lengkap || !nip) {
    return res
      .status(400)
      .json({ message: "Nama Lengkap dan NIP wajib diisi." });
  }

  try {
    const sql = `INSERT INTO pegawai (nama_lengkap, nip, pangkat, golongan, jabatan, bidang) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [
      nama_lengkap,
      nip,
      pangkat || null,
      golongan || null,
      jabatan || null,
      bidang || null,
    ];

    const result = await runQuery(sql, params);

    res.status(201).json({
      message: "Pegawai baru berhasil ditambahkan.",
      data: { id: result.lastID, ...req.body },
    });
  } catch (err) {
    console.error("[API ERROR] Gagal menambah pegawai:", err);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan pada server saat menambah pegawai.",
        error: err.message,
      });
  }
});

// PUT: Memperbarui data pegawai
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nama_lengkap, nip, pangkat, golongan, jabatan, bidang } = req.body;

  if (!nama_lengkap || !nip) {
    return res
      .status(400)
      .json({ message: "Nama Lengkap dan NIP wajib diisi." });
  }

  try {
    const sql = `UPDATE pegawai SET 
                        nama_lengkap = ?, 
                        nip = ?, 
                        pangkat = ?, 
                        golongan = ?, 
                        jabatan = ?, 
                        bidang = ?
                     WHERE id = ?`;
    const params = [
      nama_lengkap,
      nip,
      pangkat || null,
      golongan || null,
      jabatan || null,
      bidang || null,
      id,
    ];

    const result = await runQuery(sql, params);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Pegawai tidak ditemukan untuk diperbarui." });
    }

    res.json({
      message: "Data pegawai berhasil diperbarui.",
      data: { id, ...req.body },
    });
  } catch (err) {
    console.error(`[API ERROR] Gagal memperbarui pegawai id ${id}:`, err);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan pada server saat memperbarui pegawai.",
        error: err.message,
      });
  }
});

// DELETE: Menghapus data pegawai
router.delete("/:id", async (req, res) => {
  try {
    const result = await runQuery("DELETE FROM pegawai WHERE id = ?", [
      req.params.id,
    ]);
    if (result.changes === 0) {
      return res.status(404).json({ message: "Pegawai tidak ditemukan." });
    }
    res.json({ message: "Pegawai berhasil dihapus." });
  } catch (err) {
    console.error(
      `[API ERROR] Gagal menghapus pegawai id ${req.params.id}:`,
      err,
    );
    res
      .status(500)
      .json({ message: "Terjadi kesalahan pada server.", error: err.message });
  }
});

module.exports = router;
