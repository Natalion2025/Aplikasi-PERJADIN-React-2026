const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const util = require("util");
const db = require("../config/db");
const {
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
} = require("../middleware/auth");

const router = express.Router();

// Helper untuk menggunakan db.query yang sudah promise-based
const dbQuery = db.query;

const dbGet = async (sql, params) => {
  const results = await dbQuery(sql, params);
  return results[0];
};
const dbAll = async (sql, params) => {
  const results = await dbQuery(sql, params);
  return results;
};

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

// Pastikan direktori tujuan upload ada
const avatarDir = path.join(__dirname, "../../public/uploads/avatars");
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Konfigurasi Multer untuk upload foto profil
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
      cb(
        null,
        `avatar-${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`,
      );
    },
  }),
}).single("foto_profil");

// API untuk mendapatkan data sesi pengguna yang sedang login
router.get("/session", async (req, res) => {
  if (req.session && req.session.user && req.session.user.id) {
    try {
      const userId = req.session.user.id;
      const sql =
        "SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?";
      const userFromDb = await dbGet(sql, [userId]);

      if (userFromDb) {
        req.session.user = userFromDb;
        // PERBAIKAN: Gunakan callback dari req.session.save untuk memastikan
        // sesi tersimpan sebelum mengirim respons. Ini mencegah race condition.
        req.session.save((err) => {
          if (err) throw err; // Lemparkan error agar ditangkap oleh blok catch
          res.json({ user: req.session.user });
        });
      } else {
        res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }
    } catch (err) {
      console.error(
        "[API ERROR] Gagal mengambil data user dari DB untuk sesi:",
        err,
      );
      res.status(500).json({ message: "Internal server error." });
    }
  } else {
    res.status(401).json({ message: "Tidak ada sesi aktif." });
  }
});

// API untuk mendapatkan data profil pengguna
router.get("/profile", async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: "Tidak ada sesi aktif." });
  }
  const sql =
    "SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?";
  try {
    const user = await dbGet(sql, [req.session.user.id]);
    if (!user) {
      return res
        .status(404)
        .json({ message: "Profil pengguna tidak ditemukan." });
    }
    res.json({ user: user });
  } catch (err) {
    console.error("[API ERROR] Gagal mengambil data profil:", err);
    res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil profil.",
    });
  }
});

// API untuk memperbarui data profil pengguna
router.put("/profile", profileUpload, async (req, res) => {
  const { name, username, nip, jabatan, newPassword } = req.body;
  const oldUsername = req.session.user.username;
  const userId = req.session.user.id;
  const userRole = req.session.user.role;

  if (!name || !username) {
    return res
      .status(400)
      .json({ message: "Nama Lengkap dan Username harus diisi." });
  }
  if (userRole === "superadmin" && username !== oldUsername) {
    return res
      .status(403)
      .json({ message: "Super Admin tidak dapat mengubah username." });
  }

  try {
    await dbQuery("START TRANSACTION");

    const currentUser = await dbGet(
      "SELECT foto_profil FROM users WHERE id = ?",
      [userId],
    );

    if (username !== oldUsername) {
      const existingUser = await dbGet(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, userId],
      );
      if (existingUser) throw new Error("Username tersebut sudah digunakan.");
    }

    if (nip) {
      const existingNipUser = await dbGet(
        'SELECT id FROM users WHERE nip = ? AND id != ? AND nip IS NOT NULL AND nip != ""',
        [nip, userId],
      );
      if (existingNipUser)
        throw new Error("NIP tersebut sudah digunakan oleh pengguna lain.");
    }

    let updateFields = ["name = ?", "username = ?", "nip = ?", "jabatan = ?"];
    let updateParams = [name, username, nip || null, jabatan || null];

    if (newPassword && newPassword.length > 0) {
      if (newPassword.length < 6)
        throw new Error("Password baru minimal harus 6 karakter.");
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateFields.push("password = ?");
      updateParams.push(hashedPassword);
    }

    if (req.file) {
      // Ubah path absolut menjadi path relatif yang disimpan di db
      const relativePath = `uploads/avatars/${req.file.filename}`;
      updateFields.push("foto_profil = ?");
      updateParams.push(relativePath);

      if (currentUser && currentUser.foto_profil) {
        const oldPhotoFullPath = path.join(
          __dirname,
          "../../public",
          currentUser.foto_profil,
        );
        if (fs.existsSync(oldPhotoFullPath)) fs.unlinkSync(oldPhotoFullPath);
      }
    }

    updateParams.push(userId);
    const userUpdateSql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? `;
    await dbQuery(userUpdateSql, updateParams);

    await dbQuery("COMMIT");

    const updatedUser = await dbGet(
      "SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?",
      [userId],
    );
    req.session.user = updatedUser;

    // PERBAIKAN: Gunakan callback dari req.session.save untuk memastikan
    // sesi tersimpan sebelum mengirim respons.
    req.session.save((err) => {
      if (err) throw err;
      res.json({ message: "Profil berhasil diperbarui." });
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    await dbQuery("ROLLBACK").catch((rbErr) =>
      console.error("[API ERROR] Gagal rollback:", rbErr),
    );
    console.error("[API ERROR] Gagal memperbarui profil:", error);
    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      error: error.message,
    });
  }
});

module.exports = router;
