const db = require('./config/db');
(async () => {
  try {
    const rows = await db.query('SELECT * FROM laporan_lampiran');
    console.log('laporan_lampiran rows:');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
