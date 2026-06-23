const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const { isApiAuthenticated } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

router.get('/api/search', isApiAuthenticated, async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: 'Query pencarian tidak boleh kosong.' });
    }

    const searchQuery = `%${q}%`;

    try {
        const sptSql = `
            SELECT 
                id, nomor_surat, maksud_perjalanan, tanggal_surat
            FROM spt 
            WHERE nomor_surat LIKE ? OR maksud_perjalanan LIKE ?
        `;
        const sptResults = await dbAll(sptSql, [searchQuery, searchQuery]);

        const pegawaiSql = `
            SELECT 
                id, nama_lengkap, nip, jabatan 
            FROM pegawai 
            WHERE nama_lengkap LIKE ? OR nip LIKE ? OR jabatan LIKE ?
        `;
        const pegawaiResults = await dbAll(pegawaiSql, [searchQuery, searchQuery, searchQuery]);

        const formattedResults = [
            ...sptResults.map(item => ({
                type: 'SPT',
                title: `SPT: ${item.nomor_surat}`,
                description: item.maksud_perjalanan,
                date: new Date(item.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                url: `/edit-spt/${item.id}`
            })),
            ...pegawaiResults.map(item => ({
                type: 'Pegawai',
                title: item.nama_lengkap,
                description: `NIP: ${item.nip} | Jabatan: ${item.jabatan}`,
                url: `/pegawai`
            }))
        ];

        res.json(formattedResults);
    } catch (error) {
        console.error('[API SEARCH ERROR]', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat melakukan pencarian.' });
    }
});

module.exports = router;
