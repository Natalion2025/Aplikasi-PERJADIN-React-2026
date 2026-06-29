import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '-';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const CetakLaporanBpk = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/cetak/laporan-bpk');
        setData(response.data);
      } catch (err) {
        console.error('Gagal mengambil data cetak laporan BPK:', err);
        setError(err.response?.data?.message || 'Gagal memuat data untuk dicetak.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && data) {
      // Beri sedikit waktu agar DOM ter-render sebelum mencetak
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm font-medium text-slate-500">Mempersiapkan data laporan BPK...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return <div className="p-8 text-center">Tidak ada data untuk ditampilkan.</div>;
  }

  const { data: results, penandatangan } = data;

  return (
    <div className="bg-white p-4 font-sans text-xs">
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0.5cm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid black;
            padding: 4px;
            vertical-align: top;
          }
          th {
            background-color: #E5E7EB;
            text-align: center;
            font-weight: bold;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        `}
      </style>

      <div className="text-center mb-4">
        <h1 className="font-bold text-sm uppercase">
          DAFTAR PERTANGGUNGJAWABAN BIAYA PERJALANAN DINAS
        </h1>
        <h2 className="font-bold text-sm uppercase">DINAS PERHUBUNGAN KABUPATEN MELAWI</h2>
        <h3 className="font-bold text-sm uppercase">TAHUN ANGGARAN 2026</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th rowSpan="2">No</th>
            <th rowSpan="2">Nama / NIP / Pangkat / Golongan</th>
            <th rowSpan="2">Jabatan</th>
            <th colSpan="3">Surat Tugas</th>
            <th colSpan="2">Surat Perjalanan Dinas</th>
            <th rowSpan="2">Jenis Perjadin</th>
            <th colSpan="8">Rincian Biaya</th>
            <th rowSpan="2">Jumlah Diterima</th>
            <th rowSpan="2">Keterangan</th>
          </tr>
          <tr>
            <th>Nomor</th>
            <th>Tanggal</th>
            <th>Maksud</th>
            <th>Nomor</th>
            <th>Tanggal</th>
            <th>Transport Berangkat</th>
            <th>Transport Pulang</th>
            <th>Akomodasi</th>
            <th>Uang Harian</th>
            <th>Uang Representatif</th>
            <th>Sewa Kendaraan Dalam Kota</th>
            <th>Biaya Lain-lain</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, index) => (
            <tr key={item.spt_id + '-' + item.pegawai_id}>
              <td className="text-center">{index + 1}</td>
              <td>
                {item.nama_lengkap}
                <br />
                {item.nip}
                <br />
                {item.pangkat_golongan}
              </td>
              <td>{item.jabatan}</td>
              <td>{item.nomor_surat}</td>
              <td className="text-center">{formatDate(item.tanggal_surat)}</td>
              <td>{item.maksud_perjalanan}</td>
              <td>{item.nomor_sppd}</td>
              <td className="text-center">{formatDate(item.tanggal_sppd)}</td>
              <td>{item.jenis_perjadin}</td>
              <td className="text-right">{formatCurrency(item.transport_berangkat?.nominal)}</td>
              <td className="text-right">{formatCurrency(item.transport_pulang?.nominal)}</td>
              <td className="text-right">{formatCurrency(item.akomodasi?.nominal)}</td>
              <td className="text-right">{formatCurrency(item.uang_harian?.total)}</td>
              <td className="text-right">{formatCurrency(item.uang_representatif)}</td>
              <td className="text-right">
                {formatCurrency(item.sewa_kendaraan_dalam_kota?.nominal)}
              </td>
              <td className="text-right">{formatCurrency(item.biaya_lain_sisa?.nominal)}</td>
              <td className="text-right font-bold">{formatCurrency(item.total_diterima)}</td>
              <td className="text-right font-bold">{formatCurrency(item.total_diterima)}</td>
              <td>{item.keterangan_spt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex justify-end">
        <div className="w-1/3 text-center">
          <p>Nanga Pinoh, {formatDate(new Date())}</p>
          <p>KEPALA DINAS PERHUBUNGAN</p>
          <p>KABUPATEN MELAWI</p>
          <br />
          <br />
          <br />
          <p className="font-bold underline">
            {penandatangan?.nama_lengkap || '(Nama Kepala Dinas)'}
          </p>
          <p>NIP. {penandatangan?.nip || '(NIP Kepala Dinas)'}</p>
        </div>
      </div>

      <div className="no-print mt-8 text-center">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700"
        >
          Cetak Ulang
        </button>
      </div>
    </div>
  );
};

export default CetakLaporanBpk;
