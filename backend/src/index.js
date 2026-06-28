const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const path = require("path");
const db = require("./config/db");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi CORS agar frontend React bisa mengakses backend & bertukar cookie session
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan file statis di folder public/uploads
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Konfigurasi Session Store di MySQL
const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 menit
    expiration: 86400000, // 24 jam
    createDatabaseTable: true, // Membuat tabel session secara otomatis
  },
  db.pool,
);

// Setup Sesi Express
app.use(
  session({
    key: "connect.sid",
    secret: process.env.SESSION_SECRET || "perjadin-super-secret-key-2026",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set ke true jika menggunakan HTTPS di produksi
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
      sameSite: "lax",
    },
  }),
);

// Impor rute
const authRoutes = require("./routes/authRoutes");
const pegawaiRoutes = require("./routes/pegawaiRoutes");
const userRoutes = require("./routes/userRoutes");
const pejabatRoutes = require("./routes/pejabatRoutes");
const anggaranRoutes = require("./routes/anggaranRoutes");
const laporanBpkApipRoutes = require("./routes/laporanBpkApipRoutes");
const sptRoutes = require("./routes/sptRoutes");
const sppdRoutes = require("./routes/sppdRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const standarBiayaRoutes = require("./routes/standarBiayaRoutes");
const laporanRoutes = require("./routes/laporanRoutes");
const panjarRoutes = require("./routes/panjarRoutes");
const pembayaranRoutes = require("./routes/pembayaranRoutes");
const pengeluaranRiilRoutes = require("./routes/pengeluaranRiilRoutes");
const searchRoutes = require("./routes/searchRoutes");

// Daftarkan rute API
app.use("/api/auth", authRoutes);
app.use("/api/pegawai", pegawaiRoutes);
app.use("/api/user", userRoutes);
app.use("/", userRoutes);

// Daftarkan rute API hasil ekstraksi (menggunakan mount path root '/' karena rute aslinya sudah lengkap dengan '/api/...')
app.use("/", pejabatRoutes);
app.use("/", anggaranRoutes);
app.use("/", laporanBpkApipRoutes);
app.use("/", sptRoutes);
app.use("/", sppdRoutes);
app.use("/", dashboardRoutes);
app.use("/", standarBiayaRoutes);
app.use("/", laporanRoutes);
app.use("/", panjarRoutes);
app.use("/", pembayaranRoutes);
app.use("/", pengeluaranRiilRoutes);
app.use("/", searchRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PERJADIN Backend API is running successfully.",
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`Server PERJADIN berjalan di http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`=================================================`);
});
