const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Buat connection pool ke MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_perjadin",
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
});

// Wrapper kompatibilitas SQLite untuk meminimalkan perubahan kode route legacy
const db = {
  // pool koneksi mentah untuk kebutuhan eksternal (seperti session store)
  pool: pool,

  // db.get(sql, params, callback) -> Mengembalikan baris pertama hasil query
  get: (sql, params, callback) => {
    let finalParams = [];
    let finalCb = callback;

    if (typeof params === "function") {
      finalCb = params;
    } else if (params) {
      finalParams = params;
    }

    // Ganti kueri PRAGMA (SQLite) dengan kueri kosong agar tidak error di MySQL
    if (sql.trim().toUpperCase().startsWith("PRAGMA")) {
      if (finalCb) finalCb(null, []);
      return;
    }

    pool
      .query(sql, finalParams)
      .then(([rows]) => {
        if (finalCb) {
          finalCb(null, rows.length > 0 ? rows[0] : null);
        }
      })
      .catch((err) => {
        console.error("[DB ERROR - db.get]:", err.message, "SQL:", sql);
        if (finalCb) finalCb(err);
      });
  },

  // db.all(sql, params, callback) -> Mengembalikan semua baris hasil query
  all: (sql, params, callback) => {
    let finalParams = [];
    let finalCb = callback;

    if (typeof params === "function") {
      finalCb = params;
    } else if (params) {
      finalParams = params;
    }

    if (sql.trim().toUpperCase().startsWith("PRAGMA")) {
      if (finalCb) finalCb(null, []);
      return;
    }

    pool
      .query(sql, finalParams)
      .then(([rows]) => {
        if (finalCb) {
          finalCb(null, rows);
        }
      })
      .catch((err) => {
        console.error("[DB ERROR - db.all]:", err.message, "SQL:", sql);
        if (finalCb) finalCb(err);
      });
  },

  // db.run(sql, params, callback) -> Menjalankan kueri non-SELECT (INSERT, UPDATE, DELETE)
  // Callback dipanggil dengan context `this` berisi `lastID` dan `changes`
  run: (sql, params, callback) => {
    let finalParams = [];
    let finalCb = callback;

    if (typeof params === "function") {
      finalCb = params;
    } else if (params) {
      finalParams = params;
    }

    if (sql.trim().toUpperCase().startsWith("PRAGMA")) {
      if (finalCb) finalCb(null);
      return;
    }

    // MySQL menggunakan START TRANSACTION sebagai ganti BEGIN TRANSACTION (meskipun BEGIN juga didukung)
    let formattedSql = sql;
    if (
      sql.trim().toUpperCase() === "BEGIN TRANSACTION" ||
      sql.trim().toUpperCase() === "BEGIN"
    ) {
      formattedSql = "START TRANSACTION";
    }

    pool
      .query(formattedSql, finalParams)
      .then(([result]) => {
        if (finalCb) {
          const context = {
            lastID: result ? result.insertId : null,
            changes: result ? result.affectedRows : 0,
          };
          finalCb.call(context, null);
        }
      })
      .catch((err) => {
        console.error("[DB ERROR - db.run]:", err.message, "SQL:", sql);
        if (finalCb) finalCb(err);
      });
  },

  // Dukungan kueri Promise langsung
  query: async (sql, params) => {
    const [results] = await pool.query(sql, params);
    return results;
  },
};

module.exports = db;
