const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.cxipgwfqkdfwllritsbi:Ziyokor2617@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' });
async function run() {
    try {
        const res = await pool.query('SELECT id, name FROM teachers ORDER BY name ASC');
        console.log('TOTAL:', res.rowCount);
        for (const row of res.rows) {
            console.log(row.id + ' | ' + row.name);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
