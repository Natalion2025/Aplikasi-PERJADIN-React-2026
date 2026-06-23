-- Skema Database Aplikasi PERJADIN untuk MySQL

-- 1. Tabel users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    nip VARCHAR(50) DEFAULT NULL,
    jabatan VARCHAR(255) DEFAULT NULL,
    foto_profil VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel pejabat
CREATE TABLE IF NOT EXISTS pejabat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(255) NOT NULL,
    nip VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel pegawai
CREATE TABLE IF NOT EXISTS pegawai (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_lengkap VARCHAR(255) NOT NULL,
    nip VARCHAR(50) NOT NULL UNIQUE,
    pangkat VARCHAR(100) DEFAULT NULL,
    golongan VARCHAR(50) DEFAULT NULL,
    jabatan VARCHAR(255) NOT NULL,
    bidang VARCHAR(100) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel anggaran
CREATE TABLE IF NOT EXISTS anggaran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bidang_urusan VARCHAR(255) DEFAULT NULL,
    program VARCHAR(255) DEFAULT NULL,
    kegiatan VARCHAR(255) DEFAULT NULL,
    sub_kegiatan VARCHAR(255) DEFAULT NULL,
    mata_anggaran_kode VARCHAR(100) NOT NULL,
    mata_anggaran_nama VARCHAR(255) NOT NULL,
    nilai_anggaran DECIMAL(15, 2) NOT NULL,
    pptk_id INT DEFAULT NULL,
    FOREIGN KEY (pptk_id) REFERENCES pegawai(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel spt
CREATE TABLE IF NOT EXISTS spt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomor_surat VARCHAR(100) NOT NULL UNIQUE,
    tanggal_surat DATE NOT NULL,
    dasar_surat TEXT NOT NULL,
    pejabat_pemberi_tugas_id INT NOT NULL,
    pegawai_ditugaskan INT DEFAULT NULL,
    peran VARCHAR(100) DEFAULT NULL,
    maksud_perjalanan TEXT NOT NULL,
    lokasi_tujuan VARCHAR(255) NOT NULL,
    tempat_berangkat VARCHAR(255) DEFAULT 'Nanga Pinoh',
    tanggal_berangkat DATE NOT NULL,
    tanggal_kembali DATE NOT NULL,
    lama_perjalanan INT NOT NULL,
    sumber_dana VARCHAR(100) DEFAULT NULL,
    kendaraan VARCHAR(100) DEFAULT NULL,
    anggaran_id INT NOT NULL,
    keterangan TEXT DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'aktif',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pejabat_pemberi_tugas_id) REFERENCES pejabat(id),
    FOREIGN KEY (anggaran_id) REFERENCES anggaran(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel spt_pegawai (tabel penghubung untuk pegawai pengikut)
CREATE TABLE IF NOT EXISTS spt_pegawai (
    spt_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    is_pengikut INT NOT NULL DEFAULT 0,
    urutan INT NOT NULL DEFAULT 0,
    PRIMARY KEY (spt_id, pegawai_id),
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel sppd
CREATE TABLE IF NOT EXISTS sppd (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spt_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    nomor_sppd VARCHAR(100) NOT NULL UNIQUE,
    tanggal_sppd DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel panjar
CREATE TABLE IF NOT EXISTS panjar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spt_id INT NOT NULL,
    tanggal_panjar DATE NOT NULL,
    tempat VARCHAR(255) NOT NULL,
    pelaksana_id INT NOT NULL,
    bendahara_id INT NOT NULL,
    pejabat_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pelaksana_id) REFERENCES pegawai(id),
    FOREIGN KEY (bendahara_id) REFERENCES pegawai(id),
    FOREIGN KEY (pejabat_id) REFERENCES pegawai(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel panjar_rincian
CREATE TABLE IF NOT EXISTS panjar_rincian (
    id INT AUTO_INCREMENT PRIMARY KEY,
    panjar_id INT NOT NULL,
    uraian VARCHAR(255) NOT NULL,
    jumlah DECIMAL(15, 2) NOT NULL,
    keterangan TEXT DEFAULT NULL,
    FOREIGN KEY (panjar_id) REFERENCES panjar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabel standar_biaya
CREATE TABLE IF NOT EXISTS standar_biaya (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipe_biaya VARCHAR(10) NOT NULL,
    uraian VARCHAR(255) DEFAULT NULL,
    provinsi VARCHAR(100) DEFAULT NULL,
    satuan VARCHAR(50) DEFAULT NULL,
    gol_a DECIMAL(15, 2) DEFAULT NULL,
    gol_b DECIMAL(15, 2) DEFAULT NULL,
    gol_c DECIMAL(15, 2) DEFAULT NULL,
    gol_d DECIMAL(15, 2) DEFAULT NULL,
    besaran DECIMAL(15, 2) DEFAULT NULL,
    biaya_kontribusi DECIMAL(15, 2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabel laporan_perjadin
CREATE TABLE IF NOT EXISTS laporan_perjadin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spt_id INT DEFAULT NULL,
    tanggal_laporan DATE NOT NULL,
    tempat_laporan VARCHAR(255) NOT NULL,
    judul VARCHAR(255) NOT NULL,
    identitas_pelapor VARCHAR(255) DEFAULT NULL,
    dasar_perjalanan TEXT DEFAULT NULL,
    tujuan_perjalanan TEXT DEFAULT NULL,
    lama_dan_tanggal_perjalanan VARCHAR(255) DEFAULT NULL,
    deskripsi_kronologis TEXT DEFAULT NULL,
    tempat_dikunjungi VARCHAR(255) DEFAULT NULL,
    hasil_dicapai TEXT DEFAULT NULL,
    transportasi_jenis VARCHAR(100) DEFAULT NULL,
    transportasi_perusahaan VARCHAR(100) DEFAULT NULL,
    transportasi_kode_boking VARCHAR(100) DEFAULT NULL,
    transportasi_nomor_penerbangan VARCHAR(100) DEFAULT NULL,
    transportasi_nomor_tiket VARCHAR(100) DEFAULT NULL,
    transportasi_tanggal_tiket DATE DEFAULT NULL,
    transportasi_terminal_berangkat VARCHAR(100) DEFAULT NULL,
    transportasi_terminal_tiba VARCHAR(100) DEFAULT NULL,
    transportasi_nominal DECIMAL(15, 2) DEFAULT NULL,
    akomodasi_jenis VARCHAR(100) DEFAULT NULL,
    akomodasi_nama VARCHAR(100) DEFAULT NULL,
    akomodasi_lokasi_hotel VARCHAR(255) DEFAULT NULL,
    akomodasi_tanggal_checkIn DATE DEFAULT NULL,
    akomodasi_tanggal_checkOut DATE DEFAULT NULL,
    akomodasi_harga_satuan DECIMAL(15, 2) DEFAULT NULL,
    akomodasi_malam INT DEFAULT NULL,
    akomodasi_nominal DECIMAL(15, 2) DEFAULT NULL,
    kontribusi_jenis VARCHAR(100) DEFAULT NULL,
    kontribusi_nominal DECIMAL(15, 2) DEFAULT NULL,
    lain_lain_uraian VARCHAR(255) DEFAULT NULL,
    lain_lain_tarif_satuan DECIMAL(15, 2) DEFAULT NULL,
    lain_lain_jumlah_hari INT DEFAULT NULL,
    lain_lain_nominal DECIMAL(15, 2) DEFAULT NULL,
    lain_lain_keterangan TEXT DEFAULT NULL,
    kesimpulan TEXT DEFAULT NULL,
    penandatangan_ids TEXT DEFAULT NULL,
    biaya_lain TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabel laporan_lampiran
CREATE TABLE IF NOT EXISTS laporan_lampiran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laporan_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    file_type VARCHAR(100) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tabel pembatalan_spt
CREATE TABLE IF NOT EXISTS pembatalan_spt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spt_id INT NOT NULL,
    pegawai_id INT DEFAULT NULL,
    tempat_pembatalan VARCHAR(255) NOT NULL,
    tanggal_pembatalan DATE NOT NULL,
    alasan TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tabel pembayaran
CREATE TABLE IF NOT EXISTS pembayaran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomor_bukti VARCHAR(100) NOT NULL UNIQUE,
    tanggal_bukti DATE NOT NULL,
    anggaran_id INT NOT NULL,
    spt_id INT NOT NULL,
    nama_penerima VARCHAR(255) NOT NULL,
    uraian_pembayaran TEXT NOT NULL,
    nominal_bayar DECIMAL(15, 2) NOT NULL,
    panjar_data TEXT DEFAULT NULL,
    pptk_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (anggaran_id) REFERENCES anggaran(id),
    FOREIGN KEY (spt_id) REFERENCES spt(id),
    FOREIGN KEY (pptk_id) REFERENCES pegawai(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Tabel pengeluaran_riil
CREATE TABLE IF NOT EXISTS pengeluaran_riil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spt_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    uraian VARCHAR(255) NOT NULL,
    jumlah DECIMAL(15, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spt_id) REFERENCES spt(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Tabel laporan_transportasi
CREATE TABLE IF NOT EXISTS laporan_transportasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laporan_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    jenis VARCHAR(100) DEFAULT NULL,
    perusahaan VARCHAR(100) DEFAULT NULL,
    kode_boking VARCHAR(100) DEFAULT NULL,
    nomor_penerbangan VARCHAR(100) DEFAULT NULL,
    nomor_tiket VARCHAR(100) DEFAULT NULL,
    tanggal_tiket DATE DEFAULT NULL,
    terminal_berangkat VARCHAR(100) DEFAULT NULL,
    terminal_tiba VARCHAR(100) DEFAULT NULL,
    nominal DECIMAL(15, 2) DEFAULT NULL,
    arah_perjalanan VARCHAR(100) DEFAULT NULL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Tabel laporan_akomodasi
CREATE TABLE IF NOT EXISTS laporan_akomodasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laporan_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    jenis VARCHAR(100) DEFAULT NULL,
    nama VARCHAR(100) DEFAULT NULL,
    lokasi_hotel VARCHAR(255) DEFAULT NULL,
    tanggal_checkIn DATE DEFAULT NULL,
    tanggal_checkOut DATE DEFAULT NULL,
    harga_satuan DECIMAL(15, 2) DEFAULT NULL,
    malam INT DEFAULT NULL,
    nominal DECIMAL(15, 2) DEFAULT NULL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Tabel laporan_kontribusi
CREATE TABLE IF NOT EXISTS laporan_kontribusi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laporan_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    jenis VARCHAR(100) DEFAULT NULL,
    nominal DECIMAL(15, 2) DEFAULT NULL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Tabel laporan_lain_lain
CREATE TABLE IF NOT EXISTS laporan_lain_lain (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laporan_id INT NOT NULL,
    pegawai_id INT NOT NULL,
    uraian VARCHAR(255) DEFAULT NULL,
    tarif_satuan DECIMAL(15, 2) DEFAULT NULL,
    jumlah_hari INT DEFAULT NULL,
    nominal DECIMAL(15, 2) DEFAULT NULL,
    keterangan TEXT DEFAULT NULL,
    FOREIGN KEY (laporan_id) REFERENCES laporan_perjadin(id) ON DELETE CASCADE,
    FOREIGN KEY (pegawai_id) REFERENCES pegawai(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
