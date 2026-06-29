import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Weight } from 'lucide-react';
import logoMelawi from '../../assets/logo_kab_Melawi.png';

// Helper: Format tanggal Indonesia
const formatDate = (dateString, defVal = '-') => {
  if (!dateString) return defVal;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

// Helper: Format rupiah sederhana
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(parseFloat(amount))) return '0';
  return new Intl.NumberFormat('id-ID').format(amount);
};

// Helper: Ubah angka menjadi teks terbilang
const terbilang = (angka) => {
  if (angka === null || angka === undefined) return '';
  angka = Number(angka);
  if (isNaN(angka)) return '';

  const bilangan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return terbilang(angka - 10) + ' belas';
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' puluh ' + terbilang(angka % 10);
  if (angka < 200) return 'seratus ' + terbilang(angka - 100);
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' ratus ' + terbilang(angka % 100);
  if (angka < 2000) return 'seribu ' + terbilang(angka - 1000);
  if (angka < 1000000)
    return terbilang(Math.floor(angka / 1000)) + ' ribu ' + terbilang(angka % 1000);
  if (angka < 1000000000)
    return terbilang(Math.floor(angka / 1000000)) + ' juta ' + terbilang(angka % 1000000);
  if (angka < 1000000000000)
    return terbilang(Math.floor(angka / 1000000000)) + ' milyar ' + terbilang(angka % 1000000000);
  if (angka < 1000000000000000)
    return (
      terbilang(Math.floor(angka / 1000000000000)) + ' triliun ' + terbilang(angka % 1000000000000)
    );
  return 'Angka terlalu besar';
};

// --- STYLING BERSAMA UNTUK SURAT RESMI (KOP SURAT) ---
const KopSurat = () => (
  <div
    className="flex items-center text-center border-b-[4px] border-double border-black pb-3.5 mb-5 relative text-black"
    style={{ fontFamily: 'Arial, sans-serif' }}
  >
    <img
      src={logoMelawi}
      alt="Logo Pemkab Melawi"
      className="absolute left-1 top-0 w-24 h-24 object-contain"
      onError={(e) => {
        e.target.src =
          'https://upload.wikimedia.org/wikipedia/commons/b/b3/Melawi_Regency_Logo.png';
      }}
    />
    <div className="flex-1 pl-20 pr-4 text-center">
      <h2 className="text-base font-bold tracking-wide uppercase m-0 leading-tight">
        Pemerintah Kabupaten Melawi
      </h2>
      <h1 className="text-xl font-bold uppercase tracking-wider m-0 mt-0.5 leading-tight">
        Dinas Komunikasi dan Informatika
      </h1>
      <p className="text-xs m-0 mt-1 leading-normal">
        Jl. Poros Provinsi Nanga Pinoh – Kota Baru KM. 7,
      </p>
      <p className="text-xs m-0 leading-normal">Nanga Pinoh, Kabupaten Melawi, Kode Pos 79672,</p>
      <p className="text-xs m-0 font-medium leading-normal text-slate-700">
        email: dinas_kominfo@melawikab.go.id, website: www.melawikab.go.id
      </p>
    </div>
  </div>
);

// --- CSS Kertas F4/A4 Standar ---
const pageStyle = `
  body {
    background-color: #fff;
    color: #000;
    font-family: 'Arial', Times, serif;
    font-size: 12pt;
  }
  .print-page {
    width: 21cm;
    min-height: 29.7cm;
    padding: 1.5cm;
    padding-top: 0.8cm;
    margin: 0 auto;
    background: white;
    color: black;
  }
  @media print {
    body {
      background-color: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-page {
      padding: 0;
      width: auto;
      min-height: auto;
      border: none;
      page-break-after: always;
      margin-top: -0.8cm;
    }
    .print-page:last-child {
      page-break-after: avoid;
    }
    .no-print {
      display: none !important;
    }
    .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl, .shadow-inner {
      box-shadow: none !important;
    }
  }
`;

