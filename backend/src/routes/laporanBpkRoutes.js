const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { isApiAuthenticated } = require("../middleware/auth");

const dbQuery = db.query;

const dbGet = async (sql, params) => {
  const results = await dbQuery(sql, params);
  return results[0];
};
const dbAll = async (sql, params) => {
  return await dbQuery(sql, params);
};

// Helper untuk mendapatkan tingkat biaya (untuk uang harian)
const getTingkatBiaya = (pegawai) => {
  const jabatan = (pegawai.jabatan || "").toLowerCase().trim();
  if (jabatan.includes("kepala dinas")) return "Golongan B";
  if (
    jabatan.startsWith("sekretaris") ||
    jabatan.startsWith("kepala bagian") ||
    jabatan.startsWith("kepala bidang")
  )
    return "Golongan C";
  return "Golongan D";
};

// Helper untuk mendapatkan kolom golongan dari tingkat biaya
const getKolomGolongan = (tingkatBiaya) => {
  const mapping = {
    "Golongan B": "gol_b",
    "Golongan C": "gol_c",
    "Golongan D": "gol_d",
  };
  return mapping[tingkatBiaya] || "gol_d";
};

// Endpoint untuk tab "Informasi Dasar"
router.get("/laporan-bpk", isApiAuthenticated, async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countSql = `SELECT COUNT(DISTINCT sp.spt_id, sp.pegawai_id) as total FROM spt_pegawai sp`;
    const totalResult = await dbGet(countSql);
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT
        p.id as pegawai_id,
        p.nama_lengkap,
        p.jabatan,
        p.pangkat,
        p.golongan,
        s.id as spt_id,
        s.nomor_surat,
        s.tanggal_berangkat,
        s.tanggal_kembali,
        s.maksud_perjalanan,
        s.keterangan as keterangan_spt,
        spd.nomor_sppd,
        a.mata_anggaran_nama
      FROM spt_pegawai sp
      JOIN pegawai p ON sp.pegawai_id = p.id
      JOIN spt s ON sp.spt_id = s.id
      LEFT JOIN sppd spd ON s.id = spd.spt_id AND p.id = spd.pegawai_id
      LEFT JOIN anggaran a ON s.anggaran_id = a.id
      ORDER BY s.tanggal_berangkat DESC, p.nama_lengkap ASC
      LIMIT ? OFFSET ?
    `;
    const data = await dbAll(dataSql, [parseInt(limit), parseInt(offset)]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[API BPK ERROR] Gagal mengambil data dasar:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data dasar laporan audit." });
  }
});

// Endpoint untuk tab "Transportasi"
router.get(
  "/laporan-bpk/transportasi",
  isApiAuthenticated,
  async (req, res) => {
    const { page = 1, limit = 5, arah = "berangkat" } = req.query;
    const offset = (page - 1) * limit;

    try {
      const countSql = `
      SELECT COUNT(*) as total
      FROM laporan_transportasi lt
      WHERE lt.arah_perjalanan = ?
    `;
      const totalResult = await dbGet(countSql, [arah]);
      const totalItems = totalResult.total;
      const totalPages = Math.ceil(totalItems / limit);

      const dataSql = `
      SELECT
        p.nama_lengkap, p.jabatan,
        s.nomor_surat,
        lt.*
      FROM laporan_transportasi lt
      JOIN laporan_perjadin lp ON lt.laporan_id = lp.id
      JOIN spt s ON lp.spt_id = s.id
      JOIN pegawai p ON lt.pegawai_id = p.id
      WHERE lt.arah_perjalanan = ?
      ORDER BY lt.tanggal_tiket DESC, p.nama_lengkap ASC
      LIMIT ? OFFSET ?
    `;
      const data = await dbAll(dataSql, [
        arah,
        parseInt(limit),
        parseInt(offset),
      ]);

      res.json({
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages,
        },
      });
    } catch (error) {
      console.error(
        "[API BPK ERROR] Gagal mengambil data transportasi:",
        error,
      );
      res
        .status(500)
        .json({ message: "Gagal mengambil data transportasi laporan audit." });
    }
  },
);

// Endpoint untuk tab "Akomodasi"
router.get("/laporan-bpk/akomodasi", isApiAuthenticated, async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countSql = `SELECT COUNT(*) as total FROM laporan_akomodasi`;
    const totalResult = await dbGet(countSql);
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT
        p.nama_lengkap, p.jabatan,
        s.nomor_surat,
        la.nama as nama_hotel,
        la.lokasi_hotel,
        la.tanggal_checkIn,
        la.tanggal_checkOut,
        la.malam,
        la.harga_satuan,
        la.nominal as total_harga
      FROM laporan_akomodasi la
      JOIN laporan_perjadin lp ON la.laporan_id = lp.id
      JOIN spt s ON lp.spt_id = s.id
      JOIN pegawai p ON la.pegawai_id = p.id
      ORDER BY la.tanggal_checkIn DESC, p.nama_lengkap ASC
      LIMIT ? OFFSET ?
    `;
    const data = await dbAll(dataSql, [parseInt(limit), parseInt(offset)]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[API BPK ERROR] Gagal mengambil data akomodasi:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data akomodasi laporan audit." });
  }
});

