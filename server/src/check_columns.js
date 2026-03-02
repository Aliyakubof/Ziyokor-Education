const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.cxipgwfqkdfwllritsbi:Ziyokor2617@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' });
async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'teachers'");
        for (const row of res.rows) {
            console.log(row.column_name + ' | ' + row.data_type);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
