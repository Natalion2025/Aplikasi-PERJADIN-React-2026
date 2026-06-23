const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const util = require('util');
const db = require('../config/db');
const { isApiAuthenticated, isApiAdminOrSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Promisify fungsi database untuk async/await
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});

// Pastikan direktori tujuan upload ada
const avatarDir = path.join(__dirname, '../../public/uploads/avatars');
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
            cb(null, `avatar-${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`);
        }
    })
}).single('foto_profil');

// API untuk mendapatkan data sesi pengguna yang sedang login
router.get('/session', async (req, res) => {
    if (req.session && req.session.user && req.session.user.id) {
        try {
            const userId = req.session.user.id;
            const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
            const userFromDb = await dbGet(sql, [userId]);

            if (userFromDb) {
                req.session.user = userFromDb;
                await new Promise((resolve, reject) => {
                    req.session.save(err => err ? reject(err) : resolve());
                });
                res.json({ user: req.session.user });
            } else {
                res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
            }
        } catch (err) {
            console.error('[API ERROR] Gagal mengambil data user dari DB untuk sesi:', err);
            res.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
});

// API untuk mendapatkan data profil pengguna
router.get('/profile', async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ message: 'Tidak ada sesi aktif.' });
    }
    const sql = 'SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?';
    try {
        const user = await dbGet(sql, [req.session.user.id]);
        if (!user) {
            return res.status(404).json({ message: 'Profil pengguna tidak ditemukan.' });
        }
        res.json({ user: user });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil data profil:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil profil.' });
    }
});

// API untuk memperbarui data profil pengguna
router.put('/profile', profileUpload, async (req, res) => {
    const { name, username, nip, jabatan, newPassword } = req.body;
    const oldUsername = req.session.user.username;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    if (!name || !username) {
        return res.status(400).json({ message: 'Nama Lengkap dan Username harus diisi.' });
    }
    if (userRole === 'superadmin' && username !== oldUsername) {
        return res.status(403).json({ message: 'Super Admin tidak dapat mengubah username.' });
    }

    try {
        await runQuery('START TRANSACTION');

        const currentUser = await dbGet('SELECT foto_profil FROM users WHERE id = ?', [userId]);

        if (username !== oldUsername) {
            const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existingUser) throw new Error('Username tersebut sudah digunakan.');
        }

        if (nip) {
            const existingNipUser = await dbGet('SELECT id FROM users WHERE nip = ? AND id != ? AND nip IS NOT NULL AND nip != ""', [nip, userId]);
            if (existingNipUser) throw new Error('NIP tersebut sudah digunakan oleh pengguna lain.');
        }

        let updateFields = ['name = ?', 'username = ?', 'nip = ?', 'jabatan = ?'];
        let updateParams = [name, username, nip || null, jabatan || null];

        if (newPassword && newPassword.length > 0) {
            if (newPassword.length < 6) throw new Error('Password baru minimal harus 6 karakter.');
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateFields.push('password = ?');
            updateParams.push(hashedPassword);
        }

        if (req.file) {
            // Ubah path absolut menjadi path relatif yang disimpan di db
            const relativePath = `uploads/avatars/${req.file.filename}`;
            updateFields.push('foto_profil = ?');
            updateParams.push(relativePath);

            if (currentUser && currentUser.foto_profil) {
                const oldPhotoFullPath = path.join(__dirname, '../../public', currentUser.foto_profil);
                if (fs.existsSync(oldPhotoFullPath)) fs.unlinkSync(oldPhotoFullPath);
            }
        }

        updateParams.push(userId);
        const userUpdateSql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        await runQuery(userUpdateSql, updateParams);

        await runQuery('COMMIT');

        const updatedUser = await dbGet('SELECT id, name, username, role, nip, jabatan, foto_profil FROM users WHERE id = ?', [userId]);
        req.session.user = updatedUser;

        await new Promise((resolve, reject) => {
            req.session.save(err => err ? reject(err) : resolve());
        });

        res.json({ message: 'Profil berhasil diperbarui.' });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        await runQuery('ROLLBACK').catch(rbErr => console.error('[API ERROR] Gagal rollback:', rbErr));
        console.error('[API ERROR] Gagal memperbarui profil:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
    }
});

// ================= USER ADMINISTRATION ENDPOINTS =================