// Endpoint untuk tab "Uang Harian"
router.get("/laporan-bpk/uang-harian", isApiAuthenticated, async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countSql = `SELECT COUNT(DISTINCT lp.id, p.id) as total
                        FROM laporan_perjadin lp
                        JOIN spt s ON lp.spt_id = s.id
                        JOIN spt_pegawai sp ON s.id = sp.spt_id
                        JOIN pegawai p ON sp.pegawai_id = p.id`;
    const totalResult = await dbGet(countSql);
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
            SELECT
                p.nama_lengkap, p.jabatan,
                s.nomor_surat,
                s.lama_perjalanan as jumlah_hari,
                (
                    SELECT sb.besaran
                    FROM standar_biaya sb
                    WHERE sb.tipe_biaya = 'C' AND s.lokasi_tujuan LIKE CONCAT('%', sb.provinsi, '%')
                    LIMIT 1
                ) as tarif_satuan,
                (
                    SELECT sb.besaran * s.lama_perjalanan
                    FROM standar_biaya sb
                    WHERE sb.tipe_biaya = 'C' AND s.lokasi_tujuan LIKE CONCAT('%', sb.provinsi, '%')
                    LIMIT 1
                ) as total,
                (
                    SELECT sb.besaran * s.lama_perjalanan
                    FROM standar_biaya sb
                    WHERE sb.tipe_biaya = 'D' AND p.jabatan LIKE '%Kepala Dinas%'
                    LIMIT 1
                ) as biaya_representatif
            FROM laporan_perjadin lp
            JOIN spt s ON lp.spt_id = s.id
            JOIN spt_pegawai sp ON s.id = sp.spt_id
            JOIN pegawai p ON sp.pegawai_id = p.id
            ORDER BY s.tanggal_berangkat DESC
            LIMIT ? OFFSET ?
        `;

    const data = await dbAll(dataSql, [parseInt(limit), parseInt(offset)]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[API BPK ERROR] Gagal mengambil data uang harian:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data uang harian laporan audit." });
  }
});

// Endpoint untuk tab "Lain-lain"
router.get("/laporan-bpk/lain-lain", isApiAuthenticated, async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countSql = `SELECT COUNT(*) as total FROM laporan_lain_lain`;
    const totalResult = await dbGet(countSql);
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT
        p.nama_lengkap, p.jabatan,
        s.nomor_surat,
        ll.uraian,
        ll.jumlah_hari,
        ll.tarif_satuan,
        ll.nominal as total,
        ll.keterangan
      FROM laporan_lain_lain ll
      JOIN laporan_perjadin lp ON ll.laporan_id = lp.id
      JOIN spt s ON lp.spt_id = s.id
      JOIN pegawai p ON ll.pegawai_id = p.id
      ORDER BY lp.tanggal_laporan DESC, p.nama_lengkap ASC
      LIMIT ? OFFSET ?
    `;
    const data = await dbAll(dataSql, [parseInt(limit), parseInt(offset)]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "[API BPK ERROR] Gagal mengambil data biaya lain-lain:",
      error,
    );
    res
      .status(500)
      .json({ message: "Gagal mengambil data biaya lain-lain laporan audit." });
  }
});

