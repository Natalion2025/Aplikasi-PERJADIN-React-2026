const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');
const { isApiAuthenticated } = require('../middleware/auth');

const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

router.get('/api/dashboard/stats', isApiAuthenticated, async (req, res) => {
    try {
        const sqlTotal = 'SELECT COUNT(*) as totalPerjalanan FROM sppd';
        
        // Menggunakan sintaks MySQL DATE_FORMAT dan NOW()
        const sqlBulanIni = `
            SELECT COUNT(*) as perjalananBulanIni FROM sppd 
            JOIN spt ON sppd.spt_id = spt.id 
            WHERE DATE_FORMAT(spt.tanggal_berangkat, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        `;
        
        // Menggunakan sintaks MySQL DATE_SUB dan NOW()
        const sqlPerjalananPerBulan = `
            SELECT
                DATE_FORMAT(s.tanggal_berangkat, '%Y-%m') as bulan,
                COUNT(*) as jumlah
            FROM sppd sp
            JOIN spt s ON sp.spt_id = s.id
            WHERE s.tanggal_berangkat >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY bulan
            ORDER BY bulan ASC
        `;
        
        const [totalRow, bulanIniRow, perjalananBulananData] = await Promise.all([
            dbGet(sqlTotal),
            dbGet(sqlBulanIni),
            dbAll(sqlPerjalananPerBulan)
        ]);

        const labels = [];
        const data = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthString = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
            labels.push(monthString);

            const monthData = perjalananBulananData.find(item => item.bulan === monthString);
            data.push(monthData ? monthData.jumlah : 0);
        }

        res.json({
            totalPerjalanan: totalRow.totalPerjalanan || 0,
            perjalananBulanIni: bulanIniRow.perjalananBulanIni || 0,
            grafikPerjalanan: {
                labels: labels,
                data: data
            }
        });
    } catch (err) {
        console.error('[API ERROR] Gagal mengambil statistik dashboard:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
