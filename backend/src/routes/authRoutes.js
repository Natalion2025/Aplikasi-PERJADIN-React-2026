const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const util = require("util");

const router = express.Router();

// Helper untuk menggunakan db.query yang sudah promise-based
const dbQuery = db.query;

const dbGet = async (sql, params) => {
  const results = await dbQuery(sql, params);
  return results[0];
};

// API Login
router.post("/login", async (req, res) => {
  console.log("API: Menerima request ke /api/auth/login");
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      console.log("API GAGAL: Username atau password kosong.");
      return res
        .status(400)
        .json({ message: "Username dan password harus diisi." });
    }

    const sql = "SELECT * FROM users WHERE username = ?";
    console.log(`API: Mencari user '${username}' di database...`);
    const user = await dbGet(sql, [username]);

    if (!user) {
      console.log(`API GAGAL: User '${username}' tidak ditemukan.`);
      return res.status(401).json({ message: "Username atau password salah." });
    }
    console.log(`API SUKSES: User '${username}' ditemukan.`);

    if (!user.password) {
      console.error(
        `API ERROR: Pengguna ${username} tidak memiliki hash password di database.`,
      );
      return res.status(500).json({ message: "Konfigurasi akun bermasalah." });
    }

    console.log(`API: Membandingkan password untuk user '${username}'...`);
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log(`API GAGAL: Password salah untuk user '${username}'.`);
      return res.status(401).json({ message: "Username atau password salah." });
    }
    console.log(`API SUKSES: Password cocok untuk user '${username}'.`);

    console.log(`API: Membuat sesi untuk user '${username}'...`);
    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    // Simpan sesi secara eksplisit sebelum mengirim respons.
    req.session.save((err) => {
      if (err) {
        console.error("API ERROR: Gagal menyimpan sesi:", err);
        return res
          .status(500)
          .json({ message: "Terjadi kesalahan saat menyimpan sesi." });
      }

      console.log(`API SUKSES: Sesi untuk '${username}' berhasil disimpan.`);
      res
        .status(200)
        .json({ message: "Login berhasil.", redirectTo: "/dashboard" });
    });
  } catch (error) {
    console.error(
      "API ERROR: Terjadi kesalahan internal di proses login:",
      error,
    );
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// API Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Gagal untuk logout." });
    }
    res.clearCookie("connect.sid"); // Nama cookie default
    res.json({ message: "Logout berhasil." });
  });
});

module.exports = router;