// Endpoint untuk Cetak Laporan BPK
router.get("/cetak/laporan-bpk", isApiAuthenticated, async (req, res) => {
  try {
    const dataSql = `
      SELECT
        s.id as spt_id,
        p.id as pegawai_id,
        p.nama_lengkap,
        p.nip,
        p.pangkat,
        p.golongan,
        p.jabatan,
        s.nomor_surat,
        s.tanggal_surat,
        s.maksud_perjalanan,
        s.keterangan as keterangan_spt,
        s.tanggal_berangkat,
        s.tanggal_kembali,
        spd.nomor_sppd,
        spd.tanggal_sppd,
        (SELECT GROUP_CONCAT(pg.nama_lengkap SEPARATOR ', ') FROM spt_pegawai spg JOIN pegawai pg ON spg.pegawai_id = pg.id WHERE spg.spt_id = s.id AND spg.is_pengikut = 1) as pengikut,
        (SELECT nominal FROM laporan_transportasi WHERE laporan_id = lp.id AND pegawai_id = p.id AND arah_perjalanan = 'berangkat' LIMIT 1) as transport_berangkat_nominal,
        (SELECT nominal FROM laporan_transportasi WHERE laporan_id = lp.id AND pegawai_id = p.id AND arah_perjalanan = 'kembali' LIMIT 1) as transport_pulang_nominal,
        (SELECT nominal FROM laporan_akomodasi WHERE laporan_id = lp.id AND pegawai_id = p.id LIMIT 1) as akomodasi_nominal,
        (SELECT SUM(nominal) FROM laporan_lain_lain WHERE laporan_id = lp.id AND pegawai_id = p.id AND (uraian LIKE '%sewa mobil%' OR uraian LIKE '%sewa kendaraan%')) as sewa_kendaraan_nominal,
        (SELECT SUM(nominal) FROM laporan_lain_lain WHERE laporan_id = lp.id AND pegawai_id = p.id AND uraian NOT LIKE '%sewa mobil%' AND uraian NOT LIKE '%sewa kendaraan%') as biaya_lain_sisa_nominal,
        (SELECT GROUP_CONCAT(uraian SEPARATOR ', ') FROM laporan_lain_lain WHERE laporan_id = lp.id AND pegawai_id = p.id AND uraian NOT LIKE '%sewa mobil%' AND uraian NOT LIKE '%sewa kendaraan%') as biaya_lain_sisa_uraian
      FROM spt_pegawai sp
      JOIN pegawai p ON sp.pegawai_id = p.id
      JOIN spt s ON sp.spt_id = s.id
      LEFT JOIN laporan_perjadin lp ON s.id = lp.spt_id
      LEFT JOIN sppd spd ON s.id = spd.spt_id AND p.id = spd.pegawai_id
      WHERE sp.is_pengikut = 0
      ORDER BY s.tanggal_berangkat, p.nama_lengkap
    `;
    const results = await dbAll(dataSql);

    const penandatangan = await dbGet(
      "SELECT nama_lengkap, nip FROM pegawai WHERE jabatan LIKE '%Kepala Dinas%' LIMIT 1",
    );

    const finalData = [];
    for (const item of results) {
      const tingkatBiaya = getTingkatBiaya(item);
      const kolomGolongan = getKolomGolongan(tingkatBiaya);

      const uhHarian = await dbGet(
        `SELECT ${kolomGolongan} as tarif FROM standar_biaya WHERE tipe_biaya = 'A' AND uraian LIKE ? LIMIT 1`,
        [`%${item.lokasi_tujuan}%`],
      );
      const uhLuar = await dbGet(
        `SELECT besaran as tarif FROM standar_biaya WHERE tipe_biaya = 'C' AND provinsi LIKE ? LIMIT 1`,
        [`%${item.lokasi_tujuan.split(",").pop().trim()}%`],
      );
      const tarifHarian = uhHarian?.tarif || uhLuar?.tarif || 0;
      const totalUangHarian = tarifHarian * (item.lama_perjalanan || 1);

      let uangRepresentatif = 0;
      if (item.jabatan.toLowerCase().includes("kepala dinas")) {
        const rep = await dbGet(
          `SELECT besaran FROM standar_biaya WHERE tipe_biaya = 'D' AND uraian LIKE '%ESELON II%' LIMIT 1`,
        );
        uangRepresentatif = (rep?.besaran || 0) * (item.lama_perjalanan || 1);
      }

      const totalDiterima =
        (item.transport_berangkat_nominal || 0) +
        (item.transport_pulang_nominal || 0) +
        (item.akomodasi_nominal || 0) +
        totalUangHarian +
        uangRepresentatif +
        (item.sewa_kendaraan_nominal || 0) +
        (item.biaya_lain_sisa_nominal || 0);

      finalData.push({
        ...item,
        pangkat_golongan: `${item.pangkat || ""} / ${item.golongan || ""}`,
        jenis_perjadin: uhHarian ? "Dalam Daerah" : "Luar Daerah",
        transport_berangkat: { nominal: item.transport_berangkat_nominal },
        transport_pulang: { nominal: item.transport_pulang_nominal },
        akomodasi: { nominal: item.akomodasi_nominal },
        uang_harian: {
          jumlah_hari: item.lama_perjalanan,
          tarif_satuan: tarifHarian,
          total: totalUangHarian,
        },
        uang_representatif: uangRepresentatif,
        sewa_kendaraan_dalam_kota: { nominal: item.sewa_kendaraan_nominal },
        biaya_lain_sisa: {
          nominal: item.biaya_lain_sisa_nominal,
          uraian: item.biaya_lain_sisa_uraian,
        },
        total_diterima: totalDiterima,
      });
    }

    res.json({ data: finalData, penandatangan });
  } catch (error) {
    console.error("[API BPK ERROR] Gagal mengambil data cetak:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data cetak laporan audit." });
  }
});

module.exports = router;