// GET all users
router.get('/api/users', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, username, name, role, nip, jabatan, foto_profil FROM users ORDER BY name ASC', []);
        res.json(users);
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil daftar pengguna:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// POST new user
router.post('/api/users', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { name, username, password, role, nip, jabatan } = req.body;
    try {
        if (!name || !username || !password || !role) {
            return res.status(400).json({ message: 'Semua field harus diisi.' });
        }

        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan.' });
        }

        const hash = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (name, username, password, role, nip, jabatan) VALUES (?, ?, ?, ?, ?, ?)';
        const result = await runQuery(sql, [name, username, hash, role, nip || null, jabatan || null]);

        res.status(201).json({ message: 'Pengguna baru berhasil ditambahkan.', id: result.lastID });
    } catch (err) {
        console.error('[API ERROR] Gagal menambah pengguna:', err);
        res.status(500).json({ message: 'Gagal menyimpan pengguna baru.', error: err.message });
    }
});

// GET single user
router.get('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const sql = "SELECT id, name, username, role, nip, jabatan FROM users WHERE id = ?";
    try {
        const user = await dbGet(sql, [req.params.id]);
        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }
        res.json(user);
    } catch (err) {
        console.error(`[API ERROR] Gagal mengambil pengguna id ${req.params.id}:`, err);
        res.status(500).json({ message: "Gagal mengambil data pengguna.", error: err.message });
    }
});

// PUT update user
router.put('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const { name, username, role, password, nip, jabatan } = req.body;
    const userIdToUpdate = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
        if (!name || !username || !role) {
            return res.status(400).json({ message: 'Nama, username, dan role harus diisi.' });
        }

        const userToUpdate = await dbGet('SELECT role FROM users WHERE id = ?', [userIdToUpdate]);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        if (loggedInUser.role === 'admin') {
            if (userToUpdate.role !== 'user') {
                return res.status(403).json({ message: 'Admin hanya dapat mengubah pengguna dengan peran "User".' });
            }
            if (role === 'admin' || role === 'superadmin') {
                return res.status(403).json({ message: 'Admin tidak dapat memberikan peran "Admin" atau "Super Admin".' });
            }
        }

        if (loggedInUser.role === 'superadmin' && userToUpdate.role === 'superadmin' && role !== 'superadmin') {
            const superadminCountResult = await dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'");
            if (superadminCountResult && superadminCountResult.count <= 1) {
                return res.status(403).json({ message: 'Tidak dapat mengubah peran Super Admin terakhir.' });
            }
        }

        const existingUser = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, userIdToUpdate]);
        if (existingUser) {
            return res.status(409).json({ message: 'Username sudah digunakan oleh pengguna lain.' });
        }

        let updateFields = ['name = ?', 'username = ?', 'role = ?', 'nip = ?', 'jabatan = ?'];
        let params = [name, username, role, nip || null, jabatan || null];
        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            params.push(hash);
        }
        params.push(userIdToUpdate);

        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        const result = await runQuery(sql, params);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan untuk diperbarui.' });
        }

        res.json({ message: 'Pengguna berhasil diperbarui.' });

    } catch (err) {
        console.error(`[API ERROR] Gagal memperbarui pengguna id ${userIdToUpdate}:`, err);
        res.status(500).json({ message: 'Gagal memperbarui pengguna.', error: err.message });
    }
});

// DELETE user
router.delete('/api/users/:id', isApiAuthenticated, isApiAdminOrSuperAdmin, async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const loggedInUser = req.session.user;

    try {
        if (userIdToDelete === loggedInUser.id) {
            return res.status(403).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        }

        const userToDelete = await dbGet('SELECT role FROM users WHERE id = ?', [userIdToDelete]);
        if (!userToDelete) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        if (loggedInUser.role === 'admin' && userToDelete.role !== 'user') {
            return res.status(403).json({ message: 'Admin hanya dapat menghapus pengguna dengan peran "User".' });
        }

        if (loggedInUser.role === 'superadmin' && userToDelete.role === 'superadmin') {
            const superadminCountResult = await dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'");
            if (superadminCountResult && superadminCountResult.count <= 1) {
                return res.status(403).json({ message: 'Tidak dapat menghapus Super Admin terakhir.' });
            }
        }

        const sql = 'DELETE FROM users WHERE id = ?';
        const result = await runQuery(sql, [userIdToDelete]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        res.json({ message: 'Pengguna berhasil dihapus.' });
    } catch (err) {
        console.error(`[API ERROR] Gagal menghapus pengguna id ${userIdToDelete}:`, err);
        res.status(500).json({ message: 'Gagal menghapus pengguna.', error: err.message });
    }
});

module.exports = router;
