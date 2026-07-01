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
const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

router.get("/sppd", isApiAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  try {
    const totalSql = "SELECT COUNT(*) as total FROM sppd";
    const totalResult = await dbGet(totalSql);
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const sppdSql = `
            SELECT 
                sp.id, sp.nomor_sppd, sp.tanggal_sppd, sp.spt_id,
                s.nomor_surat, s.maksud_perjalanan,
                p.nama_lengkap as pegawai_nama,
                p.nip as pegawai_nip,
                CASE WHEN ps.id IS NOT NULL THEN 1 ELSE 0 END as is_canceled
            FROM sppd sp
            JOIN spt s ON sp.spt_id = s.id
            JOIN pegawai p ON sp.pegawai_id = p.id
            LEFT JOIN pembatalan_spt ps ON ps.spt_id = sp.spt_id AND ps.pegawai_id = sp.pegawai_id
            ORDER BY sp.tanggal_sppd DESC, sp.id DESC
            LIMIT ? OFFSET ?
        `;
    const rows = await dbAll(sppdSql, [limit, offset]);
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
    console.error("[API ERROR] Gagal mengambil data SPPD:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/sppd/:id", isApiAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
            SELECT 
                sp.*,
                s.nomor_surat, s.tanggal_surat, s.maksud_perjalanan, s.lokasi_tujuan,
                s.tanggal_berangkat, s.tanggal_kembali, s.kendaraan, s.lama_perjalanan,
                p.nama_lengkap as pegawai_nama, p.nip as pegawai_nip, p.pangkat, p.golongan, p.jabatan,
                pj.nama as pejabat_nama, pj.jabatan as pejabat_jabatan, pj.nip as pejabat_nip
            FROM sppd sp
            JOIN spt s ON sp.spt_id = s.id
            LEFT JOIN spt_pegawai spg ON s.id = spg.spt_id AND spg.is_pengikut = 0
            LEFT JOIN pegawai p ON spg.pegawai_id = p.id
            LEFT JOIN pejabat pj ON s.pejabat_pemberi_tugas_id = pj.id
            WHERE sp.id = ?
        `;

    const sppdData = await dbGet(sql, [id]);

    if (!sppdData) {
      return res.status(404).json({ message: "SPD tidak ditemukan." });
    }

    const pengikutSql = `
            SELECT p.nama_lengkap, p.nip 
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ? AND sp.is_pengikut = 1
        `;
    const pengikut = await dbAll(pengikutSql, [sppdData.spt_id]);

    res.json({
      sppd: sppdData,
      spt: {
        nomor_surat: sppdData.nomor_surat,
        tanggal_surat: sppdData.tanggal_surat,
        maksud_perjalanan: sppdData.maksud_perjalanan,
        lokasi_tujuan: sppdData.lokasi_tujuan,
        tanggal_berangkat: sppdData.tanggal_berangkat,
        tanggal_kembali: sppdData.tanggal_kembali,
        kendaraan: sppdData.kendaraan,
        lama_perjalanan: sppdData.lama_perjalanan,
      },
      pegawai: {
        nama_lengkap: sppdData.pegawai_nama,
        nip: sppdData.pegawai_nip,
        pangkat: sppdData.pangkat,
        golongan: sppdData.golongan,
        jabatan: sppdData.jabatan,
      },
      pejabat: {
        nama: sppdData.pejabat_nama,
        jabatan: sppdData.pejabat_jabatan,
        nip: sppdData.pejabat_nip,
      },
      pengikut: pengikut,
    });
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil data SPD:", err);
    res.status(500).json({ message: "Gagal mengambil data SPD." });
  }
});

router.post("/sppd/auto-create", isApiAuthenticated, async (req, res) => {
  try {
    const { spt_id } = req.body;

    const spt = await dbGet("SELECT * FROM spt WHERE id = ?", [spt_id]);
    if (!spt) {
      return res.status(404).json({ message: "SPT tidak ditemukan." });
    }

    const existingSppd = await dbGet("SELECT * FROM sppd WHERE spt_id = ?", [
      spt_id,
    ]);
    if (existingSppd) {
      return res.status(400).json({ message: "SPD sudah ada untuk SPT ini." });
    }

    const currentYear = new Date().getFullYear();
    // PERBAIKAN: Menggunakan sintaks SQLite strftime
    const countSppd = await dbGet(
      "SELECT COUNT(*) as count FROM sppd WHERE strftime('%Y', tanggal_sppd) = ?",
      [currentYear.toString()],
    );
    const nomorSppd = `800 / ${countSppd.count + 1} /SETDA/${currentYear}`;

    // PERBAIKAN: Menggunakan date('now') untuk SQLite
    const insertSql = `
            INSERT INTO sppd (nomor_sppd, tanggal_sppd, spt_id) 
            VALUES (?, date('now'), ?)
        `;
    const result = await runQuery(insertSql, [nomorSppd, spt_id]);

    res.json({
      message: "SPD berhasil dibuat otomatis.",
      sppdId: result.lastID,
      nomorSppd: nomorSppd,
    });
  } catch (err) {
    console.error("[API ERROR] Gagal membuat SPD otomatis:", err);
    res.status(500).json({ message: "Gagal membuat SPD otomatis." });
  }
});

router.get("/sppd/by-spt/:spt_id", isApiAuthenticated, async (req, res) => {
  try {
    let { spt_id } = req.params;
    const { id_type } = req.query;

    if (id_type === "sppd") {
      const sppd = await dbGet("SELECT spt_id FROM sppd WHERE id = ?", [
        spt_id,
      ]);
      if (!sppd) {
        return res
          .status(404)
          .json({ message: `Data SPPD dengan ID ${spt_id} tidak ditemukan.` });
      }
      spt_id = sppd.spt_id;
    }

    const sptSql = "SELECT * FROM spt WHERE id = ?";
    const spt = await dbGet(sptSql, [spt_id]);
    if (!spt) {
      return res
        .status(404)
        .json({ message: "Data SPT terkait tidak ditemukan." });
    }

    const sppdList = await dbAll("SELECT * FROM sppd WHERE spt_id = ?", [
      spt_id,
    ]);
    if (!sppdList || sppdList.length === 0) {
      return res.status(404).json({
        message: `Tidak ada data SPPD yang ditemukan untuk SPT ID ${spt_id}.`,
      });
    }

    for (const sppd of sppdList) {
      const pegawaiSql = `SELECT * FROM pegawai WHERE id = ?`;
      const pegawai = await dbGet(pegawaiSql, [sppd.pegawai_id]);
      sppd.pegawai = pegawai || {
        nama_lengkap: "Data Pegawai Tidak Ditemukan",
      };
    }

    let pejabat = await dbGet(
      "SELECT id, nama, jabatan, nip FROM pejabat WHERE id = ?",
      [spt.pejabat_pemberi_tugas_id],
    );
    if (!pejabat) {
      const pegawaiAsPejabat = await dbGet(
        "SELECT id, nama_lengkap as nama, jabatan, nip FROM pegawai WHERE id = ?",
        [spt.pejabat_pemberi_tugas_id],
      );
      pejabat = pegawaiAsPejabat;
    }

    if (!pejabat) {
      console.warn(
        `[WARN] Pejabat pemberi tugas dengan ID ${spt.pejabat_pemberi_tugas_id} tidak ditemukan untuk SPT ID ${spt.id}.`,
      );
      pejabat = {
        nama: "Data Pejabat Tidak Ditemukan",
        jabatan: "Data Jabatan Tidak Ditemukan",
        nip: "-",
      };
    }

    let anggaran = await dbGet(
      "SELECT mata_anggaran_kode, mata_anggaran_nama FROM anggaran WHERE id = ?",
      [spt.anggaran_id],
    );
    if (!anggaran) {
      console.warn(
        `[WARN] Data anggaran dengan ID ${spt.anggaran_id} tidak ditemukan untuk SPT ID ${spt.id}.`,
      );
      anggaran = {
        mata_anggaran_kode: "Tidak Ditemukan",
        mata_anggaran_nama: "",
      };
    }

    let penggunaAnggaran = await dbGet(
      "SELECT nama_lengkap FROM pegawai WHERE jabatan = 'Kepala Dinas' LIMIT 1",
    );
    if (!penggunaAnggaran) {
      console.warn(
        `[WARN] Data Pengguna Anggaran (Kepala Dinas) tidak ditemukan.`,
      );
      penggunaAnggaran = {
        nama_lengkap: "Kepala Dinas (Data tidak ditemukan)",
      };
    }

    let penandatanganSppd = await dbGet(
      "SELECT nama_lengkap as nama, nip, jabatan FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1",
    );
    if (!penandatanganSppd) {
      console.warn(
        `[WARN] Data Penandatangan SPPD (Kepala Dinas) tidak ditemukan.`,
      );
      penandatanganSppd = {
        nama: "(Nama Kepala Dinas)",
        nip: "(NIP Kepala Dinas)",
        jabatan: "Kepala Dinas",
      };
    }

    const pengikutSql = `
            SELECT p.nama_lengkap, p.nip 
            FROM spt_pegawai sp
            JOIN pegawai p ON sp.pegawai_id = p.id
            WHERE sp.spt_id = ? AND sp.is_pengikut = 1
        `;
    const pengikut = await dbAll(pengikutSql, [spt_id]);

    res.json({
      sppdList,
      spt,
      pejabat,
      pengikut,
      anggaran,
      penggunaAnggaran,
      penandatanganSppd,
    });
  } catch (err) {
    console.error(
      `[API ERROR] Gagal mengambil SPPD untuk SPT id ${req.params.spt_id}:`,
      err,
    );
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

module.exports = router;
