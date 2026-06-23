const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '3306');
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'db_perjadin';

async function setup() {
    console.log('--- Memulai Setup Database MySQL Aplikasi PERJADIN ---');
    console.log(`Koneksi: Host=${host}:${port}, User=${user}`);

    let connection;
    try {
        // 1. Koneksi awal ke MySQL server (tanpa database)
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password
        });

        // 2. Buat database jika belum ada
        console.log(`Mencoba membuat database '${database}'...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`Database '${database}' siap.`);
        await connection.end();

        // 3. Koneksi baru menggunakan database yang telah dibuat
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
            multipleStatements: true // Diperlukan untuk mengeksekusi file SQL berisi banyak kueri sekaligus
        });

        // 4. Baca dan eksekusi skema SQL
        const schemaPath = path.join(__dirname, 'schema.sql');
        console.log(`Membaca skema SQL dari: ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Mengeksekusi kueri pembuatan tabel...');
        await connection.query(schemaSql);
        console.log('Semua tabel berhasil dibuat/diperiksa.');

        // 5. Cek & Tambah Super Admin default jika belum ada
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM users WHERE username = 'superadmin'");
        if (rows[0].count === 0) {
            console.log("Membuat user default 'superadmin'...");
            const hashedPassword = bcrypt.hashSync('superadminpass', 10);
            await connection.query(
                "INSERT INTO users (name, username, password, role, jabatan) VALUES (?, ?, ?, ?, ?)",
                ['Super Admin', 'superadmin', hashedPassword, 'superadmin', 'Administrator Sistem']
            );
            console.log("Default user 'superadmin' berhasil dibuat (Password: 'superadminpass').");
        } else {
            console.log("User 'superadmin' sudah terdaftar.");
        }

        console.log('--- Setup Database Selesai dengan Sukses ---');
    } catch (err) {
        console.error('--- SETUP DATABASE GAGAL ---');
        console.error(err);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setup();