// ==========================================
// 1. CetakSPT
// ==========================================
export const CetakSPT = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sptRes, pegawaiRes, pejabatRes] = await Promise.all([
          axios.get(`/api/spt/${id}`),
          axios.get('/api/pegawai'),
          axios.get('/api/pejabat'),
        ]);

        const spt = sptRes.data;
        const allPegawai = pegawaiRes.data;
        const allPejabat = pejabatRes.data;

        // Cari pelaksana
        const pelaksanaList = (spt.pegawai || [])
          .map((pData) => allPegawai.find((p) => p.id === pData.pegawai_id))
          .filter(Boolean);

        // Cari pemberi tugas
        const semuaPemberi = [
          ...allPejabat,
          ...allPegawai.map((p) => ({ ...p, nama: p.nama_lengkap })),
        ];
        const pemberiTugas = semuaPemberi.find((p) => p.id === spt.pejabat_pemberi_tugas_id);

        setData({ spt, pelaksanaList, pemberiTugas });

        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data Surat Perintah Tugas.');
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Surat Perintah Tugas...
      </div>
    );

  const { spt, pelaksanaList, pemberiTugas } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak SPT
        </button>
      </div>

      <div className="print-page border border-slate-200  rounded-xl">
        <KopSurat />

        <div className="text-center mt-3 mb-5">
          <h3 className="text-base font-bold underline tracking-wider m-0">SURAT PERINTAH TUGAS</h3>
          <p className="text-sm m-0 mt-0.5">Nomor: {spt.nomor_surat}</p>
        </div>

        <div className="space-y-4 text-sm leading-relaxed" style={{ fontSize: '11pt' }}>
          {/* Dasar */}
          <div className="flex items-start">
            <div className="w-[12%] font-bold">Dasar</div>
            <div className="w-[3%]">:</div>
            <div className="w-[85%] text-justify">{spt.dasar_surat || '-'}</div>
          </div>

          <h4
            className="text-center font-bold tracking-wide uppercase my-3.5"
            style={{ fontSize: '11.5pt' }}
          >
            MEMERINTAHKAN:
          </h4>

          {/* Kepada */}
          <div className="flex items-start">
            <div className="w-[12%] font-bold">Kepada</div>
            <div className="w-[3%]">:</div>
            <div className="w-[85%] space-y-4">
              {pelaksanaList.map((p, idx) => (
                <div key={p.id || idx} className="flex flex-col">
                  <div className="flex">
                    <span className="w-6">{idx + 1}.</span>
                    <div className="grid grid-cols-10 gap-x-2 w-full">
                      <span className="col-span-3">Nama</span>
                      <span className="col-span-1">:</span>
                      <span className="col-span-6 font-bold">{p.nama_lengkap}</span>

                      <span className="col-span-3">NIP</span>
                      <span className="col-span-1">:</span>
                      <span className="col-span-6 font-mono">{p.nip}</span>

                      <span className="col-span-3">Pangkat/Gol.</span>
                      <span className="col-span-1">:</span>
                      <span className="col-span-6">
                        {p.pangkat} / {p.golongan}
                      </span>

                      <span className="col-span-3">Jabatan</span>
                      <span className="col-span-1">:</span>
                      <span className="col-span-6">{p.jabatan}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Untuk */}
          <div className="flex items-start pt-2">
            <div className="w-[12%] font-bold">Untuk</div>
            <div className="w-[3%]">:</div>
            <div className="w-[85%] text-justify leading-relaxed">
              {spt.maksud_perjalanan} ke {spt.lokasi_tujuan} selama {spt.lama_perjalanan} hari, dari
              tanggal {formatDate(spt.tanggal_berangkat)} s/d {formatDate(spt.tanggal_kembali)}.
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="mt-14 ml-auto w-[45%] text-sm leading-normal flex flex-col items-start pl-6">
          <p className="m-0">Ditetapkan di Nanga Pinoh</p>
          <p className="m-0">Pada tanggal {formatDate(spt.tanggal_surat)}</p>
          <p className="font-bold uppercase mt-2.5 mb-16">
            {pemberiTugas?.jabatan || 'KEPALA DINAS'},
          </p>
          <p className="font-bold underline uppercase m-0 text-nowrap">
            {pemberiTugas?.nama || '.....................................'}
          </p>
          <p className="m-0 font-mono text-xs">
            {pemberiTugas?.nip ? `NIP. ${pemberiTugas.nip}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. CetakSPPD
// ==========================================
export const CetakSPPD = () => {
  const { spt_id, pegawai_id, sppd_id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        let endpoint = '';
        if (sppd_id) {
          endpoint = `/api/sppd/by-spt/${sppd_id}?id_type=sppd`;
        } else {
          endpoint = `/api/sppd/by-spt/${spt_id}?id_type=spt`;
        }
        const response = await axios.get(endpoint);
        setData(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat dokumen SPPD.');
      }
    };
    loadData();
  }, [spt_id, sppd_id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Surat Perjalanan Dinas (SPPD)...
      </div>
    );

  const { sppdList, spt, pengikut, anggaran, penggunaAnggaran, penandatanganSppd } = data;

  // Tentukan SPPD mana saja yang akan dicetak
  let sppdsToRender = [];
  if (sppd_id) {
    const sppd = sppdList.find((s) => s.id == sppd_id);
    if (sppd) sppdsToRender = [sppd];
  } else if (pegawai_id) {
    const sppd = sppdList.find((s) => s.pegawai_id == pegawai_id);
    if (sppd) sppdsToRender = [sppd];
  } else {
    sppdsToRender = sppdList;
  }

  if (sppdsToRender.length === 0) {
    return <div className="p-8 text-center text-red-500 font-bold">Data SPPD tidak ditemukan.</div>;
  }

  const getTingkatBiaya = (peg) => {
    const jab = (peg.jabatan || '').toLowerCase();
    const gol = peg.golongan || '';
    if (jab === 'kepala dinas' || gol === 'IV/c' || gol === 'IV/d' || gol === 'IV/e')
      return 'Golongan B';
    if (jab === 'sekretaris' || jab.startsWith('kepala bidang') || jab.startsWith('kepala bagian'))
      return 'Golongan C';
    return 'Golongan D';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          {sppdsToRender.length > 1 ? 'Cetak SPPD Kolektif' : 'Cetak SPPD'}
        </button>
      </div>

      {sppdsToRender.map((sppd, idx) => {
        const pegawai = sppd.pegawai || { nama_lengkap: 'Data Pegawai Tidak Ditemukan' };
        return (
          <div
            key={sppd.id || idx}
            className="print-page border border-slate-200  rounded-xl mb-2 last:mb-0"
          >
            <KopSurat />

            <div className="flex justify-end text-xs leading-normal pr-6">
              <div className="grid grid-cols-2 gap-x-2">
                <span>Lembar ke</span>
                <span>: 1 (satu)</span>
                <span>Kode No.</span>
                <span>: 090</span>
                <span>Nomor</span>
                <span>: {sppd.nomor_sppd || 'N/A'}</span>
              </div>
            </div>

            <div className="text-center my-5">
              <h3 className="text-base font-bold tracking-wide m-0">
                SURAT PERJALANAN DINAS (SPD)
              </h3>
              <p className="text-[10.5pt] m-0 mt-0.5">
                (Berdasarkan Surat Perintah Tugas Nomor: {spt.nomor_surat || ''})
              </p>
            </div>

            {/* Tabel SPPD */}
            <table
              className="w-full text-xs text-black border border-black border-collapse"
              style={{ fontFamily: 'Arial', fontSize: '9.5pt' }}
            >
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black w-8 text-center">1.</td>
                  <td className="p-2 border-r border-black w-[45%] font-medium">
                    Pengguna Anggaran
                  </td>
                  <td className="p-2 font-semibold" colSpan={2}>
                    {penggunaAnggaran ? penggunaAnggaran.nama_lengkap : 'Kepala Dinas'}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">2.</td>
                  <td className="p-2 border-r border-black font-medium">
                    Nama/NIP Pegawai yang diperintahkan
                  </td>
                  <td className="p-2" colSpan={2}>
                    <div className="font-bold">{pegawai.nama_lengkap}</div>
                    <div className="font-mono text-xs">{pegawai.nip}</div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">3.</td>
                  <td className="p-2 border-r border-black font-medium space-y-1">
                    <div>a. Pangkat dan Golongan</div>
                    <div>b. Jabatan / Instansi</div>
                    <div>c. Tingkat Biaya Perjalanan Dinas</div>
                  </td>
                  <td className="p-2 space-y-1" colSpan={2}>
                    <div>
                      a. {pegawai.pangkat} ({pegawai.golongan})
                    </div>
                    <div>b. {pegawai.jabatan}</div>
                    <div>c. {getTingkatBiaya(pegawai)}</div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">4.</td>
                  <td className="p-2 border-r border-black font-medium">Maksud Perjalanan Dinas</td>
                  <td className="p-2" colSpan={2}>
                    {spt.maksud_perjalanan}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">5.</td>
                  <td className="p-2 border-r border-black font-medium">
                    Alat angkutan yang dipergunakan
                  </td>
                  <td className="p-2" colSpan={2}>
                    {spt.kendaraan || 'Kendaraan Dinas / Umum'}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">6.</td>
                  <td className="p-2 border-r border-black font-medium space-y-1">
                    <div>a. Tempat berangkat</div>
                    <div>b. Tempat tujuan</div>
                  </td>
                  <td className="p-2 space-y-1" colSpan={2}>
                    <div>a. {spt.tempat_berangkat || 'Nanga Pinoh'}</div>
                    <div>b. {spt.lokasi_tujuan}</div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">7.</td>
                  <td className="p-2 border-r border-black font-medium space-y-1">
                    <div>a. Lama Perjalanan Dinas</div>
                    <div>b. Tanggal berangkat</div>
                    <div>c. Tanggal harus kembali</div>
                  </td>
                  <td className="p-2 space-y-1" colSpan={2}>
                    <div>a. {spt.lama_perjalanan} hari</div>
                    <div>b. {formatDate(spt.tanggal_berangkat)}</div>
                    <div>c. {formatDate(spt.tanggal_kembali)}</div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center" rowSpan={2}>
                    8.
                  </td>
                  <td className="p-2 border-r border-black font-medium">Pengikut: Nama</td>
                  <td className="p-2 border-r border-black font-medium">NIP / Jabatan</td>
                  <td className="p-2 font-medium">Keterangan</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black min-h-[40px]">
                    {pengikut && pengikut.length > 0 ? (
                      pengikut.map((p, index) => (
                        <div key={p.id || index}>
                          {index + 1}. {p.nama_lengkap}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-2 border-r border-black">
                    {pengikut && pengikut.length > 0 ? (
                      pengikut.map((p, index) => (
                        <div key={p.id || index} className="font-mono text-xs">
                          {p.nip}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-2"></td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">9.</td>
                  <td className="p-2 border-r border-black font-medium space-y-1">
                    <div>Pembebanan Anggaran:</div>
                    <div className="pl-4">a. Instansi</div>
                    <div className="pl-4">b. Mata Anggaran</div>
                  </td>
                  <td className="p-2 space-y-1" colSpan={2}>
                    <div>
                      <br />
                    </div>
                    <div>a. Dinas Komunikasi dan Informatika</div>
                    <div className="font-mono">
                      b. {anggaran ? anggaran.mata_anggaran_kode : ''}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-black text-center">10.</td>
                  <td className="p-2 border-r border-black font-medium">Keterangan lain-lain</td>
                  <td className="p-2" colSpan={2}>
                    {spt.keterangan || '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tanda Tangan */}
            <div className="flex justify-between items-start mt-6 text-xs leading-normal pr-6">
              <div className="w-[45%]"></div>
              <div className="w-[50%] flex flex-col items-start pl-16">
                <div className="grid grid-cols-2 gap-x-1.5 mb-3.5">
                  <span>Dikeluarkan di</span>
                  <span>: Nanga Pinoh</span>
                  <span>Pada tanggal</span>
                  <span>: {formatDate(sppd.tanggal_sppd)}</span>
                </div>
                <p className="font-bold uppercase m-0 leading-normal">
                  {penandatanganSppd?.jabatan || 'KEPALA DINAS'}
                </p>
                <p className="font-bold uppercase m-0 pb-12 leading-normal">
                  KOMUNIKASI DAN INFORMATIKA KABUPATEN MELAWI
                </p>
                <p className="font-bold underline uppercase m-0 text-nowrap">
                  {penandatanganSppd?.nama || '.....................................'}
                </p>
                <p className="m-0 font-mono">
                  {penandatanganSppd?.nip ? `NIP. ${penandatanganSppd.nip}` : ''}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// 3. CetakVisum
// ==========================================
export const CetakVisum = () => {
  const { spt_id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/api/cetak/visum/${spt_id}`);
        setData(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data visum SPPD.');
      }
    };
    loadData();
  }, [spt_id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Lembar Visum SPPD...
      </div>
    );

  const visumStyle = `
    .visum-section {
      display: flex;
      border-bottom: 1px solid black;
      min-height: 5.5cm;
    }
    .visum-num {
      width: 4%;
      text-align: center;
      padding: 10px 0;
      font-weight: bold;
    }
    .visum-half {
      width: 48%;
      border-right: 1px solid black;
      padding: 10px;
      font-size: 9pt;
      line-height: 1.4;
    }
    .visum-half:last-child {
      border-right: none;
    }
    .visum-sig {
      margin-top: 25px;
      text-align: center;
      width: 80%;
      margin-left: 20%;
    }
    .visum-sig-name {
      margin-top: 50px;
      font-weight: bold;
      text-decoration: underline;
    }
  `;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle + visumStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak Visum
        </button>
      </div>

      <div
        className="print-page border border-slate-200  rounded-xl"
        style={{ padding: '0.8cm 0.8cm' }}
      >
        <div className="border border-black">
          {/* Section I */}
          <div className="visum-section">
            <div className="visum-num">I.</div>
            <div className="visum-half"></div>
            <div className="visum-half">
              <div className="grid grid-cols-5 gap-y-0.5">
                <span className="col-span-2">Berangkat dari</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2 font-bold">
                  {data.tempat_berangkat || 'Nanga Pinoh'}
                </span>

                <span className="col-span-2 text-slate-500">(Kedudukan)</span>
                <span className="col-span-1"></span>
                <span className="col-span-2"></span>

                <span className="col-span-2">Ke</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2 font-bold">{data.lokasi_tujuan}</span>

                <span className="col-span-2">Pada tanggal</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">{formatDate(data.tanggal_berangkat)}</span>
              </div>
              <div className="visum-sig text-[8.5pt]">
                <p className="font-bold m-0 uppercase">{data.kadis_jabatan || 'KEPALA DINAS'}</p>
                <p className="font-bold m-0 uppercase leading-normal">
                  KOMUNIKASI DAN INFORMATIKA KABUPATEN MELAWI
                </p>
                <p className="visum-sig-name uppercase">{data.kadis_nama}</p>
                <p className="m-0 font-mono">NIP. {data.kadis_nip}</p>
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="visum-section">
            <div className="visum-num">II.</div>
            <div className="visum-half">
              <div className="grid grid-cols-5 gap-y-1">
                <span className="col-span-2">Tiba di</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Pada tanggal</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Kepala</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
              </div>
              <div className="visum-sig text-[8.5pt]">
                <p className="visum-sig-name font-normal">
                  (......................................................)
                </p>
                <p className="m-0 font-mono">NIP. ..........................................</p>
              </div>
            </div>
            <div className="visum-half">
              <div className="grid grid-cols-5 gap-y-1">
                <span className="col-span-2">Berangkat dari</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Ke</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Pada tanggal</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Kepala</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
              </div>
              <div className="visum-sig text-[8.5pt]">
                <p className="visum-sig-name font-normal">
                  (......................................................)
                </p>
                <p className="m-0 font-mono">NIP. ..........................................</p>
              </div>
            </div>
          </div>

          {/* Section III */}
          <div className="visum-section">
            <div className="visum-num">III.</div>
            <div className="visum-half">
              <div className="grid grid-cols-5 gap-y-1">
                <span className="col-span-2">Tiba di</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Pada tanggal</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Kepala</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
              </div>
              <div className="visum-sig text-[8.5pt]">
                <p className="visum-sig-name font-normal">
                  (......................................................)
                </p>
                <p className="m-0 font-mono">NIP. ..........................................</p>
              </div>
            </div>
            <div className="visum-half">
              <div className="grid grid-cols-5 gap-y-1">
                <span className="col-span-2">Berangkat dari</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Ke</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Pada tanggal</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
                <span className="col-span-2">Kepala</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">....................................</span>
              </div>
              <div className="visum-sig text-[8.5pt]">
                <p className="visum-sig-name font-normal">
                  (......................................................)
                </p>
                <p className="m-0 font-mono">NIP. ..........................................</p>
              </div>
            </div>
          </div>

          {/* Section IV */}
          <div className="visum-section" style={{ minHeight: '4.5cm' }}>
            <div className="visum-num">IV.</div>
            <div className="visum-half">
              <div className="grid grid-cols-5 gap-y-1">
                <span className="col-span-2">Tiba di</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">{data.tempat_berangkat || 'Nanga Pinoh'}</span>
                <span className="col-span-2">Pada tanggal</span>
                <span className="col-span-1">:</span>
                <span className="col-span-2">{formatDate(data.tanggal_kembali)}</span>
              </div>
              <div className="visum-sig text-[8.5pt] mt-6">
                <p className="font-bold m-0 uppercase">{data.kadis_jabatan || 'KEPALA DINAS'}</p>
                <p className="font-bold m-0 uppercase leading-normal">
                  KOMUNIKASI DAN INFORMATIKA KABUPATEN MELAWI
                </p>
                <p className="visum-sig-name uppercase mt-8">{data.kadis_nama}</p>
                <p className="m-0 font-mono">NIP. {data.kadis_nip}</p>
              </div>
            </div>
            <div className="visum-half flex flex-col justify-between">
              <p className="m-0 p-2 text-justify text-[8.5pt]">
                Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan
                keadaannya di riilkan dalam lampiran yang bersangkutan.
              </p>
              <div className="visum-sig text-[8.5pt] mb-4">
                <p className="font-bold m-0 uppercase">{data.kadis_jabatan || 'KEPALA DINAS'}</p>
                <p className="visum-sig-name uppercase mt-8">{data.kadis_nama}</p>
                <p className="m-0 font-mono">NIP. {data.kadis_nip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. CetakPanjar
// ==========================================
export const CetakPanjar = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/api/cetak/panjar/${id}`);
        setData(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data Panjar (Uang Muka).');
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">Memuat Kuitansi Panjar...</div>
    );

  const totalBiaya = (data.rincian || []).reduce((sum, item) => sum + item.jumlah, 0);
  const terbilangStr =
    terbilang(totalBiaya)
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(.)/, (c) => c.toUpperCase()) + ' rupiah';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak Panjar
        </button>
      </div>

      <div className="print-page border border-slate-200 shadow-lg rounded-xl">
        <KopSurat />

        <h3 className="text-center font-bold text-sm tracking-wide uppercase my-6">
          Rincian Panjar Biaya Perjalanan Dinas
        </h3>

        <div className="text-xs space-y-1 mb-5">
          <div className="grid grid-cols-10 gap-x-2">
            <span className="col-span-2 font-medium">ST Nomor</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{data.nomor_surat}</span>

            <span className="col-span-2 font-medium">SPD Nomor</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{data.nomor_sppd || 'Belum Dibuat'}</span>
          </div>
        </div>

        {/* Tabel Rincian */}
        <table className="w-full text-xs text-black border border-black border-collapse mb-5 font-sans">
          <thead>
            <tr className="bg-slate-50 border-b border-black">
              <th className="p-2 border-r border-black w-10 text-center font-normal">No.</th>
              <th className="p-2 border-r border-black text-left font-normal">
                Uraian Pengeluaran
              </th>
              <th className="p-2 border-r border-black w-40 text-right font-normal">Jumlah (Rp)</th>
              <th className="p-2 text-left font-normal">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {(data.rincian || []).map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                <td className="p-2 border-r border-black">{item.uraian}</td>
                <td className="p-2 border-r border-black text-right">
                  {formatCurrency(item.jumlah)}
                </td>
                <td className="p-2">{item.keterangan || ''}</td>
              </tr>
            ))}
            <tr className="border-b border-black font-semibold bg-slate-50">
              <td className="p-2 border-r border-black text-center" colSpan={2}>
                Jumlah Total:
              </td>
              <td className="p-2 border-r border-black text-right font-bold">
                {formatCurrency(totalBiaya)}
              </td>
              <td className="p-2"></td>
            </tr>
            <tr>
              <td className="p-2 text-left text-slate-800 font-bold italic" colSpan={4}>
                Terbilang:{' '}
                <span className="font-bold">
                  {terbilang(totalBiaya)
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/^(.)/, (c) => c.toUpperCase()) + ' rupiah'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Info Penyerahan */}
        <div className="flex justify-between items-start text-xs leading-normal mt-6 border-b border-dashed border-slate-300 pb-8">
          <div>
            <p className="m-0">Telah dibayar sejumlah:</p>
            <p className="font-bold text-sm mt-1">Rp. {formatCurrency(totalBiaya)}</p>
          </div>
          <div className="text-right">
            <p className="m-0">Nanga Pinoh, {formatDate(data.tanggal_panjar)}</p>
            <p className="m-0">Telah menerima uang sebesar:</p>
            <p className="font-bold text-sm mt-1">Rp. {formatCurrency(totalBiaya)}</p>
          </div>
        </div>

        {/* Tandatangan Bawah */}
        <div
          className="grid grid-cols-2 gap-8 text-xs leading-normal mt-8 text-center"
          style={{ fontFamily: 'Arial' }}
        >
          <div>
            <p className="m-0">Bendahara Pengeluaran,</p>
            <div className="h-16"></div>
            <p className="font-bold underline m-0">{data.bendahara_nama}</p>
            <p className="m-0 font-mono text-[10px]">NIP. {data.bendahara_nip}</p>
          </div>
          <div>
            <p className="m-0">Yang Menerima,</p>
            <div className="h-16"></div>
            <p className="font-bold underline m-0">{data.pelaksana_nama}</p>
            <p className="m-0 font-mono text-[10px]">NIP. {data.pelaksana_nip}</p>
          </div>

          <div className="col-span-2 flex flex-col items-center mt-6">
            <p className="m-0">Mengetahui,</p>
            <p className="font-bold m-0">Pejabat Berwenang Pemberi Tugas</p>
            <div className="h-16"></div>
            <p className="font-bold underline m-0">{data.pejabat_nama}</p>
            <p className="m-0 font-mono text-[10px]">NIP. {data.pejabat_nip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. CetakPembayaran (Kuitansi Pembayaran)
// ==========================================
export const CetakPembayaran = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/api/cetak/pembayaran/${id}`);
        setData(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat kwitansi pembayaran.');
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Kuitansi Pembayaran...
      </div>
    );

  // PERBAIKAN: Hapus 'terbilang' dari destrukturisasi data, karena kita akan menggunakan fungsi global.
  const { pembayaran, anggaran, spt, rincian, pejabat } = data;

  let grandTotalBiaya = 0;
  let grandTotalPanjar = 0;
  let grandTotalDibayar = 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak
        </button>
      </div>

      <div
        className="print-page border border-slate-200 shadow-lg rounded-xl"
        style={{ padding: '1cm 1cm' }}
      >
        <h3 className="text-center font-bold text-sm tracking-wide uppercase m-0 border-b border-black pb-2.5">
          TANDA BUKTI PEMBAYARAN
        </h3>

        {/* Header Kuitansi BKU */}
        <div className="flex justify-between items-start text-xs mt-3 leading-normal">
          <div className="w-[55%]"></div>
          <div className="w-[45%] grid grid-cols-2 gap-x-2">
            <span>No. BKU</span>
            <span>: .............................</span>
            <span>Tanggal BKU</span>
            <span>: .............................</span>
            <span className="font-semibold">No. Bukti</span>
            <span className="font-semibold">: {pembayaran.nomor_bukti}</span>
            <span>Tanggal Bukti</span>
            <span>: {formatDate(pembayaran.tanggal_bukti)}</span>
          </div>
        </div>

        {/* Info Anggaran */}
        <div className="text-xs mt-3 leading-normal border border-slate-200 p-3 rounded-xl space-y-0.5">
          <div className="grid grid-cols-10 gap-x-2">
            <span className="col-span-2 font-medium">Program</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{anggaran.program}</span>
            <span className="col-span-2 font-medium">Kegiatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{anggaran.kegiatan}</span>
            <span className="col-span-2 font-medium">Sub Kegiatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{anggaran.sub_kegiatan}</span>
            <span className="col-span-2 font-medium">Kode Rekening</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-mono font-bold">{anggaran.mata_anggaran_kode}</span>
            <span className="col-span-2 font-medium">Nama Rekening</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{anggaran.mata_anggaran_nama}</span>
          </div>
        </div>

        {/* Tanda Terima */}
        <div className="text-xs leading-relaxed mt-4 space-y-1">
          <p className="m-0 text-justify">
            Sudah terima dari Bendahara Pengeluaran Dinas Komunikasi dan Informatika Kab. Melawi
            uang sebesar{' '}
            <strong className="text-sm">Rp {formatCurrency(pembayaran.nominal_bayar)}</strong>
          </p>
          {/* PERBAIKAN: Panggil fungsi terbilang dengan nilai yang benar */}
          <p className="m-0 font-bold italic">
            ({terbilang(pembayaran.nominal_bayar).replace(/\s+/g, ' ').trim()})
          </p>
          <p className="m-0 text-justify pt-1">
            Untuk {pembayaran.uraian_pembayaran} kepada {pembayaran.nama_penerima.split('\n')[0]}{' '}
            dan kawan-kawan, sesuai dengan Surat Tugas Nomor: {spt.nomor_surat} tanggal{' '}
            {formatDate(spt.tanggal_surat)}, dengan rincian di bawah ini:
          </p>
        </div>

        {/* Tabel Rincian */}
        <table
          className="w-full text-[9pt] text-black border border-black border-collapse mt-4"
          style={{ fontFamily: 'Arial' }}
        >
          <thead>
            <tr className="bg-slate-50 border-b border-black">
              <th className="p-1.5 border-r border-black text-center w-6" rowSpan={2}>
                No
              </th>
              <th className="p-1.5 border-r border-black text-left w-36" rowSpan={2}>
                Nama Pegawai
              </th>
              <th className="p-1.5 border-r border-black text-left" rowSpan={2}>
                Uraian
              </th>
              <th className="p-1.5 border-r border-black text-center" colSpan={4}>
                Komponen Biaya
              </th>
              <th className="p-1.5 border-r border-black text-right w-24" rowSpan={2}>
                Panjar
              </th>
              <th className="p-1.5 border-r border-black text-right w-24" rowSpan={2}>
                Jumlah Bayar
              </th>
              <th className="p-1.5 text-center w-24" rowSpan={2}>
                Tanda Tangan
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-black">
              <th className="p-1 border-r border-black text-right font-normal">Harga</th>
              <th className="p-1 border-r border-black text-center font-normal w-10">Unit</th>
              <th className="p-1 border-r border-black text-center font-normal w-10">Hari</th>
              <th className="p-1 border-r border-black text-right font-normal">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(rincian || []).map((penerima, idx) => {
              const rowCount = penerima.biaya.length + 1;
              let totalBiayaPegawai = 0;
              let totalPanjarPegawai = penerima.panjar;

              grandTotalPanjar += totalPanjarPegawai;
              grandTotalDibayar += penerima.total_dibayar;

              return (
                <React.Fragment key={idx}>
                  {penerima.biaya.map((item, itemIdx) => {
                    totalBiayaPegawai += item.jumlah;
                    if (itemIdx === 0) {
                      grandTotalBiaya += item.jumlah;
                    } else {
                      grandTotalBiaya += item.jumlah;
                    }
                    return (
                      <tr key={itemIdx} className="border-b border-black">
                        {itemIdx === 0 && (
                          <>
                            <td
                              className="p-1.5 border-r border-black text-center align-top"
                              rowSpan={rowCount}
                            >
                              {idx + 1}.
                            </td>
                            <td
                              className="p-1.5 border-r border-black font-semibold align-top"
                              rowSpan={rowCount}
                            >
                              {penerima.nama_lengkap}
                            </td>
                          </>
                        )}
                        <td className="p-1.5 border-r border-black">{item.uraian}</td>
                        <td className="p-1.5 border-r border-black text-right">
                          {formatCurrency(item.harga)}
                        </td>
                        <td className="p-1 border-r border-black text-center">{item.satuan}</td>
                        <td className="p-1 border-r border-black text-center">{item.hari}</td>
                        <td className="p-1.5 border-r border-black text-right">
                          {formatCurrency(item.jumlah)}
                        </td>
                        {itemIdx === 0 && (
                          <>
                            <td
                              className="p-1.5 border-r border-black text-right align-top"
                              rowSpan={rowCount}
                            >
                              {formatCurrency(totalPanjarPegawai)}
                            </td>
                            <td
                              className="p-1.5 border-r border-black text-right align-top font-bold"
                              rowSpan={rowCount}
                            >
                              {formatCurrency(penerima.total_dibayar)}
                            </td>
                            <td
                              className="p-1.5 text-center font-bold align-top"
                              rowSpan={rowCount}
                            >
                              {idx + 1}.
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="border-b border-black bg-slate-50/50 font-bold">
                    <td className="p-1 border-r border-black text-right" colSpan={4}>
                      Subtotal {penerima.nama_lengkap.split(' ')[0]}
                    </td>
                    <td className="p-1 border-r border-black text-right">
                      {formatCurrency(totalBiayaPegawai)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-slate-100 font-bold border-b border-black text-[9.5pt]">
              <td className="p-2 border-r border-black text-right" colSpan={6}>
                TOTAL KESELURUHAN
              </td>
              <td className="p-2 border-r border-black text-right">
                {formatCurrency(grandTotalBiaya)}
              </td>
              <td className="p-2 border-r border-black text-right">
                {formatCurrency(grandTotalPanjar)}
              </td>
              <td className="p-2 border-r border-black text-right font-black">
                {formatCurrency(grandTotalDibayar)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
        {/*Terbilang*/}
        <p className="text-slate-800 italic">
          Terbilang : {/** PERBAIKAN: Ganti terbilang2 menjadi terbilang */}
          {terbilang(grandTotalDibayar)
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^(.)/, (c) => c.toUpperCase())}{' '}
          Rupiah
        </p>

        {/* Tandatangan Triplet */}
        <div
          className="grid grid-cols-3 gap-4 text-xs leading-normal mt-6 text-center"
          style={{ fontFamily: 'Arial' }}
        >
          <div>
            <p className="m-0">Diketahui oleh,</p>
            <p className="font-bold m-0">Pejabat Pelaksana Teknis Kegiatan</p>
            <div className="h-14"></div>
            <p className="font-bold underline m-0">{pejabat.pptk?.nama_lengkap}</p>
            <p className="m-0 font-mono text-[9px]">NIP. {pejabat.pptk?.nip}</p>
          </div>
          <div>
            <p className="m-0">Nanga Pinoh, {formatDate(pembayaran.tanggal_bukti)}</p>
            <p className="font-bold m-0">Bendahara Pengeluaran</p>
            <div className="h-14"></div>
            <p className="font-bold underline m-0">{pejabat.bendahara?.nama_lengkap}</p>
            <p className="m-0 font-mono text-[9px]">NIP. {pejabat.bendahara?.nip}</p>
          </div>
          <div>
            <p className="m-0">Setuju dibayar,</p>
            <p className="font-bold m-0">Pengguna Anggaran</p>
            <div className="h-14"></div>
            <p className="font-bold underline m-0">{pejabat.penggunaAnggaran?.nama_lengkap}</p>
            <p className="m-0 font-mono text-[9px]">NIP. {pejabat.penggunaAnggaran?.nip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. CetakPengeluaranRiil
// ==========================================
export const CetakPengeluaranRiil = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/api/cetak/pengeluaran-riil/${id}`);
        setData(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat dokumen Daftar Pengeluaran Riil.');
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Daftar Pengeluaran Riil...
      </div>
    );

  const { items, spt, pelaksana, penggunaAnggaran, tanggal_cetak } = data;
  const totalJumlah = (items || []).reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak Pengeluaran Riil
        </button>
      </div>

      <div className="print-page border border-slate-200 shadow-lg rounded-xl">
        <KopSurat />

        <div className="text-center my-6">
          <h3 className="text-base font-bold underline tracking-wider m-0">
            DAFTAR PENGELUARAN RIIL
          </h3>
        </div>

        <div className="space-y-4 text-sm leading-normal">
          <p className="m-0">Yang bertanda tangan di bawah ini:</p>
          <div className="grid grid-cols-10 gap-x-2 pl-5 text-sm">
            <span className="col-span-2">Nama</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-bold">{pelaksana.nama_lengkap}</span>
            <span className="col-span-2">NIP</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-mono">{pelaksana.nip}</span>
            <span className="col-span-2">Jabatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{pelaksana.jabatan}</span>
            <span className="col-span-2">Instansi</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">Dinas Komunikasi dan Informatika</span>
          </div>

          <p className="text-justify leading-relaxed">
            Berdasarkan Surat Tugas (ST) Nomor {spt.nomor_surat || '......'} tanggal{' '}
            {formatDate(spt.tanggal_surat)}, dengan ini kami menyatakan dengan sesungguhnya bahwa:
          </p>

          <ol className="list-decimal pl-5 space-y-4 text-justify">
            <li>
              Biaya transpor pegawai dan/atau biaya penginapan di bawah ini yang tidak dapat
              diperoleh bukti–bukti pengeluarannya, meliputi:
              <table
                className="w-full text-xs border border-black border-collapse my-3"
                style={{ fontFamily: 'Arial' }}
              >
                <thead>
                  <tr className="bg-slate-50 border-b border-black">
                    <th className="p-2 border-r border-black w-10 text-center font-semibold">No</th>
                    <th className="p-2 border-r border-black text-left font-semibold">
                      Uraian Pengeluaran
                    </th>
                    <th className="p-2 text-right w-48 font-semibold">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {(items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-black">
                      <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-black">{item.uraian}</td>
                      <td className="p-2 text-right">{formatCurrency(item.jumlah)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                    <td className="p-2 border-r border-black text-center" colSpan={2}>
                      Jumlah Total:
                    </td>
                    <td className="p-2 text-right">{formatCurrency(totalJumlah)}</td>
                  </tr>
                </tbody>
              </table>
            </li>
            <li>
              Jumlah uang tersebut pada angka (1) di atas benar-benar dikeluarkan untuk pelaksanaan
              perjalanan dinas dimaksud dan apabila di kemudian hari terdapat kelebihan atas
              pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Pemerintah
              Daerah.
            </li>
          </ol>

          <p className="text-justify leading-relaxed">
            Demikian pernyataan ini kami buat dengan sebenarnya, untuk dipergunakan sebagaimana
            mestinya.
          </p>
        </div>

        {/* Tanda Tangan */}
        <div
          className="grid grid-cols-2 gap-8 text-xs leading-normal mt-10 text-center"
          style={{ fontFamily: 'Arial' }}
        >
          <div>
            <p className="m-0">Mengetahui / Menyetujui,</p>
            <p className="font-bold m-0">Pengguna Anggaran</p>
            <div className="h-20"></div>
            <p className="font-bold underline m-0">{penggunaAnggaran.nama_lengkap}</p>
            <p className="m-0 font-mono text-[10px]">NIP. {penggunaAnggaran.nip}</p>
          </div>
          <div>
            <p className="m-0">Nanga Pinoh, {formatDate(tanggal_cetak)}</p>
            <p className="font-bold m-0">Pelaksana Perjalanan Dinas</p>
            <div className="h-20"></div>
            <p className="font-bold underline m-0">{pelaksana.nama_lengkap}</p>
            <p className="m-0 font-mono text-[10px]">NIP. {pelaksana.nip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7. CetakPembatalan
// ==========================================
export const CetakPembatalan = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/api/cetak/pembatalan/${id}`);
        setData(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat dokumen Pembatalan Tugas.');
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Surat Pembatalan Tugas...
      </div>
    );

  const { pembatalan, spt, pejabatPemberiTugas, pelaksana, sppd, anggaran } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak Pembatalan
        </button>
      </div>

      {/* Lembar 1: Pernyataan Pembatalan */}
      <div
        className="print-page border border-slate-200 shadow-lg rounded-xl mb-10"
        style={{ pageBreakAfter: 'always' }}
      >
        <KopSurat />

        <div className="text-center my-6 leading-tight">
          <h3 className="text-base font-bold underline tracking-wider m-0">
            SURAT PERNYATAAN PEMBATALAN TUGAS PERJALANAN DINAS
          </h3>
          <p className="text-xs m-0 mt-0.5">NOMOR: 090 / {pembatalan.id || '.....'} / SETDA</p>
        </div>

        <div className="space-y-4 text-sm leading-normal">
          <p className="m-0">Yang bertanda tangan di bawah ini:</p>
          <div className="grid grid-cols-10 gap-x-2 pl-5">
            <span className="col-span-2">Nama</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-bold">{pejabatPemberiTugas.nama}</span>
            <span className="col-span-2">NIP</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-mono">{pejabatPemberiTugas.nip || '-'}</span>
            <span className="col-span-2">Jabatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{pejabatPemberiTugas.jabatan}</span>
          </div>

          <p className="text-justify leading-relaxed">
            Menyatakan dengan sesungguhnya, bahwa tugas Perjalanan Dinas dengan Surat Tugas nomor:{' '}
            {spt.nomor_surat} atas nama:
          </p>
          <div className="grid grid-cols-10 gap-x-2 pl-5">
            <span className="col-span-2">Nama</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-bold">{pelaksana.nama_lengkap}</span>
            <span className="col-span-2">NIP</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-mono">{pelaksana.nip || '-'}</span>
            <span className="col-span-2">Jabatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{pelaksana.jabatan}</span>
            <span className="col-span-2">Instansi</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">Dinas Komunikasi dan Informatika</span>
          </div>

          <p className="text-justify leading-relaxed">
            Dibatalkan atau tidak dapat dilaksanakan disebabkan adanya keperluan dinas lainnya yang
            sangat mendesak / penting dan tidak dapat ditunda yaitu{' '}
            <strong className="font-bold italic">
              "{pembatalan.alasan || 'Tidak ada alasan spesifik'}"
            </strong>
            . Sehubungan dengan pembatalan tersebut, pelaksanaan perjalanan dinas tidak dapat
            digantikan oleh pejabat / pegawai negeri lain.
          </p>

          <p className="text-justify leading-relaxed">
            Demikian surat pernyataan ini dibuat dengan sebenarnya dan apabila dikemudian hari
            ternyata surat pernyataan ini tidak benar, saya bertanggung jawab penuh dan bersedia
            diproses sesuai dengan ketentuan hukum yang berlaku.
          </p>
        </div>

        {/* Tanda Tangan */}
        <div
          className="mt-12 ml-auto w-[50%] text-sm leading-normal flex flex-col items-start pl-10"
          style={{ fontFamily: 'Arial' }}
        >
          <p className="m-0">
            {pembatalan.tempat_pembatalan}, {formatDate(pembatalan.tanggal_pembatalan)}
          </p>
          <p className="m-0">Yang Membuat Pernyataan,</p>
          <p className="font-bold uppercase mt-2 mb-16">{pejabatPemberiTugas.jabatan},</p>
          <p className="font-bold underline uppercase m-0 text-nowrap">
            {pejabatPemberiTugas.nama}
          </p>
          <p className="m-0 font-mono text-xs">
            {pejabatPemberiTugas.nip ? `NIP. ${pejabatPemberiTugas.nip}` : ''}
          </p>
        </div>
      </div>

      {/* Lembar 2: Pernyataan Pembebanan Biaya */}
      <div className="print-page border border-slate-200 shadow-lg rounded-xl">
        <KopSurat />

        <div className="text-center my-6 leading-tight">
          <h3 className="text-base font-bold underline tracking-wider m-0 uppercase">
            Surat Pernyataan Pembebanan
            <br />
            Biaya Pembatalan Perjalanan Dinas
          </h3>
          <p className="text-xs m-0 mt-0.5">NOMOR: .......................................</p>
        </div>

        <div className="space-y-4 text-sm leading-normal">
          <p className="m-0">Yang bertanda tangan di bawah ini:</p>
          <div className="grid grid-cols-10 gap-x-2 pl-5">
            <span className="col-span-2">Nama</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-bold">{pejabatPemberiTugas.nama}</span>
            <span className="col-span-2">NIP</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-mono">{pejabatPemberiTugas.nip || '-'}</span>
            <span className="col-span-2">Jabatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{pejabatPemberiTugas.jabatan}</span>
            <span className="col-span-2">Instansi</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">Pemerintah Kabupaten Melawi</span>
          </div>

          <p className="text-justify leading-relaxed">
            Menyatakan dengan sesungguhnya, bahwa perjalanan dinas berdasarkan Surat Tugas Nomor:{' '}
            {spt.nomor_surat} Tanggal {formatDate(spt.tanggal_surat)} dan SPD Nomor:{' '}
            {sppd.nomor_sppd} Tanggal {formatDate(sppd.tanggal_sppd)} atas nama:
          </p>
          <div className="grid grid-cols-10 gap-x-2 pl-5">
            <span className="col-span-2">Nama</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-bold">{pelaksana.nama_lengkap}</span>
            <span className="col-span-2">NIP</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7 font-mono">{pelaksana.nip || '-'}</span>
            <span className="col-span-2">Jabatan</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">{pelaksana.jabatan}</span>
            <span className="col-span-2">Instansi</span>
            <span className="col-span-1">:</span>
            <span className="col-span-7">Dinas Komunikasi dan Informatika</span>
          </div>

          <p className="text-justify leading-relaxed">
            Dibatalkan sesuai dengan surat Pernyataan Pembatalan Tugas Perjalanan Dinas Nomor: 090 /{' '}
            {pembatalan.id || '.....'} / SETDA Tanggal {formatDate(pembatalan.tanggal_pembatalan)}.
          </p>

          <p className="text-justify leading-relaxed">
            Berkenaan dengan pembatalan tersebut, biaya transport dan biaya penginapan berupa{' '}
            <strong className="font-bold italic">"{pembatalan.rincian_biaya || '.....'}"</strong>{' '}
            yang telah terlanjur dibayarkan atas beban DPA tidak dapat dikembalikan / refund
            (sebagian / seluruhnya) sebesar{' '}
            <strong className="font-bold">
              Rp {formatCurrency(pembatalan.nominal_biaya || 0)}
            </strong>
            , sehingga dibebankan pada DPA Nomor:{' '}
            <span className="font-mono">{anggaran.mata_anggaran_kode}</span> Tanggal ......
            Organisasi Dinas Komunikasi dan Informatika.
          </p>

          <p className="text-justify leading-relaxed">
            Demikian surat pernyataan ini dibuat dengan sebenarnya dan apabila dikemudian hari
            ternyata surat pernyataan ini tidak benar dan menimbulkan kerugian Pemerintah Daerah,
            saya bertanggung jawab penuh dan bersedia menyetorkan kerugian tersebut ke kas
            Pemerintah Daerah.
          </p>
        </div>

        {/* Tanda Tangan */}
        <div
          className="mt-12 ml-auto w-[50%] text-sm leading-normal flex flex-col items-start pl-10"
          style={{ fontFamily: 'Arial' }}
        >
          <p className="m-0">
            {pembatalan.tempat_pembatalan}, {formatDate(pembatalan.tanggal_pembatalan)}
          </p>
          <p className="m-0">Yang Membuat Pernyataan,</p>
          <p className="font-bold uppercase mt-2 mb-16">{pejabatPemberiTugas.jabatan},</p>
          <p className="font-bold underline uppercase m-0 text-nowrap">
            {pejabatPemberiTugas.nama}
          </p>
          <p className="m-0 font-mono text-xs">
            {pejabatPemberiTugas.nip ? `NIP. ${pejabatPemberiTugas.nip}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. CetakLaporan
// ==========================================
export const CetakLaporan = () => {
  const { id } = useParams();
  const [laporan, setLaporan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/api/laporan/${id}`);
        setLaporan(response.data);
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat Laporan Hasil Perjalanan Dinas.');
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!laporan)
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Memuat Laporan Perjalanan Dinas...
      </div>
    );

  const nl2br = (str) => (str || '').replace(/(\r\n|\n\r|\r|\n)/g, '<br>');

  let signerIds = [];
  try {
    if (laporan.penandatangan_ids) {
      signerIds = JSON.parse(laporan.penandatangan_ids);
    }
  } catch (e) {
    console.error('Failed to parse penandatangan_ids:', e);
  }

  const allSigners = [];
  if (laporan.pegawai) {
    signerIds.forEach((sid) => {
      const signerData = laporan.pegawai.find((p) => p.pegawai_id == sid);
      if (signerData) {
        allSigners.push({
          nama: signerData.nama_lengkap,
          nip: `NIP. ${signerData.nip}`,
        });
      }
    });
  }

  const totalTransportasi = (laporan.transportasi || []).reduce(
    (sum, item) => sum + (item.nominal || 0),
    0
  );
  const totalAkomodasi = (laporan.akomodasi || []).reduce(
    (sum, item) => sum + (item.nominal || 0),
    0
  );
  const totalKontribusi = (laporan.kontribusi || []).reduce(
    (sum, item) => sum + (item.nominal || 0),
    0
  );
  const totalLainLain = (laporan.lain_lain || []).reduce(
    (sum, item) => sum + (item.nominal || 0),
    0
  );
  const totalBiayaLaporan = totalTransportasi + totalAkomodasi + totalKontribusi + totalLainLain;

  const hasAnyExpense =
    (laporan.transportasi && laporan.transportasi.length > 0) ||
    (laporan.akomodasi && laporan.akomodasi.length > 0) ||
    (laporan.kontribusi && laporan.kontribusi.length > 0) ||
    (laporan.lain_lain && laporan.lain_lain.length > 0);

  const canceledPegawaiIdSet = new Set((laporan.pegawai_dibatalkan || []).map((p) => p.pegawai_id));
  const activePegawai = (laporan.pegawai || []).filter(
    (p) => !canceledPegawaiIdSet.has(p.pegawai_id)
  );

  const imageAttachments = (laporan.lampiran || []).filter((lamp) =>
    /\.(jpg|jpeg|png|gif)$/i.test(lamp.file_name)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 no-print-bg">
      <style>{pageStyle}</style>
      <div className="text-center mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer"
        >
          Cetak Laporan
        </button>
      </div>

      {/* Main Report Page */}
      <div className="print-page border border-slate-200 shadow-lg rounded-xl mb-10">
        <div className="text-center mt-4 mb-8">
          <h3 className="text-base font-bold underline tracking-wider m-0 uppercase">
            Laporan Hasil Perjalanan Dinas
          </h3>
        </div>

        <div className="space-y-5 text-sm leading-normal text-slate-950">
          <div>
            <h4 className="font-bold m-0 uppercase mb-2">I. PENDAHULUAN</h4>
            <div className="grid grid-cols-10 gap-x-2 pl-4 text-justify">
              <span className="col-span-2 font-medium">a. Dasar Perjalanan</span>
              <span className="col-span-1">:</span>
              <span
                className="col-span-7"
                dangerouslySetInnerHTML={{ __html: nl2br(laporan.dasar_perjalanan) }}
              />

              <span className="col-span-2 font-medium mt-1">b. Maksud & Tujuan</span>
              <span className="col-span-1 mt-1">:</span>
              <span
                className="col-span-7 mt-1"
                dangerouslySetInnerHTML={{ __html: nl2br(laporan.tujuan_perjalanan) }}
              />

              <span className="col-span-2 font-medium mt-1">c. Waktu & Tempat</span>
              <span className="col-span-1 mt-1">:</span>
              <span className="col-span-7 mt-1">
                {laporan.lama_dan_tanggal_perjalanan} di{' '}
                {laporan.tempat_dikunjungi || laporan.tujuan_perjalanan}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold m-0 uppercase mb-2">II. KEGIATAN YANG DILAKSANAKAN</h4>
            <div
              className="pl-4 text-justify leading-relaxed"
              dangerouslySetInnerHTML={{ __html: nl2br(laporan.deskripsi_kronologis) }}
            />
          </div>

          <div>
            <h4 className="font-bold m-0 uppercase mb-2">III. HASIL YANG DICAPAI</h4>
            <div
              className="pl-4 text-justify leading-relaxed"
              dangerouslySetInnerHTML={{ __html: nl2br(laporan.hasil_dicapai) }}
            />
          </div>

          <div>
            <h4 className="font-bold m-0 uppercase mb-2">IV. KESIMPULAN DAN SARAN</h4>
            <div
              className="pl-4 text-justify leading-relaxed"
              dangerouslySetInnerHTML={{ __html: nl2br(laporan.kesimpulan) }}
            />
          </div>

          {/* Rincian Pengeluaran */}
          {hasAnyExpense && (
            <div>
              <h4 className="font-bold m-0 uppercase mb-2">V. BIAYA PENGELUARAN</h4>
              <div className="pl-4">
                <table
                  className="w-full text-xs text-black border border-black border-collapse"
                  style={{ fontFamily: 'Arial' }}
                >
                  <thead>
                    <tr className="bg-slate-50 border-b border-black">
                      <th className="p-1.5 border-r border-black text-left font-bold">
                        Nama / Uraian Rincian Pengeluaran
                      </th>
                      <th className="p-1.5 border-r border-black text-right font-bold w-32">
                        Harga Satuan (Rp)
                      </th>
                      <th className="p-1.5 border-r border-black text-center font-bold w-12">
                        Vol
                      </th>
                      <th className="p-1.5 border-r border-black text-center font-bold w-14">
                        Satuan
                      </th>
                      <th className="p-1.5 text-right font-bold w-32">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePegawai.map((pegawai, pIdx) => {
                      const trItems = (laporan.transportasi || []).filter(
                        (item) => item.pegawai_id === pegawai.pegawai_id
                      );
                      const akItems = (laporan.akomodasi || []).filter(
                        (item) => item.pegawai_id === pegawai.pegawai_id
                      );
                      const kbItems = (laporan.kontribusi || []).filter(
                        (item) => item.pegawai_id === pegawai.pegawai_id
                      );
                      const lnItems = (laporan.lain_lain || []).filter(
                        (item) => item.pegawai_id === pegawai.pegawai_id
                      );

                      return (
                        <React.Fragment key={pIdx}>
                          <tr className="bg-slate-100/50 font-bold border-b border-black">
                            <td className="p-1.5 border-r border-black" colSpan={5}>
                              {pegawai.nama_lengkap}
                            </td>
                          </tr>
                          {trItems.map(
                            (item, i) =>
                              item.nominal > 0 && (
                                <tr key={'tr-' + i} className="border-b border-black">
                                  <td className="p-1.5 border-r border-black pl-4">
                                    Biaya Transportasi ({item.jenis} {item.perusahaan})
                                  </td>
                                  <td className="p-1.5 border-r border-black text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                  <td className="p-1.5 border-r border-black text-center">1</td>
                                  <td className="p-1.5 border-r border-black text-center">PP</td>
                                  <td className="p-1.5 text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                </tr>
                              )
                          )}
                          {akItems.map(
                            (item, i) =>
                              item.nominal > 0 && (
                                <tr key={'ak-' + i} className="border-b border-black">
                                  <td className="p-1.5 border-r border-black pl-4">
                                    Biaya Hotel / Akomodasi ({item.nama || item.jenis})
                                  </td>
                                  <td className="p-1.5 border-r border-black text-right">
                                    {formatCurrency(item.harga_satuan)}
                                  </td>
                                  <td className="p-1.5 border-r border-black text-center">
                                    {item.malam || 1}
                                  </td>
                                  <td className="p-1.5 border-r border-black text-center">Malam</td>
                                  <td className="p-1.5 text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                </tr>
                              )
                          )}
                          {kbItems.map(
                            (item, i) =>
                              item.nominal > 0 && (
                                <tr key={'kb-' + i} className="border-b border-black">
                                  <td className="p-1.5 border-r border-black pl-4">
                                    Biaya Kontribusi Kegiatan ({item.jenis})
                                  </td>
                                  <td className="p-1.5 border-r border-black text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                  <td className="p-1.5 border-r border-black text-center">1</td>
                                  <td className="p-1.5 border-r border-black text-center">Keg</td>
                                  <td className="p-1.5 text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                </tr>
                              )
                          )}
                          {lnItems.map(
                            (item, i) =>
                              item.nominal > 0 && (
                                <tr key={'ln-' + i} className="border-b border-black">
                                  <td className="p-1.5 border-r border-black pl-4">
                                    Biaya Pengeluaran Lain-lain ({item.uraian})
                                  </td>
                                  <td className="p-1.5 border-r border-black text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                  <td className="p-1.5 border-r border-black text-center">1</td>
                                  <td className="p-1.5 border-r border-black text-center">-</td>
                                  <td className="p-1.5 text-right">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                </tr>
                              )
                          )}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-slate-100 font-bold border-b border-black text-sm">
                      <td className="p-2 border-r border-black text-right" colSpan={4}>
                        TOTAL BIAYA SELURUHNYA:
                      </td>
                      <td className="p-2 text-right font-black text-indigo-700">
                        Rp {formatCurrency(totalBiayaLaporan)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-bold m-0 uppercase mb-2">VI. PENUTUP</h4>
            <div className="pl-4 text-justify leading-relaxed">
              Demikian laporan hasil pelaksanaan tugas perjalanan dinas ini dibuat dengan
              sesungguhnya untuk dapat dipergunakan sebagaimana mestinya, dan dapat
              dipertanggungjawabkan secara formal.
            </div>
          </div>
        </div>

        {/* Tanggal & Tanda tangan */}
        <div className="mt-10 pl-4 text-sm leading-normal">
          <p className="m-0">
            {laporan.tempat_laporan}, {formatDate(laporan.tanggal_laporan)}
          </p>
          <p className="m-0 mb-6">Yang Melaksanakan Perjalanan Dinas,</p>
          <div className="flex flex-col gap-8 items-start">
            {allSigners.map((signer, idx) => (
              <div key={idx} className="flex flex-col w-[40%]">
                <p className="font-bold underline uppercase m-0 mt-8 text-nowrap">{signer.nama}</p>
                <p className="m-0 font-mono text-xs">{signer.nip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attachment Page (Lampiran Dokumentasi) */}
      {imageAttachments.length > 0 && (
        <div className="print-page border border-slate-200 shadow-lg rounded-xl">
          <div className="text-center mt-4 mb-10">
            <h3 className="text-base font-bold underline tracking-wider m-0 uppercase">
              LAMPIRAN DOKUMENTASI LAPORAN
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-8 justify-items-center">
            {imageAttachments.map((img, idx) => (
              <div
                key={img.id || idx}
                className="border border-slate-200 p-2 bg-white shadow-md flex flex-col items-center"
              >
                <img
                  src={`/${img.file_path}`}
                  alt={img.file_name}
                  className="w-[10cm] h-[13cm] object-cover mb-2 border border-slate-100"
                />
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Dokumentasi {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 9. CetakLaporanBpk (Audit Rekapitulasi)
// ==========================================
export const CetakLaporanBpk = () => {
  const [dataList, setDataList] = useState([]);
  const [penandatangan, setPenandatangan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/cetak/laporan-bpk');
        setDataList(response.data.data || []);
        setPenandatangan(response.data.penandatangan || null);
        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat rekapitulasi audit belanja.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

  const currentYear = new Date().getFullYear();

  const formatPangkatGolongan = (item) => {
    if (item.pangkat && item.golongan) return `${item.pangkat} (${item.golongan})`;
    if (item.pangkat_golongan) return item.pangkat_golongan;
    return '';
  };

  const auditPageStyle = `
    @page {
      size: A3 landscape;
      margin: 0.8cm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 7.5pt;
      background-color: #fff;
    }
    table.audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
      color: black;
    }
    table.audit-table th, table.audit-table td {
      border: 1px solid black;
      padding: 3px 4px;
      text-align: center;
      vertical-align: middle;
      line-height: 1.2;
    }
    table.audit-table th {
      font-weight: bold;
      background-color: #f2f2f2;
    }
    .align-left {
      text-align: left !important;
    }
    .align-right {
      text-align: right !important;
    }
    .nowrap-cell {
      white-space: nowrap;
    }
    .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl, .shadow-inner {
      box-shadow: none !important;
    }
  `;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 no-print-bg">
      <style>{auditPageStyle}</style>

      <div className="text-center mb-6 no-print flex flex-col items-center gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Rekapitulasi Belanja Perjalanan Dinas (Audit BPK / APIP)
        </h2>
        <p className="text-sm text-slate-500">
          Format kertas pencetakan diatur otomatis menggunakan A3 Landscape.
        </p>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer mt-2"
        >
          Cetak Rekap Audit BPK
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 gap-3 text-slate-400 no-print">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium">Mengambil rekap belanja dari database...</span>
        </div>
      ) : (
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-md w-full overflow-x-auto">
          {/* Header Laporan */}
          <header className="mb-4 leading-normal text-slate-900">
            <h1 className="text-xs font-black tracking-wide uppercase m-0">
              Rekapitulasi Belanja Biaya Perjalanan Dinas TA {currentYear}
            </h1>
            <p className="text-xs font-bold m-0 mt-0.5">
              Nama SKPD : Dinas Komunikasi dan Informatika Kabupaten Melawi
            </p>
            <p className="text-xs font-bold m-0">
              Realisasi Belanja Perjalanan Dinas : 1 Januari sd. 31 Desember tahun {currentYear}
            </p>
          </header>

          {/* Tabel Rekap Akbar */}
          <table className="audit-table">
            <thead>
              <tr>
                <th rowSpan={2}>No</th>
                <th rowSpan={2} className="w-32">
                  Nama
                </th>
                <th rowSpan={2} className="w-24">
                  Jabatan
                </th>
                <th rowSpan={2} className="w-24">
                  Pangkat /<br />
                  Golongan
                </th>
                <th rowSpan={2} className="w-24">
                  Nomor ST
                </th>
                <th rowSpan={2} className="w-24">
                  No SPPD
                </th>
                <th rowSpan={2}>Tgl Mulai</th>
                <th rowSpan={2}>Tgl Selesai</th>
                <th rowSpan={2} className="w-36">
                  Nama Kegiatan
                </th>
                <th rowSpan={2}>Jenis Perjadin</th>
                <th colSpan={8}>Penerbangan Berangkat</th>
                <th colSpan={8}>Penerbangan Pulang</th>
                <th colSpan={7}>Penginapan (Hotel)</th>
                <th colSpan={3}>Uang Harian</th>
                <th rowSpan={2}>Representasi</th>
                <th rowSpan={2} className="w-20">
                  Sewa Mobil /<br />
                  Kendaraan
                </th>
                <th rowSpan={2} className="w-20">
                  Biaya Lain
                </th>
                <th rowSpan={2} className="w-24">
                  Keterangan Biaya Lain
                </th>
                <th rowSpan={2} className="w-24">
                  Keterangan SPT
                </th>
                <th rowSpan={2} className="w-24 font-bold">
                  Total Diterima
                </th>
              </tr>
              <tr>
                {/* Berangkat */}
                <th>Maskapai</th>
                <th>Booking</th>
                <th>Penerbangan</th>
                <th>No Tiket</th>
                <th>Dari</th>
                <th>Ke</th>
                <th>Tgl Tiket</th>
                <th>Tarif</th>
                {/* Pulang */}
                <th>Maskapai</th>
                <th>Booking</th>
                <th>Penerbangan</th>
                <th>No Tiket</th>
                <th>Dari</th>
                <th>Ke</th>
                <th>Tgl Tiket</th>
                <th>Tarif</th>
                {/* Hotel */}
                <th>Nama Hotel</th>
                <th>Kota</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Malam</th>
                <th>Tarif</th>
                <th>Total Kamar</th>
                {/* Uang Harian */}
                <th>Hari</th>
                <th>Tarif</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {dataList.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="align-left font-semibold">{item.nama_lengkap}</td>
                  <td className="align-left">{item.jabatan}</td>
                  <td className="nowrap-cell">{formatPangkatGolongan(item)}</td>
                  <td>{item.nomor_surat}</td>
                  <td>{item.nomor_sppd}</td>
                  <td className="nowrap-cell">{formatDate(item.tanggal_berangkat, '')}</td>
                  <td className="nowrap-cell">{formatDate(item.tanggal_kembali, '')}</td>
                  <td className="align-left">{item.maksud_perjalanan}</td>
                  <td>{item.jenis_perjadin || 'Dalam Daerah'}</td>

                  {/* Berangkat */}
                  <td>{item.transport_berangkat?.perusahaan || ''}</td>
                  <td>{item.transport_berangkat?.kode_boking || ''}</td>
                  <td>{item.transport_berangkat?.nomor_penerbangan || ''}</td>
                  <td>{item.transport_berangkat?.nomor_tiket || ''}</td>
                  <td>{item.transport_berangkat?.terminal_berangkat || ''}</td>
                  <td>{item.transport_berangkat?.terminal_tiba || ''}</td>
                  <td className="nowrap-cell">
                    {formatDate(item.transport_berangkat?.tanggal_tiket, '')}
                  </td>
                  <td className="align-right">
                    {item.transport_berangkat?.nominal
                      ? formatCurrency(item.transport_berangkat.nominal)
                      : ''}
                  </td>

                  {/* Pulang */}
                  <td>{item.transport_pulang?.perusahaan || ''}</td>
                  <td>{item.transport_pulang?.kode_boking || ''}</td>
                  <td>{item.transport_pulang?.nomor_penerbangan || ''}</td>
                  <td>{item.transport_pulang?.nomor_tiket || ''}</td>
                  <td>{item.transport_pulang?.terminal_berangkat || ''}</td>
                  <td>{item.transport_pulang?.terminal_tiba || ''}</td>
                  <td className="nowrap-cell">
                    {formatDate(item.transport_pulang?.tanggal_tiket, '')}
                  </td>
                  <td className="align-right">
                    {item.transport_pulang?.nominal
                      ? formatCurrency(item.transport_pulang.nominal)
                      : ''}
                  </td>

                  {/* Hotel */}
                  <td>{item.akomodasi?.nama || ''}</td>
                  <td>{item.akomodasi?.lokasi_hotel || ''}</td>
                  <td className="nowrap-cell">{formatDate(item.akomodasi?.tanggal_checkIn, '')}</td>
                  <td className="nowrap-cell">
                    {formatDate(item.akomodasi?.tanggal_checkOut, '')}
                  </td>
                  <td>{item.akomodasi?.malam || ''}</td>
                  <td className="align-right">
                    {item.akomodasi?.harga_satuan
                      ? formatCurrency(item.akomodasi.harga_satuan)
                      : ''}
                  </td>
                  <td className="align-right">
                    {item.akomodasi?.nominal ? formatCurrency(item.akomodasi.nominal) : ''}
                  </td>

                  {/* Uang Harian */}
                  <td>{item.uang_harian?.jumlah_hari || ''}</td>
                  <td className="align-right">
                    {item.uang_harian?.tarif_satuan
                      ? formatCurrency(item.uang_harian.tarif_satuan)
                      : ''}
                  </td>
                  <td className="align-right">
                    {item.uang_harian?.total ? formatCurrency(item.uang_harian.total) : ''}
                  </td>

                  {/* Representasi */}
                  <td className="align-right">
                    {item.uang_representatif ? formatCurrency(item.uang_representatif) : ''}
                  </td>

                  {/* Sewa Mobil */}
                  <td className="align-right">
                    {item.sewa_kendaraan_dalam_kota?.nominal
                      ? formatCurrency(item.sewa_kendaraan_dalam_kota.nominal)
                      : ''}
                    {(item.sewa_kendaraan_dalam_kota?.uraian ||
                      item.sewa_kendaraan_dalam_kota?.uraian_sewa) && (
                      <div className="text-[6.5pt] text-slate-500 italic mt-0.5">
                        {item.sewa_kendaraan_dalam_kota.uraian ||
                          item.sewa_kendaraan_dalam_kota.uraian_sewa}
                      </div>
                    )}
                  </td>

                  {/* Biaya Lain */}
                  <td className="align-right">
                    {item.biaya_lain_sisa?.nominal
                      ? formatCurrency(item.biaya_lain_sisa.nominal)
                      : ''}
                  </td>
                  <td className="align-left">{item.biaya_lain_sisa?.uraian || ''}</td>
                  <td className="align-left">{item.keterangan_spt || ''}</td>
                  <td className="align-right font-bold text-slate-950 bg-slate-50">
                    {formatCurrency(item.total_diterima || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Tanda Tangan */}
          <footer className="mt-8 flex justify-end text-xs leading-normal pr-12">
            <div className="w-[30%] text-center">
              <p className="m-0 mb-10">
                Nanga Pinoh,{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="m-0 leading-tight">Kepala Dinas Komunikasi dan Informatika</p>
              <p className="m-0 leading-tight">Kabupaten Melawi</p>
              <div className="h-20"></div>
              <p className="font-bold underline m-0 uppercase">
                {penandatangan?.nama_lengkap || '(Nama Kepala Dinas)'}
              </p>
              <p className="m-0 font-mono text-[10px]">
                {penandatangan?.nip ? `NIP. ${penandatangan.nip}` : '(NIP Kepala Dinas)'}
              </p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
};
