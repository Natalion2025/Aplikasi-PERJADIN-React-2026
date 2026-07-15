const express = require("express");
const router = express.Router();
const db = require("../config/db");
const util = require("util");
const {
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
} = require("../middleware/auth");

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

router.get("/pejabat", isApiAuthenticated, async (req, res) => {
  const { q = "", page = 1, limit = 5 } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 5;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClause = "";
    const params = [];
    if (q) {
      whereClause = `WHERE nama LIKE ? OR jabatan LIKE ? OR nip LIKE ?`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const totalResult = await dbGet(
      `SELECT COUNT(*) as total FROM pejabat ${whereClause}`,
      params,
    );
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limitNum);

    const dataSql = `SELECT * FROM pejabat ${whereClause} ORDER BY id LIMIT ? OFFSET ?`;
    const rows = await dbAll(dataSql, [...params, limitNum, offset]);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil data pejabat:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET single pejabat by id
router.get("/pejabat/:id", isApiAuthenticated, async (req, res) => {
  try {
    const row = await dbGet("SELECT * FROM pejabat WHERE id = ?", [
      req.params.id,
    ]);
    if (!row) {
      return res.status(404).json({ message: "Data pejabat tidak ditemukan." });
    }
    res.json(row);
  } catch (err) {
    console.error(
      `[API ERROR] Gagal mengambil pejabat id ${req.params.id}:`,
      err,
    );
    res.status(500).json({ error: err.message });
  }
});

// POST a new pejabat
router.post(
  "/pejabat",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const { nama, jabatan, nip } = req.body;
    if (!nama || !jabatan) {
      return res.status(400).json({ message: "Nama dan Jabatan wajib diisi." });
    }
    try {
      const sql = "INSERT INTO pejabat (nama, jabatan, nip) VALUES (?, ?, ?)";
      const result = await runQuery(sql, [nama, jabatan, nip || null]);
      res.status(201).json({ id: result.lastID, nama, jabatan, nip });
    } catch (err) {
      console.error("[API ERROR] Gagal menambah pejabat:", err);
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT (update) a pejabat
router.put(
  "/pejabat/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const { nama, jabatan, nip } = req.body;
    if (!nama || !jabatan) {
      return res.status(400).json({ message: "Nama dan Jabatan wajib diisi." });
    }
    try {
      const sql =
        "UPDATE pejabat SET nama = ?, jabatan = ?, nip = ? WHERE id = ?";
      const result = await runQuery(sql, [
        nama,
        jabatan,
        nip || null,
        req.params.id,
      ]);
      if (result.changes === 0) {
        return res
          .status(404)
          .json({ message: "Data pejabat tidak ditemukan." });
      }
      res.json({ id: req.params.id, nama, jabatan, nip });
    } catch (err) {
      console.error(
        `[API ERROR] Gagal memperbarui pejabat id ${req.params.id}:`,
        err,
      );
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE a pejabat
router.delete(
  "/pejabat/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    try {
      const sql = "DELETE FROM pejabat WHERE id = ?";
      const result = await runQuery(sql, [req.params.id]);
      if (result.changes === 0) {
        return res
          .status(404)
          .json({ message: "Data pejabat tidak ditemukan." });
      }
      res.json({ message: "Data pejabat berhasil dihapus" });
    } catch (err) {
      console.error(
        `[API ERROR] Gagal menghapus pejabat id ${req.params.id}:`,
        err,
      );
      res.status(500).json({ message: err.message });
    }
  },
);

// --- Rute API Anggaran (terproteksi) ---

// GET all anggaran

module.exports = router;
