const express = require("express");
const bcrypt = require("bcryptjs");
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

// ================= USER ADMINISTRATION ENDPOINTS =================

// GET all users
router.get(
  "/users",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    try {
      const users = await dbAll(
        "SELECT id, username, name, role, nip, jabatan, foto_profil FROM users ORDER BY name ASC",
        [],
      );
      res.json(users);
    } catch (err) {
      console.error("[API ERROR] Gagal mengambil daftar pengguna:", err);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
);

// POST new user
router.post(
  "/users",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const { name, username, password, role, nip, jabatan } = req.body;
    try {
      if (!name || !username || !password || !role) {
        return res.status(400).json({ message: "Semua field harus diisi." });
      }

      const existingUser = await dbGet(
        "SELECT id FROM users WHERE username = ?",
        [username],
      );
      if (existingUser) {
        return res.status(409).json({ message: "Username sudah digunakan." });
      }

      const hash = await bcrypt.hash(password, 10);

      const sql =
        "INSERT INTO users (name, username, password, role, nip, jabatan) VALUES (?, ?, ?, ?, ?, ?)";
      const result = await dbQuery(sql, [
        name,
        username,
        hash,
        role,
        nip || null,
        jabatan || null,
      ]);

      res.status(201).json({
        message: "Pengguna baru berhasil ditambahkan.",
        id: result.insertId,
      });
    } catch (err) {
      console.error("[API ERROR] Gagal menambah pengguna:", err);
      res.status(500).json({
        message: "Gagal menyimpan pengguna baru.",
        error: err.message,
      });
    }
  },
);

// GET single user
router.get(
  "/users/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const sql =
      "SELECT id, name, username, role, nip, jabatan FROM users WHERE id = ?";
    try {
      const user = await dbGet(sql, [req.params.id]);
      if (!user) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }
      res.json(user);
    } catch (err) {
      console.error(
        `[API ERROR] Gagal mengambil pengguna id ${req.params.id}:`,
        err,
      );
      res.status(500).json({
        message: "Gagal mengambil data pengguna.",
        error: err.message,
      });
    }
  },
);

// PUT update user
router.put(
  "/users/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const { name, username, role, password, nip, jabatan } = req.body;
    const userIdToUpdate = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
      if (!name || !username || !role) {
        return res
          .status(400)
          .json({ message: "Nama, username, dan role harus diisi." });
      }

      const userToUpdate = await dbGet("SELECT role FROM users WHERE id = ?", [
        userIdToUpdate,
      ]);
      if (!userToUpdate) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }

      if (loggedInUser.role === "admin") {
        if (userToUpdate.role !== "user") {
          return res.status(403).json({
            message: 'Admin hanya dapat mengubah pengguna dengan peran "User".',
          });
        }
        if (role === "admin" || role === "superadmin") {
          return res.status(403).json({
            message:
              'Admin tidak dapat memberikan peran "Admin" atau "Super Admin".',
          });
        }
      }

      if (
        loggedInUser.role === "superadmin" &&
        userToUpdate.role === "superadmin" &&
        role !== "superadmin"
      ) {
        const superadminCountResult = await dbGet(
          "SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'",
        );
        if (superadminCountResult && superadminCountResult.count <= 1) {
          return res.status(403).json({
            message: "Tidak dapat mengubah peran Super Admin terakhir.",
          });
        }
      }

      const existingUser = await dbGet(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, userIdToUpdate],
      );
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Username sudah digunakan oleh pengguna lain." });
      }

      let updateFields = [
        "name = ?",
        "username = ?",
        "role = ?",
        "nip = ?",
        "jabatan = ?",
      ];
      let params = [name, username, role, nip || null, jabatan || null];
      if (password && password.trim() !== "") {
        const hash = await bcrypt.hash(password, 10);
        updateFields.push("password = ?");
        params.push(hash);
      }
      params.push(userIdToUpdate);

      const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
      const result = await dbQuery(sql, params);

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Pengguna tidak ditemukan untuk diperbarui." });
      }

      res.json({ message: "Pengguna berhasil diperbarui." });
    } catch (err) {
      console.error(
        `[API ERROR] Gagal memperbarui pengguna id ${userIdToUpdate}:`,
        err,
      );
      res
        .status(500)
        .json({ message: "Gagal memperbarui pengguna.", error: err.message });
    }
  },
);

// DELETE user
router.delete(
  "/users/:id",
  isApiAuthenticated,
  isApiAdminOrSuperAdmin,
  async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
      if (userIdToDelete === loggedInUser.id) {
        return res
          .status(403)
          .json({ message: "Anda tidak dapat menghapus akun Anda sendiri." });
      }

      const userToDelete = await dbGet("SELECT role FROM users WHERE id = ?", [
        userIdToDelete,
      ]);
      if (!userToDelete) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }

      if (loggedInUser.role === "admin" && userToDelete.role !== "user") {
        return res.status(403).json({
          message: 'Admin hanya dapat menghapus pengguna dengan peran "User".',
        });
      }

      if (
        loggedInUser.role === "superadmin" &&
        userToDelete.role === "superadmin"
      ) {
        const superadminCountResult = await dbGet(
          "SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'",
        );
        if (superadminCountResult && superadminCountResult.count <= 1) {
          return res
            .status(403)
            .json({ message: "Tidak dapat menghapus Super Admin terakhir." });
        }
      }

      const sql = "DELETE FROM users WHERE id = ?";
      const [result] = await dbQuery(sql, [userIdToDelete]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }

      res.json({ message: "Pengguna berhasil dihapus." });
    } catch (err) {
      console.error(
        `[API ERROR] Gagal menghapus pengguna id ${userIdToDelete}:`,
        err,
      );
      res
        .status(500)
        .json({ message: "Gagal menghapus pengguna.", error: err.message });
    }
  },
);

module.exports = router;
