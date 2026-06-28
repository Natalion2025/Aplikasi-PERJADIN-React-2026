const express = require("express");
const router = express.Router();
const db = require("../config/db");
const util = require("util");
const {
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
} = require("../middleware/auth");

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

router.get("/api/anggaran", isApiAuthenticated, async (req, res) => {
  const limit =
    req.query.limit === "0" ? 0 : parseInt(req.query.limit, 10) || 5;
  const page = parseInt(req.query.page) || 1;
  const query = req.query.q || "";
  const offset = limit > 0 ? (page - 1) * limit : 0;

  let whereClause = "";
  const params = [];

  if (query) {
    whereClause = `WHERE program LIKE ? OR kegiatan LIKE ? OR sub_kegiatan LIKE ? OR mata_anggaran_nama LIKE ?`;
    const searchQuery = `%${query}%`;
    params.push(searchQuery, searchQuery, searchQuery, searchQuery);
  }

  try {
    let totalItems = 0;
    if (limit > 0) {
      const totalResult = await dbGet(
        `SELECT COUNT(DISTINCT mata_anggaran_kode) as total FROM anggaran ${whereClause}`,
        params,
      );
      totalItems = totalResult ? totalResult.total : 0;
    }
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;

    // MySQL compatible query with MAX/SUM aggregation for ONLY_FULL_GROUP_BY compliance
    const sql =
      `
            SELECT
                agg.id,
                agg.mata_anggaran_kode,
                agg.mata_anggaran_nama,
                agg.program,
                agg.kegiatan,
                agg.sub_kegiatan,
                agg.pptk_nama,
                agg.total_nilai_anggaran as nilai_anggaran,
                COALESCE(p_agg.total_realisasi, 0) as realisasi
            FROM (
                SELECT 
                    MAX(anggaran.id) as id,
                    mata_anggaran_kode, 
                    MAX(mata_anggaran_nama) as mata_anggaran_nama,
                    MAX(program) as program, 
                    MAX(kegiatan) as kegiatan, 
                    MAX(sub_kegiatan) as sub_kegiatan, 
                    MAX(pptk.nama_lengkap) as pptk_nama, 
                    SUM(nilai_anggaran) as total_nilai_anggaran
                FROM anggaran
                LEFT JOIN pegawai pptk ON anggaran.pptk_id = pptk.id
                GROUP BY mata_anggaran_kode
            ) as agg
            LEFT JOIN (
                SELECT a.mata_anggaran_kode, SUM(p.nominal_bayar) as total_realisasi FROM pembayaran p JOIN anggaran a ON p.anggaran_id = a.id GROUP BY a.mata_anggaran_kode
            ) as p_agg ON agg.mata_anggaran_kode = p_agg.mata_anggaran_kode
            ${whereClause}
            ORDER BY agg.mata_anggaran_kode ASC
        ` + (limit > 0 ? " LIMIT ? OFFSET ?" : "");

    const queryParams = [...params];
    if (limit > 0) {
      queryParams.push(limit, offset);
    }
    const rows = await dbAll(sql, queryParams);

    // Hitung sisa anggaran
    rows.forEach((row) => {
      row.sisa = row.nilai_anggaran - row.realisasi;
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil data anggaran:", err);
    res.status(500).json({ message: err.message });
  }
});

// Dropdown options
router.get("/api/anggaran/options", isApiAuthenticated, async (req, res) => {
  try {
    const sql = `
            SELECT 
                id, 
                mata_anggaran_kode, 
                mata_anggaran_nama, 
                kegiatan, 
                sub_kegiatan 
            FROM anggaran 
            ORDER BY mata_anggaran_kode ASC`;
    const rows = await dbAll(sql, []);
    res.json(rows);
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil opsi anggaran:", err);
    res.status(500).json({ message: "Gagal memuat opsi anggaran." });
  }
});

// GET single anggaran
router.get("/api/anggaran/:id", isApiAuthenticated, async (req, res) => {
  try {
    const row = await dbGet("SELECT * FROM anggaran WHERE id = ?", [
      req.params.id,
    ]);
    if (!row) {
      return res
        .status(404)
        .json({ message: "Data anggaran tidak ditemukan." });
    }
    res.json(row);
  } catch (err) {
    console.error(
      `[API ERROR] Gagal mengambil anggaran id ${req.params.id}:`,
      err,
    );
    res.status(500).json({ message: err.message });
  }
});

// POST new anggaran
router.post(
  "/api/anggaran",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const {
      bidang_urusan,
      program,
      kegiatan,
      sub_kegiatan,
      mata_anggaran_kode,
      mata_anggaran_nama,
      nilai_anggaran,
      pptk_id,
    } = req.body;

    // Compatibility check for body key names
    const kode = mata_anggaran_kode || req.body.mata_anggaran; // fallback
    const nama = mata_anggaran_nama || req.body.mata_anggaran_nama;

    if (!kode || !nilai_anggaran) {
      return res
        .status(400)
        .json({
          message: "Mata Anggaran Kode dan Nilai Anggaran wajib diisi.",
        });
    }

    try {
      const sql = `
            INSERT INTO anggaran 
                (bidang_urusan, program, kegiatan, sub_kegiatan, mata_anggaran_kode, mata_anggaran_nama, nilai_anggaran, pptk_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const params = [
        bidang_urusan || null,
        program || null,
        kegiatan || null,
        sub_kegiatan || null,
        kode,
        nama || kode,
        nilai_anggaran,
        pptk_id || null,
      ];
      const result = await runQuery(sql, params);
      res.status(201).json({
        message: "Data anggaran berhasil ditambahkan.",
        data: { id: result.lastID, ...req.body },
      });
    } catch (err) {
      console.error("[API ERROR] Gagal menambah anggaran:", err);
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT update anggaran
router.put(
  "/api/anggaran/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const { id } = req.params;
    const {
      bidang_urusan,
      program,
      kegiatan,
      sub_kegiatan,
      mata_anggaran_kode,
      mata_anggaran_nama,
      nilai_anggaran,
      pptk_id,
    } = req.body;

    const kode = mata_anggaran_kode || req.body.mata_anggaran;
    const nama = mata_anggaran_nama || req.body.mata_anggaran_nama;

    if (!kode || !nilai_anggaran) {
      return res
        .status(400)
        .json({
          message: "Mata Anggaran Kode dan Nilai Anggaran wajib diisi.",
        });
    }

    try {
      const sql = `
            UPDATE anggaran SET 
                bidang_urusan = ?, 
                program = ?, 
                kegiatan = ?, 
                sub_kegiatan = ?, 
                mata_anggaran_kode = ?, 
                mata_anggaran_nama = ?, 
                nilai_anggaran = ?, 
                pptk_id = ? 
            WHERE id = ?`;
      const params = [
        bidang_urusan || null,
        program || null,
        kegiatan || null,
        sub_kegiatan || null,
        kode,
        nama || kode,
        nilai_anggaran,
        pptk_id || null,
        id,
      ];
      const result = await runQuery(sql, params);
      if (result.changes === 0) {
        return res
          .status(404)
          .json({ message: "Data anggaran tidak ditemukan." });
      }
      res.json({
        message: "Data anggaran berhasil diperbarui.",
        data: { id, ...req.body },
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal memperbarui anggaran id ${id}:`, err);
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE anggaran
router.delete(
  "/api/anggaran/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await runQuery("DELETE FROM anggaran WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res
          .status(404)
          .json({ message: "Data anggaran tidak ditemukan." });
      }
      res.json({ message: "Data anggaran berhasil dihapus." });
    } catch (err) {
      console.error(`[API ERROR] Gagal menghapus anggaran id ${id}:`, err);
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
